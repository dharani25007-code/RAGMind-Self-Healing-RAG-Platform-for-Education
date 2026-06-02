# StudyAI

Self-Healing RAG Knowledge Hub — powered by Groq LLaMA

StudyAI lets you upload study materials (PDF, DOCX, TXT, code, images and more), index them into chunks, and chat with an AI that uses a retrieval-augmented generation (RAG) pipeline. The service critiques its own answers and retries with reformulated queries until it converges or falls back gracefully.

Key features

- Session-based chat UI with per-session history
- Universal file support: PDF, DOCX, TXT, CSV, XLSX, code, images (many formats)
- Chunked indexing with overlap for robust retrieval
- Self-healing RAG loop: generate → critique → reformulate → retry
- Graceful fallbacks and structured error responses on external API failures

Prerequisites

- Python 3.11+
- Node.js 16+ (recommended 18+)

Quickstart (Windows)

1. Create and activate the backend virtual environment (PowerShell):

```powershell
python -m venv .\backend\.venv
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& .\backend\.venv\Scripts\Activate.ps1)
```

2. Install backend dependencies:

```powershell
python -m pip install --upgrade pip
python -m pip install -r backend/requirements.txt
```

3. Create a `backend/.env` file (example):

```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
DATABASE_URL=sqlite:///./studyai.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
CORS_ORIGINS=http://localhost:3000
MAX_RAG_RETRIES=2
CHUNK_SIZE=1000
CHUNK_OVERLAP=150
TOP_K_CHUNKS=5
```

4. Start the backend (run from the repo root):

```powershell
.\backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

5. Frontend (from the `frontend` folder):

```bash
cd frontend
npm install
npm run dev
# Vite will show the local URL (e.g. http://localhost:3000 or :3001)
```

API & docs

- OpenAPI/Swagger UI is available when the backend is running at: `http://localhost:8000/docs`
- Useful endpoints:
     - `POST /api/files/upload` — upload files
     - `GET /api/files/` — list indexed files
     - `DELETE /api/files/{id}` — delete a file + its chunks
     - `POST /api/sessions/` — create a chat session
     - `GET /api/sessions/` — list sessions
     - `PUT /api/sessions/{id}` — rename session
     - `DELETE /api/sessions/{id}` — delete session
     - `POST /api/chat/ask` — ask a question (RAG)
     - `GET /api/chat/history/{id}` — session messages

Troubleshooting

- 413 / Request too large from Groq: indicates the combined prompt/context exceeded the model token limit. Remedies:
     - Reduce `TOP_K_CHUNKS` in `backend/.env`.
     - Reduce `CHUNK_SIZE` or adjust chunking strategy to create smaller contexts.
     - Implement token budgeting or switch to a model/tier with larger token limits.
- `ModuleNotFoundError: No module named 'backend'` when running Uvicorn: start Uvicorn from the repository root so `backend` is importable (see step 4).
- Groq / httpx compatibility: this repo pins `httpx==0.27.2` to maintain compatibility with the `groq` client.

Development notes

- Database: SQLite (default). Models are in `backend/database/db.py`.
- Uploads: stored under `UPLOAD_DIR` (default `./uploads`) and processed by `backend/services/parser.py`.
- The RAG engine is implemented in `backend/services/rag.py` and includes self-healing retries and context trimming.

Adding a new Groq model

Change `GROQ_MODEL` in `backend/.env` and restart the backend. Be mindful of token limits per model.

Production

- Build the frontend and serve the static `dist` directory from the backend (or any static host). Example (quick):

```bash
cd frontend && npm run build
# then serve the built files or mount them with FastAPI's StaticFiles
```

Contributing

- Fork, create a branch, and open a PR. Keep changes focused and add tests where appropriate.

License

- MIT

If you want, I can also:

- Add a `backend/.env.example` with sane defaults,
- Add a small `scripts/bootstrap.ps1` to create and activate the venv and create `.env` from the example,
- Or add a `/health` endpoint that reports Groq connectivity and the selected model's token limit.
<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=14b8a6&height=200&section=header&text=StudyAI&fontSize=80&fontColor=ffffff&animation=fadeIn&fontAlignY=38&desc=Self-Healing%20RAG%20Knowledge%20Hub%20%7C%20Powered%20by%20Groq%20LLaMA3.3&descAlignY=60&descAlign=50" width="100%"/>

<br/>

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-LLaMA3.3--70B-FF6B35?style=for-the-badge&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-22c55e?style=for-the-badge)

<br/>

> **StudyAI** is a Self-Healing RAG Knowledge Hub — upload your study files and ask anything. The AI critiques its own answers, detects hallucinations, and retries with reformulated queries until it gets it right. Powered by **Groq LLaMA3.3-70B**, completely free.

<br/>

[✨ Features](#-features) · [🧠 Self-Healing RAG](#-how-self-healing-rag-works) · [🏗️ Architecture](#%EF%B8%8F-architecture) · [🔌 API](#-api-endpoints) · [🚀 Setup](#-getting-started) · [⚙️ Config](#-environment-variables)

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🧠 Self-Healing RAG Engine
- AI critiques its own generated answers
- Detects hallucinations automatically
- Retries with reformulated queries on failure
- Graceful fallback when context is insufficient
- Up to `MAX_RAG_RETRIES` self-correction attempts

</td>
<td width="50%">

### 📁 Universal File Support
- PDF, DOCX, TXT, CSV, XLSX, MD
- Code files + images (60+ formats)
- Drag-and-drop upload UI
- Chunked indexing with overlap
- Delete files + clean up chunks

</td>
</tr>
<tr>
<td width="50%">

### 💬 Smart Chat Interface
- Session-based conversation history
- Context-grounded answers only
- RAG sources shown per answer
- Multiple sessions support
- Full message history per session

</td>
<td width="50%">

### ⚡ Tech Highlights
- **FastAPI** backend — async, OpenAPI docs at `/docs`
- **SQLite** — zero-config, no setup needed
- **Groq free tier** — 6000 req/min, no credit card
- **React + Vite + Tailwind** — fast modern UI
- **SQLAlchemy** ORM for database management

</td>
</tr>
</table>

---

## 🧠 How Self-Healing RAG Works

```
User Question
      │
      ▼
  ┌─────────┐
  │ RETRIEVE │  ◄─────────────────────────────┐
  │ Top-K    │                                 │
  │ Chunks   │                                 │
  └────┬─────┘                        ┌────────────────┐
       │                              │  REFORMULATE   │
       ▼                              │  QUERY using   │
  ┌─────────┐                        │  critic feedback│
  │ GENERATE │                        └────────┬───────┘
  │ Answer   │                                 │
  │ (Groq)   │                                 │
  └────┬─────┘                                 │
       │                                       │
       ▼                                       │
  ┌─────────┐   FAIL + retries left ───────────┘
  │ CRITIQUE │
  │ (Groq)   │
  └────┬─────┘
       │
       ├── PASS ──────► ✅ Return grounded answer
       │
       └── FAIL (max retries) ──► ⚠️ Graceful fallback
```

**Step by step:**
1. **Retrieve** — keyword-scores all chunks, returns top-K most relevant
2. **Generate** — Groq LLaMA builds answer from retrieved context only
3. **Critique** — second Groq call checks if answer is grounded (PASS/FAIL)
4. **Reformulate** — if FAIL, rewrites query using critic feedback
5. **Retry** — up to `MAX_RAG_RETRIES` self-correction attempts
6. **Fallback** — returns "I don't have enough information" if still failing

---

## 🏗️ Architecture

```
studyai/
│
├── ⚛️  frontend/                    React + Vite + Tailwind
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js            Axios API calls
│   │   ├── components/
│   │   │   └── Layout.jsx           Sidebar + routing
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx        Stats + quick actions
│   │   │   ├── Upload.jsx           Drag-and-drop file upload
│   │   │   ├── Chat.jsx             AI chat interface
│   │   │   └── Sessions.jsx         Session history
│   │   └── index.css                Tailwind + custom styles
│   ├── .env                         VITE_API_URL
│   └── package.json
│
├── 🐍 backend/                      Python FastAPI
│   ├── main.py                      App entry point
│   ├── config.py                    Settings (reads .env)
│   ├── database/
│   │   └── db.py                    SQLAlchemy models + SQLite
│   ├── routers/
│   │   ├── files.py                 POST /api/files/upload, GET, DELETE
│   │   ├── sessions.py              CRUD /api/sessions/
│   │   ├── chat.py                  POST /api/chat/ask, GET history
│   │   └── misc.py                  GET /api/stats/, /api/models/
│   ├── services/
│   │   ├── parser.py                Text extraction (PDF, DOCX, CSV…)
│   │   └── rag.py                   Self-Healing RAG pipeline (Groq)
│   ├── .env                         GROQ_API_KEY + settings
│   └── requirements.txt
│
├── .gitignore
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|:---:|---|---|
| `POST` | `/api/files/upload` | Upload 1–60 files |
| `GET`  | `/api/files/` | List all indexed files |
| `DELETE` | `/api/files/{id}` | Delete file + chunks |
| `POST` | `/api/sessions/` | Create chat session |
| `GET`  | `/api/sessions/` | List all sessions |
| `DELETE` | `/api/sessions/{id}` | Delete session |
| `POST` | `/api/chat/ask` | Ask a question (RAG) |
| `GET`  | `/api/chat/history/{id}` | Get session messages |
| `GET`  | `/api/stats/` | File / session / message counts |
| `GET`  | `/api/models/` | Available Groq models |

Full interactive docs → [http://localhost:8000/docs](http://localhost:8000/docs)

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Free [Groq API key](https://console.groq.com) — no credit card needed

### 1. Get your free Groq API key
1. Go to [console.groq.com](https://console.groq.com)
2. Sign up free → **API Keys** → **Create Key**
3. Copy the key

### 2. Backend setup
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate — PowerShell
.\.venv\Scripts\Activate.ps1

# Activate — CMD
.venv\Scripts\activate.bat

# If PowerShell blocks scripts, run once:
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

# Install dependencies
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Create `backend/.env`:
```env
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.3-70b-versatile
DATABASE_URL=sqlite:///./studyai.db
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=50
CORS_ORIGINS=http://localhost:3000
MAX_RAG_RETRIES=2
CHUNK_SIZE=1000
CHUNK_OVERLAP=150
TOP_K_CHUNKS=5
```

Start backend:
```bash
cd ..
.\backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
# ✅ Running at http://localhost:8000
# ✅ API docs at http://localhost:8000/docs
```

### 3. Frontend setup
```bash
cd frontend
npm install
npm run dev
# ✅ Running at http://localhost:3000
```

> Open two terminals — both must run simultaneously.

---

## ⚙️ Environment Variables

### `backend/.env`

| Variable | Default | Description |
|---|---|---|
| `GROQ_API_KEY` | *required* | Free key from console.groq.com |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Model to use |
| `DATABASE_URL` | `sqlite:///./studyai.db` | SQLite DB path |
| `UPLOAD_DIR` | `./uploads` | Where uploaded files are stored |
| `MAX_FILE_SIZE_MB` | `50` | Per-file size limit |
| `CORS_ORIGINS` | `http://localhost:3000` | Frontend URL for CORS |
| `MAX_RAG_RETRIES` | `2` | Self-healing retry attempts |
| `CHUNK_SIZE` | `1000` | Words per text chunk |
| `CHUNK_OVERLAP` | `150` | Overlap between chunks |
| `TOP_K_CHUNKS` | `5` | Chunks retrieved per query |

### `frontend/.env`

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000` | Backend URL |

---

## 🤖 Available Groq Models

| Model ID | Name | Context | Best for |
|---|---|---|---|
| `llama-3.3-70b-versatile` | LLaMA 3.3 70B | 128K | Best quality (default) |
| `llama-3.1-8b-instant` | LLaMA 3.1 8B | 128K | Fastest responses |
| `mixtral-8x7b-32768` | Mixtral 8x7B | 32K | Balanced |
| `gemma2-9b-it` | Gemma 2 9B | 8K | Lightweight |

Change `GROQ_MODEL` in `backend/.env` to switch models instantly.

---

## 🏭 Production Build

```bash
# Build frontend
cd frontend && npm run build

# Serve frontend from FastAPI (add to backend/main.py)
# from fastapi.staticfiles import StaticFiles
# app.mount("/", StaticFiles(directory="../frontend/dist", html=True))

# Run production server
cd ..
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18 + Vite 5 | SPA with client-side routing |
| **Styling** | Tailwind CSS | Utility-first design system |
| **HTTP Client** | Axios | API calls to FastAPI backend |
| **Backend** | Python 3.10 + FastAPI | Async REST API server |
| **AI Model** | Groq LLaMA3.3-70B | RAG generation + self-critique |
| **RAG Engine** | Custom Self-Healing RAG | Retrieve → Generate → Critique → Retry |
| **Database** | SQLite + SQLAlchemy | Files, chunks, sessions, messages |
| **File Parsing** | Pillow + python-docx + pdfplumber | Multi-format text extraction |

</div>

---

## 📄 License

MIT License — free to use and modify.

---

<div align="center">

**StudyAI — Upload. Ask. Learn. ✦**

<img src="https://capsule-render.vercel.app/api?type=waving&color=14b8a6&height=100&section=footer" width="100%"/>

</div>#   S t u d y A I 
 
 #   S t u d y A I 
 
 #   S t u d y A I  
 