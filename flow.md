# Application Flow & Architecture

This document outlines the execution flow, entry points, and API route lifecycles for the DevDoc-RAG application.

## 1. High-Level Architecture
The application follows a Client-Server architecture with a unified monorepo structure.
* **Frontend (`client/`)**: React application bundled with Vite, hosted on Vercel.
* **Backend (`server.js`)**: Node.js/Express application hosted on Render.
* **Database**: Supabase PostgreSQL (with `pgvector` extension).
* **AI Provider**: Google Generative AI (Gemini) for embeddings and LLM inference.

---

## 2. Frontend Execution Flow

### Entry Point
* `client/src/main.jsx` initializes the React DOM and wraps the application in a `StrictMode` provider.
* `client/src/App.jsx` is the core container managing global state (repositories, active chat, messages, sidebar UI).

### User Interactions
1. **Repository Selection / Sidebar Toggle**:
   * Handled by the `.left-panel` UI.
   * State variables `activeRepoId` and `repositories` dictate which context the user is querying against.
2. **Uploading Code**:
   * Users interact with the floating `+` button (`.attach-btn`).
   * **GitHub URL**: Calls `handleGithubImport()`, sending a POST request to `/api/upload/github`. Inspects response status and renders detailed bot messages for errors or success.
   * **ZIP Upload**: Calls `handleFileUpload()`, sending a POST FormData request to `/api/upload/zip`. Inspects response status, surfaces backend errors, updates repository state, and resets file input for re-uploads.
   * **File Upload**: Sends a POST FormData request to `/api/upload`.
3. **Chatting**:
   * User types a message and clicks send.
   * `handleSend()` is triggered.
   * Sends the user's question, `activeRepoId`, and previous `messages` (chat history) to `/api/query`.
   * The response is appended to the message array and visually rendered.

---

## 3. Backend API Routes & Data Flow

The backend entry point is `server.js`. It initializes Express, configures CORS, and connects to the Supabase PostgreSQL connection pool.

### A. Single File Upload (`POST /api/upload`)
1. **Multer Middleware**: Intercepts the request and buffers the uploaded file.
2. **Validation**: Checks file extension against the `EXTENSION_TO_LANGUAGE` map.
3. **Chunking**: Passes the file text to LangChain's `RecursiveCharacterTextSplitter.fromLanguage` with `chunkSize: 1200, chunkOverlap: 150`.
4. **Filtering**: Removes any chunks that contain only whitespace/newlines to prevent database errors.
5. **Embedding**: Sends valid chunks to Google `gemini-embedding-001` to generate 768-dimensional vectors.
6. **Storage**: 
   * Checks if "Test Repo" exists in the `repositories` table; inserts if not.
   * Loops through chunks and inserts `[repoId, file_path, file_extension, start_line, end_line, chunk_content, vector]` into the `code_chunks` table.

### B. ZIP File Upload (`POST /api/upload/zip`)
1. **Multer Middleware**: Buffers the uploaded ZIP archive in memory.
2. **In-Memory Extraction**: Uses `adm-zip` to extract file entries without writing to disk.
3. **Smart Path & Asset Filtering (`isIgnoredPath`)**:
   * Skips directory entries, OS metadata (`__MACOSX`, `.DS_Store`, `Thumbs.db`).
   * Skips dependency and build directories (`node_modules`, `dist`, `build`, `out`, `.next`, `.nuxt`, `coverage`, `.cache`, `.vscode`, `.idea`, `vendor`).
   * Skips lockfiles (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `composer.lock`), minified assets (`*.min.js`, `*.min.css`, `*.bundle.js`, `*.map`), and secrets (`.env`).
   * Skips files exceeding 150 KB to prevent minified bundles from freezing processing.
   * Validates code extensions against `EXTENSION_TO_LANGUAGE`.
4. **Repository Creation**: Inserts the ZIP base name into `repositories` and retrieves `repoId`.
5. **Batch Ingestion Pipeline (`ingestCodeFiles`)**:
   * **Syntax-Aware Splitting**: Chunks each file using LangChain's `RecursiveCharacterTextSplitter.fromLanguage` (`chunkSize: 1200, chunkOverlap: 150`).
   * **Whitespace Guard**: Discards blank or whitespace-only chunks to prevent 0-dimension `pgvector` crashes.
   * **Batched Embeddings**: Groups all project chunks into batches of 50. Calls Google Gemini `embedDocuments()` once per batch, staying well within Google's 15 Requests Per Minute (RPM) free-tier quota.
   * **Multi-Row SQL Bulk Insert**: Inserts each 50-chunk batch into Supabase PostgreSQL using a single multi-row parameterized `INSERT INTO code_chunks VALUES (...)` query, slashing database round-trips from thousands to ~5 and reducing write time to $<1$ second.

### C. GitHub Repository Import (`POST /api/upload/github`)
1. **URL Parsing & Sanitation**: `extractGithubAccountAndRepo()` parses standard web, SSH, and `.git` URLs to extract the account owner and project name.
2. **Authenticated Branch Fetch**:
   * Attaches sanitized `GITHUB_TOKEN` authorization header via `getGithubHeaders()`.
   * Calls GitHub API `https://api.github.com/repos/{user}/{repo}` to identify the default branch (e.g., `main`).
   * Includes graceful error detection for rate limits (403/429), bad credentials (401), and non-existent/private repos (404).
3. **Recursive Tree Fetch**: Calls GitHub Tree API `https://api.github.com/repos/{user}/{repo}/git/trees/{branch}?recursive=1` to get a flat list of every file in the repo.
4. **Path & Extension Filtering**: Filters tree entries through `isIgnoredPath()` and `typeOfFile()`.
5. **Parallel Raw Code Download**:
   * Instead of sequential downloads, fetches code concurrently in batches of 10 files using `Promise.all()` from `https://raw.githubusercontent.com/...`.
   * Filters out empty or failed files.
6. **Repository Record Setup**: Inserts `projectName` into `repositories` to obtain `repoId`.
7. **Unified Batch Ingestion**: Invokes `ingestCodeFiles()` for syntax-aware splitting, 50-chunk batched Gemini embeddings, and multi-row bulk SQL insertion into `code_chunks`.

### D. Chat Query (`POST /api/query`)
1. **Payload Extraction**: Receives `question`, `repoId`, and `history`.
2. **Query Condensation (Conversational Memory)**:
   * If `history` exists, the backend prompts Gemini (`gemini-3.5-flash-lite`) to read the history and rewrite the user's latest follow-up question into a standalone, context-rich vector search query.
3. **Query Embedding**: Passes the (condensed) search query to `gemini-embedding-001` to get a 768-dimension vector.
4. **Vector Caching**: Caches the query vector using `lru-cache` to speed up identical repeated searches.
5. **Vector Similarity Search**:
   * Executes the Supabase RPC function `match_code_chunks(query_embedding, match_threshold, match_count, repo_id)`.
   * PostgreSQL computes cosine similarity (`<=>`) and returns the top 10 most relevant code chunks.
6. **Context Assembly**: Joins the returned code chunks into a single formatted string (`contextString`).
7. **LLM Inference**: 
   * Constructs a final prompt containing the System Directives, Chat History, Code Context, and the User Question.
   * Sends the prompt to `gemini-3.5-flash-lite`.
8. **Response**: Returns the final AI-generated answer to the frontend.
