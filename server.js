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

const IGNORED_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".output",
  ".cache",
  "coverage",
  ".vscode",
  ".idea",
  "__MACOSX",
  "vendor",
  "bin",
  "obj",
  "target",
];

const IGNORED_FILES = [
  ".ds_store",
  "thumbs.db",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "composer.lock",
];

function isIgnoredPath(filePath) {
  if (!filePath) return true;
  const normalized = filePath.replace(/\\/g, "/").toLowerCase();
  const segments = normalized.split("/");
  const fileName = segments[segments.length - 1];

  if (segments.some((seg) => IGNORED_DIRS.includes(seg))) {
    return true;
  }
  if (IGNORED_FILES.includes(fileName)) {
    return true;
  }
  if (
    fileName.endsWith(".min.js") ||
    fileName.endsWith(".min.css") ||
    fileName.endsWith(".bundle.js") ||
    fileName.endsWith(".map")
  ) {
    return true;
  }
  if (fileName.startsWith(".env") || fileName.includes(".env.")) {
    return true;
  }
  return false;
}

function getGithubHeaders() {
  const headers = {
    "User-Agent": "DevDoc-RAG",
    Accept: "application/vnd.github.v3+json",
  };
  const token = process.env.GITHUB_TOKEN ? process.env.GITHUB_TOKEN.trim() : "";
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function ingestCodeFiles(repoId, filesWithContent) {
  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "gemini-embedding-001",
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const allChunks = [];
  const MAX_FILE_SIZE = 150000; // Skip files > 150KB (compiled bundles/data files)

  for (const file of filesWithContent) {
    if (!file.content || !file.content.trim()) continue;
    if (file.content.length > MAX_FILE_SIZE) {
      console.warn(`Skipping large file (${file.content.length} chars): ${file.path}`);
      continue;
    }

    try {
      const splitter = RecursiveCharacterTextSplitter.fromLanguage(file.type, {
        chunkSize: 1200,
        chunkOverlap: 150,
      });
      const rawChunks = await splitter.createDocuments([file.content]);
      const validChunks = rawChunks.filter(
        (chunk) => chunk.pageContent && chunk.pageContent.trim().length > 0,
      );

      for (const chunk of validChunks) {
        allChunks.push({
          repoId,
          filePath: file.path,
          fileType: file.type,
          startLine: chunk.metadata?.loc?.lines?.from || 1,
          endLine: chunk.metadata?.loc?.lines?.to || 1,
          content: chunk.pageContent,
        });
      }
    } catch (err) {
      console.error(`Error splitting file ${file.path}:`, err.message);
    }
  }

  if (allChunks.length === 0) {
    return 0;
  }

  console.log(`Ingesting ${allChunks.length} chunks into vector database in batches...`);

  // Batch embeddings and multi-row database inserts (50 chunks per batch)
  const BATCH_SIZE = 50;
  let totalSaved = 0;

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);
    const textBatch = batch.map((c) => c.content);

    // Single Google Gemini embedding request for the batch
    const vectors = await embeddings.embedDocuments(textBatch);

    // Multi-row INSERT into Supabase PostgreSQL
    const valueClauses = [];
    const params = [];

    batch.forEach((c, idx) => {
      const vector = vectors[idx];
      if (!vector || vector.length === 0) return;

      const pOffset = params.length;
      valueClauses.push(
        `($${pOffset + 1}, $${pOffset + 2}, $${pOffset + 3}, $${pOffset + 4}, $${pOffset + 5}, $${pOffset + 6}, $${pOffset + 7})`,
      );
      params.push(
        c.repoId,
        c.filePath,
        c.fileType,
        c.startLine,
        c.endLine,
        c.content,
        JSON.stringify(vector.slice(0, 768)),
      );
    });

    if (valueClauses.length > 0) {
      const insertQuery = `
        INSERT INTO code_chunks (repo_id, file_path, file_extension, start_line, end_line, chunk_content, embedding)
        VALUES ${valueClauses.join(", ")}
      `;
      await pool.query(insertQuery, params);
      totalSaved += valueClauses.length;
    }
  }

  return totalSaved;
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

    for (const  entry of zip.getEntries()) {
      if (entry.isDirectory) {
        continue;
      }

      const filePath = (entry.entryName || entry.name).replace(/\\/g, "/");
      if (isIgnoredPath(filePath)) {
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

    const chunkCount = await ingestCodeFiles(repoId, validFiles);

    return res
      .status(200)
      .json({ repoId, repoName, fileCount: validFiles.length, chunkCount });
  } catch (error) {
    console.error("ZIP upload error:", error);
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
      chunkSize: 1200,
      chunkOverlap: 150,
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

    const headers = getGithubHeaders();

    // 1. Fetch Repository Details to get default_branch
    const repoRes = await fetch(
      `https://api.github.com/repos/${githubAccount}/${projectName}`,
      { headers },
    );

    if (!repoRes.ok) {
      const errBody = await repoRes.json().catch(() => ({}));
      const reason = errBody.message || repoRes.statusText;
      let userFriendlyMsg = `Failed to fetch GitHub repository (${reason}).`;
      if (repoRes.status === 403 || repoRes.status === 429) {
        userFriendlyMsg = `GitHub API rate limit exceeded (${reason}). Please ensure GITHUB_TOKEN is configured in your .env or Render dashboard to enable 5,000 requests/hour.`;
      } else if (repoRes.status === 404) {
        userFriendlyMsg = `GitHub repository "${githubAccount}/${projectName}" not found. Make sure the repository is public and the URL is correct.`;
      } else if (repoRes.status === 401) {
        userFriendlyMsg = `GitHub authentication failed (${reason}). Please verify the GITHUB_TOKEN in your .env file.`;
      }
      return res.status(repoRes.status).json({ message: userFriendlyMsg });
    }

    const repoData = await repoRes.json();
    const default_branch = repoData.default_branch || "main";

    // 2. Fetch the Full Recursive File Tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${githubAccount}/${projectName}/git/trees/${default_branch}?recursive=1`,
      { headers },
    );

    if (!treeRes.ok) {
      const errBody = await treeRes.json().catch(() => ({}));
      const reason = errBody.message || treeRes.statusText;
      return res.status(treeRes.status).json({
        message: `Failed to fetch repository file tree: ${reason}`,
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
      if (isIgnoredPath(filePath)) {
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

    // 4. Download Raw Code in parallel batches (10 files concurrently)
    const filesWithContent = [];
    const CONCURRENCY = 10;
    for (let i = 0; i < validFiles.length; i += CONCURRENCY) {
      const batch = validFiles.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (file) => {
          try {
            const rawUrl = `https://raw.githubusercontent.com/${githubAccount}/${projectName}/${default_branch}/${file.path}`;
            const rawRes = await fetch(rawUrl);
            if (!rawRes.ok) return null;

            const fileContent = await rawRes.text();
            if (!fileContent || !fileContent.trim()) return null;
            return { path: file.path, type: file.type, content: fileContent };
          } catch (err) {
            console.error(`Failed to fetch file ${file.path}:`, err.message);
            return null;
          }
        }),
      );

      for (const item of batchResults) {
        if (item) {
          filesWithContent.push(item);
        }
      }
    }

    if (filesWithContent.length === 0) {
      return res.status(400).json({
        message: "Could not download any non-empty code files from the repository.",
      });
    }

    // 5. Insert Repository Record into Supabase
    const repositoryResult = await pool.query(
      "INSERT INTO repositories (repo_name) VALUES ($1) RETURNING id",
      [projectName],
    );
    const repoId = repositoryResult.rows[0].id;

    // 6. Ingest & Embed Chunks
    const chunkCount = await ingestCodeFiles(repoId, filesWithContent);

    // 7. Return Success Response
    return res.status(200).json({
      repoId,
      repoName: projectName,
      fileCount: filesWithContent.length,
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
