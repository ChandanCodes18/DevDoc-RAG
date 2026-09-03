import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import "dotenv/config";
import express from "express";
import cors from "cors";
import { Pool } from "pg";
import multer from "multer";
import path from "path";
import { LRUCache } from "lru-cache";
import AdmZip from "adm-zip";

import {
  GoogleGenerativeAIEmbeddings,
  ChatGoogleGenerativeAI,
} from "@langchain/google-genai";

const app = express();
app.use(cors());
app.use(express.json());

const options = {
  max: 500,
  ttl: 1000 * 60 * 60,
};

const embeddingCache = new LRUCache(options);

const EXTENSION_TO_LANGUAGE = {
  js: "js",
  jsx: "js",
  ts: "js",
  tsx: "js",
  mjs: "js",
  cjs: "js",

  java: "java",

  cpp: "cpp",
  hpp: "cpp",
  h: "cpp",
  cc: "cpp",
  cxx: "cpp",
  c: "cpp",

  py: "python",
  pyw: "python",

  go: "go",

  php: "php",

  proto: "proto",

  rst: "rst",

  rb: "ruby",

  rs: "rust",

  scala: "scala",

  swift: "swift",

  md: "markdown",
  markdown: "markdown",

  tex: "latex",
  latex: "latex",

  html: "html",
  htm: "html",

  sol: "sol",
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool
  .connect()
  .then(() => console.log("✅ Successfully connected to Supabase PostgreSQL!"))
  .catch((err) => console.error("❌ Database connection error:", err.stack));

function typeOfFile(fileName) {
  var type = path.extname(fileName).toLowerCase().replace(".", "");
  const resolved = EXTENSION_TO_LANGUAGE[type];

  return resolved !== undefined ? resolved : "Unsupported";
}

const upload = multer({ storage: multer.memoryStorage() });

app.post("/api/upload/zip", upload.single("codeFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a file" });
    }

    const repoName = req.file.originalname.replace(/\.zip$/i, "");
    const zip = new AdmZip(req.file.buffer);
    const validFiles = [];

    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) {
        continue;
      }

      const filePath = (entry.entryName || entry.name).replace(/\\/g, "/");
      if (
        filePath.includes("node_modules/") ||
        filePath.includes(".git/") ||
        filePath.includes("dist/") ||
        filePath.includes("__MACOSX") ||
        filePath.endsWith("/.DS_Store") ||
        filePath === ".DS_Store"
      ) {
        continue;
      }

      const fileType = typeOfFile(filePath);
      if (fileType === "Unsupported") {
        continue;
      }

      const fileContent = entry.getData().toString("utf8");
      if (!fileContent || !fileContent.trim()) {
        continue;
      }

      validFiles.push({ path: filePath, type: fileType, content: fileContent });
    }

    console.log(`Successfully extracted ${validFiles.length} files.`);

    if (validFiles.length === 0) {
      return res.status(400).json({
        error: "The ZIP contains no supported, non-empty code files.",
      });
    }

    const repositoryResult = await pool.query(
      "INSERT INTO repositories (repo_name) VALUES ($1) RETURNING id",
      [repoName],
    );
    const repoId = repositoryResult.rows[0].id;
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "gemini-embedding-001",
      apiKey: process.env.GOOGLE_API_KEY,
    });
    let chunkCount = 0;

    for (const file of validFiles) {
      const splitter = RecursiveCharacterTextSplitter.fromLanguage(file.type, {
        chunkSize: 200,
        chunkOverlap: 50,
      });
      const rawChunks = await splitter.createDocuments([file.content]);
      const chunks = rawChunks.filter(
        (chunk) => chunk.pageContent && chunk.pageContent.trim().length > 0,
      );
      if (chunks.length === 0) continue;

      const vectors = await embeddings.embedDocuments(
        chunks.map((chunk) => chunk.pageContent),
      );

      for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index];
        const vector = vectors[index];
        if (!vector || vector.length === 0) continue;

        await pool.query(
          "INSERT INTO code_chunks (repo_id, file_path, file_extension, start_line, end_line, chunk_content, embedding) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [
            repoId,
            file.path,
            file.type,
            chunk.metadata?.loc?.lines?.from || 1,
            chunk.metadata?.loc?.lines?.to || 1,
            chunk.pageContent,
            JSON.stringify(vector.slice(0, 768)),
          ],
        );
        chunkCount++;
      }
    }

    return res
      .status(200)
      .json({ repoId, repoName, fileCount: validFiles.length, chunkCount });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/upload", upload.single("codeFile"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Please upload a file" });
    }

    const fileContent = req.file.buffer.toString("utf-8");
    const fileName = req.file.originalname;

    console.log(`Content length : ${fileContent.length} characters`);
    console.log(`Received file : ${fileName}`);

    const language = typeOfFile(fileName);

    if (language === "Unsupported") {
      return res.status(400).json({
        error: `The file format for "${fileName}" is not supported for code analysis.`,
      });
    }

    const splitter = RecursiveCharacterTextSplitter.fromLanguage(language, {
      chunkSize: 200,
      chunkOverlap: 50,
    });
    const rawChunks = await splitter.createDocuments([fileContent]);
    const chunks = rawChunks.filter(
      (chunk) => chunk.pageContent && chunk.pageContent.trim().length > 0,
    );

    if (chunks.length === 0) {
      return res.status(400).json({
        error: "File contains no parsable text chunks.",
      });
    }

    // Making Embeddings
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "gemini-embedding-001",
      apiKey: process.env.GOOGLE_API_KEY,
    });

    // Extract only the strings and make an array of strings
    var stringArr = chunks.map((doc) => doc.pageContent); // This is the extracted chunks

    // Convert that array of strings into vectors using google api for embeddings
    const vectors = await embeddings.embedDocuments(stringArr); // This has the vector embedding of chunks

    const repoName = "Test Repo"; // This is hard coded
    const query = "SELECT id FROM repositories WHERE repo_name = $1";

    let selectRes = await pool.query(query, [repoName]);
    let repoId;

    if (selectRes.rows.length > 0) {
      repoId = selectRes.rows[0].id;
    } else {
      const insert =
        "INSERT INTO repositories (repo_name) VALUES ($1) RETURNING id";
      let insertRes = await pool.query(insert, [repoName]);
      repoId = insertRes.rows[0].id;
    }

    // Write each chunk and its resp. vector embedding into code_chunks Table

    for (let i = 0; i < chunks.length; i++) {
      const vector = vectors[i];
      if (!vector || vector.length === 0) continue;

      let startLine = chunks[i].metadata?.loc?.lines?.from || 1;
      let endLine = chunks[i].metadata?.loc?.lines?.to || 1;
      let chunkContent = chunks[i].pageContent;
      let embeddingString = JSON.stringify(vector.slice(0, 768));

      // let parameters = [repoId, fileName, language, startLine, endLine, chunkContent, embeddingString];
      let insertQuery =
        "INSERT INTO code_chunks (repo_id, file_path, file_extension, start_line, end_line, chunk_content, embedding) VALUES ($1, $2, $3, $4, $5, $6, $7)";

      await pool.query(insertQuery, [
        repoId,
        fileName,
        language,
        startLine,
        endLine,
        chunkContent,
        embeddingString,
      ]);
    }

    return res.status(200).json({
      fileName: fileName,
      language,
      chunkCount: chunks.length,
      chunks,
    });
  } catch (error) {
    return res.status(500).json({
      error,
    });
  }
});

const extractGithubAccountAndRepo = (gitUrl) => {
  if (!gitUrl || typeof gitUrl !== "string") {
    return { githubAccount: null, projectName: null };
  }

  const trimmedUrl = gitUrl
    .trim()
    .replace(/\/$/, "")
    .replace(/\.git$/i, "");

  try {
    const parsedUrl = new URL(trimmedUrl);
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

    if (
      pathParts.length >= 2 &&
      parsedUrl.hostname.toLowerCase().includes("github")
    ) {
      return {
        githubAccount: pathParts[0],
        projectName: pathParts[1],
      };
    }
  } catch (error) {
    // Ignore URL parsing errors and fall through to SSH / shorthand patterns below
  }

  const sshMatch = trimmedUrl.match(/^git@github\.com:([^/]+)\/([^/]+)$/i);
  if (sshMatch) {
    return {
      githubAccount: sshMatch[1],
      projectName: sshMatch[2],
    };
  }

  const webMatch = trimmedUrl.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/i,
  );
  if (webMatch) {
    return {
      githubAccount: webMatch[1],
      projectName: webMatch[2],
    };
  }

  return { githubAccount: null, projectName: null };
};

app.post("/api/upload/github", async (req, res) => {
  try {
    const gitUrl = req.body?.githubUrl;
    const { githubAccount, projectName } = extractGithubAccountAndRepo(gitUrl);

    if (!githubAccount || !projectName) {
      return res.status(400).json({
        message:
          "Invalid GitHub URL. Use format: https://github.com/username/repository",
      });
    }

    // 1. Fetch Repository Details to get default_branch
    const repoRes = await fetch(
      `https://api.github.com/repos/${githubAccount}/${projectName}`,
      {
        headers: {
          "User-Agent": "DevDoc-RAG",
          "Authorization" : `Bearer ${process.env.GITHUB_TOKEN}`
        },
      },
    );

    if (!repoRes.ok) {
      return res.status(repoRes.status).json({
        message: `Failed to fetch GitHub repository (${repoRes.statusText}). Make sure the repository is public.`,
      });
    }

    const repoData = await repoRes.json();
    const default_branch = repoData.default_branch || "main";

    // 2. Fetch the Full Recursive File Tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${githubAccount}/${projectName}/git/trees/${default_branch}?recursive=1`,
      {
        headers: {
          "User-Agent": "DevDoc-RAG",
          "Authorization" : `Bearer ${process.env.GITHUB_TOKEN}`
        },
      },
    );

    if (!treeRes.ok) {
      return res.status(treeRes.status).json({
        message: `Failed to fetch repository file tree: ${treeRes.statusText}`,
      });
    }

    const treeData = await treeRes.json();
    const tree = treeData.tree || [];

    // 3. Filter Valid Code Files
    const validFiles = [];
    for (const item of tree) {
      if (item.type === "tree") {
        continue;
      }

      const filePath = item.path;
      if (
        filePath.includes("node_modules/") ||
        filePath.includes(".git/") ||
        filePath.includes("dist/") ||
        filePath.includes("__MACOSX") ||
        filePath.endsWith("/.DS_Store") ||
        filePath.includes(".env") ||
        filePath === ".DS_Store"
      ) {
        continue;
      }

      const fileType = typeOfFile(filePath);
      if (fileType === "Unsupported") {
        continue;
      }

      validFiles.push({ path: filePath, type: fileType });
    }

    if (validFiles.length === 0) {
      return res.status(400).json({
        message: "No supported code files found in the repository.",
      });
    }

    // 4. Insert Repository Record into Supabase
    const repositoryResult = await pool.query(
      "INSERT INTO repositories (repo_name) VALUES ($1) RETURNING id",
      [projectName],
    );
    const repoId = repositoryResult.rows[0].id;

    // 5. Download Raw Code & Ingest into code_chunks
    const embeddings = new GoogleGenerativeAIEmbeddings({
      model: "gemini-embedding-001",
      apiKey: process.env.GOOGLE_API_KEY,
    });

    let chunkCount = 0;

    for (const file of validFiles) {
      const rawUrl = `https://raw.githubusercontent.com/${githubAccount}/${projectName}/${default_branch}/${file.path}`;
      const rawRes = await fetch(rawUrl);
      if (!rawRes.ok) continue;

      const fileContent = await rawRes.text();
      if (!fileContent || !fileContent.trim()) {
        continue;
      }

      const splitter = RecursiveCharacterTextSplitter.fromLanguage(file.type, {
        chunkSize: 200,
        chunkOverlap: 50,
      });

      const rawChunks = await splitter.createDocuments([fileContent]);
      const chunks = rawChunks.filter(
        (chunk) => chunk.pageContent && chunk.pageContent.trim().length > 0,
      );
      if (chunks.length === 0) continue;

      const vectors = await embeddings.embedDocuments(
        chunks.map((chunk) => chunk.pageContent),
      );

      for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index];
        const vector = vectors[index];
        if (!vector || vector.length === 0) continue;

        const startLine = chunk.metadata?.loc?.lines?.from || 1;
        const endLine = chunk.metadata?.loc?.lines?.to || 1;
        const chunkContent = chunk.pageContent;
        const embeddingString = JSON.stringify(vector.slice(0, 768));

        await pool.query(
          "INSERT INTO code_chunks (repo_id, file_path, file_extension, start_line, end_line, chunk_content, embedding) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [
            repoId,
            file.path,
            file.type,
            startLine,
            endLine,
            chunkContent,
            embeddingString,
          ],
        );
        chunkCount++;
      }
    }

    // 6. Return Success Response
    return res.status(200).json({
      repoId,
      repoName: projectName,
      fileCount: validFiles.length,
      chunkCount,
      message: `Successfully imported and embedded ${projectName}!`,
    });
  } catch (error) {
    console.error("GitHub import error:", error);
    return res.status(500).json({
      message: error.message || "Failed to import GitHub repository",
    });
  }
});

app.get("/", (req, res) => {
  res.send("DevDoc RAG API is running!");
});

app.post("/api/query", async (req, res) => {
  try {
    const ques = req.body.question;
    const repoId = req.body.repoId;
    const history = req.body.history || [];

    let searchQuery = ques;

    if (history.length > 0) {
      const gemini = new ChatGoogleGenerativeAI({
        model: "gemini-3.5-flash-lite",
        apiKey: process.env.GOOGLE_API_KEY,
        temperature: 0,
      });

      const prompt = `Given the following chat history and a follow-up question, rephrase the follow-up question into a standalone, self-contained search query for a vector database. Do NOT answer the question, only output the rewritten search query.\n\nChat History:\n${history.map((m) => m.sender + ": " + m.text).join("\n")}\n\nFollow-up Question: ${ques}`;

      const condensationResult = await gemini.invoke(prompt);
      searchQuery = condensationResult.content.trim();
    }

    const queryEmbeddings = new GoogleGenerativeAIEmbeddings({
      model: "gemini-embedding-001",
      apiKey: process.env.GOOGLE_API_KEY,
    });

    let slicedVectors;

    const cacheKey = searchQuery.trim().toLowerCase();

    if (embeddingCache.has(cacheKey)) {
      slicedVectors = embeddingCache.get(cacheKey);
    } else {
      const queryVectors = await queryEmbeddings.embedQuery(searchQuery);
      slicedVectors = queryVectors.slice(0, 768);

      embeddingCache.set(cacheKey, slicedVectors);
    }

    const sqlQuery =
      "SELECT chunk_content, file_path, start_line, end_line, (embedding <=> $1) as distance FROM code_chunks WHERE repo_id = $2 ORDER BY distance ASC LIMIT 8;";

    const searchResult = await pool.query(sqlQuery, [
      JSON.stringify(slicedVectors),
      repoId,
    ]);
    const rows = searchResult.rows;

    let contextString = "";

    for (let i = 0; i < rows.length; i++) {
      let snippetText = `File : ${rows[i].file_path} \nLines : ${rows[i].start_line} - ${rows[i].end_line} \nCode : ${rows[i].chunk_content} \n `;
      contextString += snippetText;
    }

        // Fetch distinct file tree for the repository
    const fileListQuery = "SELECT DISTINCT file_path FROM code_chunks WHERE repo_id = $1 ORDER BY file_path ASC;";
    const fileListResult = await pool.query(fileListQuery, [repoId]);
    const projectFiles = fileListResult.rows.map(r => r.file_path);
    const projectFilesString = projectFiles.length > 0 ? projectFiles.join("\n") : "No files found.";

    const gemini = new ChatGoogleGenerativeAI({
      model: "gemini-3.5-flash-lite",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0,
    });

    const prompt = `You are DevDocs AI, an expert Senior Software Engineer and Codebase Intelligence Assistant. Your objective is to deliver deep, accurate, educational, and actionable assistance over the provided codebase.

                  --- CORE DIRECTIVES & GUIDELINES ---

Grounding & Codebase Awareness:
Ground all factual statements about the existing codebase in the provided Code Context and ongoing Chat History.
When explaining how existing functions, classes, or modules work, strictly reference the provided code snippets.

Code Modifications & Logic Variations:
If the user asks to modify logic (e.g. changing left-shift to right-shift, adding features, refactoring, or optimizing loops), provide complete, production-ready, and syntactically correct code blocks with markdown syntax highlighting.
Accompany code changes with a clear explanation of how the new algorithm operates.

Computer Science Fundamentals & Algorithms:
When asked about underlying CS fundamentals, algorithms, data structures, or time/space complexities (Big-O) relevant to the code, provide intuitive, step-by-step educational explanations tailored to the user's project.

Simplification & Educational Walkthroughs:
When the user asks to explain code in simple terms, break down the logic using intuitive analogies, structured bullet points, and beginner-friendly language without unnecessary jargon.

Code Reviews & Constructive Critique:
When asked for a code review or suggestions, evaluate edge cases, potential runtime bugs, off-by-one errors, performance bottlenecks, and code readability, offering clear, actionable recommendations.

Strict Citations:
Whenever referencing existing code from the codebase, explicitly cite the corresponding file path and line numbers using the format: [filepath Lines X-Y] (for example: "[largeelement.java Lines 3-12]").

Conversational Memory & Politeness:
Use the Chat History to maintain context for multi-turn conversations and follow-up questions (e.g., "give me the code", "explain the 2nd point", "how do I run it?").
Respond warmly and professionally to pleasantries, compliments, or feedback (e.g., "thanks", "good job").
  
Graceful Fallback:
Only state "I cannot find the relevant code in the provided codebase." if the user asks about an explicit file, endpoint, or feature that does not exist in the context and cannot be deduced conversationally.

Project File Structure Context:
When asked to list files, describe the project structure, or find specific files, refer directly to the Project File Structure list provided below. This list represents the absolute source of truth for all files within the repository.
Code Context: ${contextString}
Project File Structure: ${projectFilesString}
Chat History:${history.map((m) => m.sender + ": " + m.text).join("\n")}
User Question: ${ques} `;

    const response = await gemini.invoke(prompt);

    return res.status(200).json({
      answer: response.content,
    });
  } catch (error) {
    return res.status(500).json({
      error,
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server is running on http://localhost:${PORT}`);
});
