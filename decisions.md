# Design & Architecture Decisions Log

This document tracks the technical decisions, architecture choices, and trade-offs wrestled with during the development of DevDoc-RAG.

## 1. Stack Selection
**Decision:** Use React (Vite) + Node.js (Express) + Supabase (PostgreSQL) + Google Gemini.
**Why:**
* **Vite/React:** Provides blazing-fast HMR and a lightweight bundle, making it trivial to deploy as a Single Page Application (SPA) on Vercel.
* **Node.js/Express:** JavaScript end-to-end simplifies development context switching. Express makes handling multipart form data (Multer for zip/file uploads) straightforward.
* **Supabase (pgvector):** Instead of using a dedicated vector database (like Pinecone or Milvus), Supabase allows us to store standard relational data (repositories) alongside high-dimensional vector embeddings (`code_chunks`) in the same database. This dramatically simplifies foreign-key relationships and querying.
* **Google Gemini:** Offers high context windows and excellent coding proficiency. We used `gemini-embedding-001` for vectorization and `gemini-3.5-flash-lite` for fast, cost-effective conversational generation.

## 2. Ingestion Pipeline: GitHub API vs. Git Clone
**Decision:** Fetch repository structures via GitHub Tree API and code via Raw CDN, rather than running `git clone`.
**Why:**
* **Storage Limitations:** PaaS platforms like Render (free tier) have ephemeral file systems and limited disk space. Cloning large repositories to disk could crash the server.
* **Security & Cleanup:** Managing local `.git` folders and cleaning up temporary cloned directories is error-prone.
* **Rate Limits:** The GitHub REST API limits unauthenticated requests to 60/hour. By only using the API for the file tree, and downloading actual file contents via the raw CDN (`raw.githubusercontent.com`), we bypass API rate limits for file content, ensuring we can ingest massive repositories without failing.

## 3. Code Chunking Strategy
**Decision:** Use LangChain's `RecursiveCharacterTextSplitter.fromLanguage` with a chunk size of 1200 and overlap of 150 (revised from initial 200 / 50).
**Trade-off & Evolution:** 
* *Initial Approach (200 / 50):* Smaller chunks were originally selected under the theory that high-granularity embeddings would target exact lines of code. In practice, 200 characters (~2–3 lines) fragmented functions and classes, destroying contextual semantics. Furthermore, it generated an explosion of chunks (thousands per project), which overwhelmed Google Gemini's 15 RPM rate limit and created thousands of sequential database round-trips that stalled uploads.
* *Revised Approach (1200 / 150):* Increasing chunk size to 1200 characters preserves complete function, class, and algorithmic structures. It simultaneously reduced total chunk volume by 6–8x, dramatically speeding up vector processing and improving LLM grounding accuracy.

## 4. Preventing `pgvector` 0-Dimension Crashes
**Decision:** Implement aggressive whitespace filtering prior to embedding generation.
**Why:** 
During testing, LangChain would occasionally yield chunks consisting entirely of whitespace or newlines. When passed to Google's embedding model, it returned an empty array `[]` rather than a 768-dimension vector. When attempting to insert `"[]"` into Supabase's `vector(768)` column, PostgreSQL fatally crashed with `vector must have at least 1 dimension`. We implemented strict `.trim().length > 0` validation and vector length guards before database insertion to ensure pipeline resilience.

## 5. Conversational Memory (History Condensation)
**Decision:** Use an LLM to rewrite follow-up questions into standalone search queries before vector embedding.
**Why:**
Standard RAG pipelines fail on follow-up questions. If a user asks "Explain the auth flow", the vector search finds auth code. If the user then asks "How can I test it?", embedding the word "it" yields useless vector results.
By passing the chat history and the follow-up question to a lightweight LLM first, we rewrite "How can I test it?" into "How to test the authentication flow". This standalone query is then embedded, ensuring accurate cosine similarity search in Supabase.

## 6. Monorepo CI/CD Deployment Architecture
**Decision:** Store the frontend in `client/` and the backend in `/`, deploying frontend to Vercel and backend to Render.
**Trade-off:**
* *Pros:* Single Git repository makes version control and project sharing easy.
* *Cons:* Cloud deployment providers can struggle with nested directories. Vercel sets `NODE_ENV=production` by default, which caused `npm install` to skip `vite` (listed in `devDependencies`), breaking the build.
* *Resolution:* Moved Vite to `dependencies` in `client/package.json` to guarantee installation. Configured the root `package.json` with `"build": "npm --prefix client install && npm --prefix client run build"`, eliminating brittle `cd` shell commands. Removed UI overrides in Vercel to rely purely on source-controlled configuration (`vercel.json`). Added `.npmrc` with `legacy-peer-deps=true` to globally bypass React 19 vs Framer Motion/Orb version conflicts.

## 7. High-Performance Ingestion: Batched Embeddings & Multi-Row SQL Inserts
**Decision:** Ingest chunks in batches of 50 using unified `ingestCodeFiles()`, combining bulk Gemini embedding requests with multi-row SQL inserts.
**Why:**
* *API Rate Limits:* Google Gemini's free tier imposes a strict 15 Requests Per Minute (RPM) quota. Calling `embedDocuments()` sequentially file-by-file exceeded 15 RPM on medium projects, triggering LangChain exponential backoff sleeps (pausing 5s, 10s, 20s) and making uploads take several minutes. Batching 50 chunks per request reduces API calls from 50+ to ~4–6 calls total.
* *Database Latency:* Sequential single-row inserts (`await pool.query(...)` in a loop) incurred 50ms network round-trip latency per chunk over remote connections to Supabase. Multi-row parameterized queries (`INSERT INTO code_chunks VALUES ($1..$7), ($8..$14)...`) reduced 2,000 queries to ~5 queries, dropping database write time from 100+ seconds to under 1 second (a 50x–100x performance leap).

## 8. GitHub API Rate Limit Mitigation & Resilient Authentication
**Decision:** Add conditional `GITHUB_TOKEN` authorization headers, parallel raw file downloading (concurrency of 10), and informative HTTP error messaging.
**Why:**
* *Shared IP Exhaustion:* When hosted on platforms like Render or Vercel, unauthenticated requests to GitHub share outbound IPs with thousands of containers, immediately hitting GitHub's 60 req/hour limit (`403 rate limit exceeded`).
* *Authorization Header Safety:* Sending `Authorization: Bearer undefined` when no token was configured caused GitHub to reject requests with `401 Bad credentials`. We implemented token trimming and presence validation (`getGithubHeaders()`), coupled with user-friendly error messages that explicitly direct developers to set their `GITHUB_TOKEN`.
* *Parallel Raw CDN Fetching:* Instead of sequentially downloading files via `raw.githubusercontent.com`, we download in parallel slices of 10 files using `Promise.all()`, reducing download time from ~30s to ~2s.

## 9. Noise, Lockfile, and Bundle Filtering (`isIgnoredPath`)
**Decision:** Systematically exclude build artifacts, dependencies, lockfiles, minified files, source maps, and files $> 150\text{ KB}$.
**Why:**
A single bundled or minified file (e.g., `dist/assets/index.js`) or lockfile (`package-lock.json`) can exceed 1 MB with tens of thousands of lines. If ingested, it creates thousands of useless vector chunks, bloats the database, degrades retrieval accuracy, and freezes the server. Implementing `isIgnoredPath()` ensures only meaningful, non-generated source code is indexed.
