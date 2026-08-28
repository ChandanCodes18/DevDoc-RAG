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
  ttl: 1000*60*60
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
      const splitter = RecursiveCharacterTextSplitter.fromLanguage(
        file.type,
        { chunkSize: 200, chunkOverlap: 50 },
      );
      const chunks = await splitter.createDocuments([file.content]);
      if (chunks.length === 0) continue;

      const vectors = await embeddings.embedDocuments(
        chunks.map((chunk) => chunk.pageContent),
      );

      for (let index = 0; index < chunks.length; index++) {
        const chunk = chunks[index];
        await pool.query(
          "INSERT INTO code_chunks (repo_id, file_path, file_extension, start_line, end_line, chunk_content, embedding) VALUES ($1, $2, $3, $4, $5, $6, $7)",
          [
            repoId,
            file.path,
            file.type,
            chunk.metadata.loc.lines.from,
            chunk.metadata.loc.lines.to,
            chunk.pageContent,
            JSON.stringify(vectors[index].slice(0, 768)),
          ],
        );
        chunkCount++;
      }
    }

    return res.status(200).json({ repoId, repoName, fileCount: validFiles.length, chunkCount });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

})

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
    const chunks = await splitter.createDocuments([fileContent]);

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
      let startLine = chunks[i].metadata.loc.lines.from;
      let endLine = chunks[i].metadata.loc.lines.to;
      let chunkContent = chunks[i].pageContent;
      let embeddingString = JSON.stringify(vectors[i].slice(0, 768));

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

app.get("/", (req, res) => {
  res.send("DevDoc RAG API is running!");
});

app.post("/api/query", async (req, res) => {
  try {
    const ques = req.body.question;
    const repoId = req.body.repoId;

    const queryEmbeddings = new GoogleGenerativeAIEmbeddings({
      model: "gemini-embedding-001",
      apiKey: process.env.GOOGLE_API_KEY,
    });

    let slicedVectors ;
    
    const cacheKey = ques.trim().toLowerCase();
    
    if (embeddingCache.has(cacheKey)) {
      slicedVectors = embeddingCache.get(cacheKey);
    }
    else{
      const queryVectors = await queryEmbeddings.embedQuery(ques);
      slicedVectors = queryVectors.slice(0,768); 

      embeddingCache.set(cacheKey,slicedVectors);
    }

    const sqlQuery =
      "SELECT chunk_content, file_path, start_line, end_line, (embedding <=> $1) as distance FROM code_chunks WHERE repo_id = $2 ORDER BY distance ASC LIMIT 5;";

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

    const gemini = new ChatGoogleGenerativeAI({
      model: "gemini-3.5-flash-lite",
      apiKey: process.env.GOOGLE_API_KEY,
      temperature: 0,
    });

    const prompt = `You are a professional software engineering assistant designed to perform Q&A over codebases. Analyze the provided code snippets below and answer the user's question.
Guidelines:
Grounding: Rely ONLY on the provided code snippets. Do not make assumptions or use external knowledge.
Citations: Every time you explain a function, class, variable, or logic block, cite the corresponding file path and line numbers (for example: "[server.js Lines 10-25]").
Fallback: If the answer cannot be derived from the provided snippets, state "I cannot find the answer in the provided codebase."
Code Context: ${contextString}
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
