import os
import uuid
import json
import shutil
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, EmailStr
import jwt
import bcrypt
from dotenv import load_dotenv
from groq import Groq
import sqlite3

load_dotenv()

app = FastAPI(title="Self-Healing RAG Platform", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

security = HTTPBearer()

# ─── Database ───────────────────────────────────────────────────────────────
def get_db():
    conn = sqlite3.connect("rag_platform.db")
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'student',
            avatar_url TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS files (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_size INTEGER,
            file_type TEXT,
            folder_name TEXT DEFAULT 'Root',
            upload_path TEXT NOT NULL,
            content_text TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT DEFAULT 'New Chat',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            sources TEXT,
            critique TEXT,
            confidence REAL DEFAULT 1.0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        );
    """)
    conn.commit()
    conn.close()

init_db()

# ─── Auth Utilities ──────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        conn = get_db()
        user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        conn.close()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return dict(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─── Pydantic Models ─────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "student"

class LoginRequest(BaseModel):
    email: str
    password: str

class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None
    message: str
    file_ids: Optional[List[str]] = []

# ─── Auth Routes ─────────────────────────────────────────────────────────────
@app.post("/api/auth/register")
def register(req: RegisterRequest):
    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE email = ?", (req.email,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
        (user_id, req.name, req.email, hash_password(req.password), req.role)
    )
    conn.commit()
    conn.close()
    token = create_token(user_id)
    return {"token": token, "user": {"id": user_id, "name": req.name, "email": req.email, "role": req.role}}

@app.post("/api/auth/login")
def login(req: LoginRequest):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (req.email,)).fetchone()
    conn.close()
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token(user["id"])
    return {"token": token, "user": {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]}}

@app.get("/api/auth/me")
def me(current_user=Depends(get_current_user)):
    return {"id": current_user["id"], "name": current_user["name"], "email": current_user["email"], "role": current_user["role"]}

# ─── File Routes ─────────────────────────────────────────────────────────────
@app.post("/api/files/upload")
async def upload_files(
    files: List[UploadFile] = File(...),
    folder_name: str = Form("Root"),
    current_user=Depends(get_current_user)
):
    user_dir = UPLOAD_DIR / current_user["id"]
    user_dir.mkdir(exist_ok=True)
    folder_dir = user_dir / folder_name
    folder_dir.mkdir(exist_ok=True)

    uploaded = []
    conn = get_db()

    for file in files:
        file_id = str(uuid.uuid4())
        ext = Path(file.filename).suffix
        stored_name = f"{file_id}{ext}"
        file_path = folder_dir / stored_name

        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        # Extract text content for RAG
        text_content = ""
        if ext in [".txt", ".md", ".py", ".js", ".ts", ".json", ".csv", ".html", ".css"]:
            try:
                text_content = content.decode("utf-8", errors="ignore")[:50000]
            except:
                pass
        elif ext == ".pdf":
            text_content = f"[PDF File: {file.filename}] - Content indexing requires PDF parser"

        conn.execute(
            "INSERT INTO files (id, user_id, filename, original_name, file_size, file_type, folder_name, upload_path, content_text) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (file_id, current_user["id"], stored_name, file.filename, len(content), ext, folder_name, str(file_path), text_content)
        )
        uploaded.append({
            "id": file_id,
            "original_name": file.filename,
            "file_size": len(content),
            "file_type": ext,
            "folder_name": folder_name,
        })

    conn.commit()
    conn.close()
    return {"uploaded": uploaded, "count": len(uploaded)}

@app.get("/api/files")
def get_files(current_user=Depends(get_current_user)):
    conn = get_db()
    files = conn.execute(
        "SELECT id, original_name, file_size, file_type, folder_name, created_at FROM files WHERE user_id = ? ORDER BY created_at DESC",
        (current_user["id"],)
    ).fetchall()
    conn.close()
    return {"files": [dict(f) for f in files]}

@app.delete("/api/files/{file_id}")
def delete_file(file_id: str, current_user=Depends(get_current_user)):
    conn = get_db()
    file = conn.execute("SELECT * FROM files WHERE id = ? AND user_id = ?", (file_id, current_user["id"])).fetchone()
    if not file:
        conn.close()
        raise HTTPException(status_code=404, detail="File not found")
    try:
        Path(file["upload_path"]).unlink(missing_ok=True)
    except:
        pass
    conn.execute("DELETE FROM files WHERE id = ?", (file_id,))
    conn.commit()
    conn.close()
    return {"message": "Deleted"}

# ─── Chat / RAG Routes ────────────────────────────────────────────────────────
@app.post("/api/chat")
def chat(req: ChatRequest, current_user=Depends(get_current_user)):
    conn = get_db()

    # Get or create conversation
    if req.conversation_id:
        conv = conn.execute("SELECT * FROM conversations WHERE id = ? AND user_id = ?",
                            (req.conversation_id, current_user["id"])).fetchone()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        conv_id = req.conversation_id
    else:
        conv_id = str(uuid.uuid4())
        title = req.message[:50] + "..." if len(req.message) > 50 else req.message
        conn.execute("INSERT INTO conversations (id, user_id, title) VALUES (?, ?, ?)",
                     (conv_id, current_user["id"], title))

    # Retrieve relevant documents (simple keyword search)
    all_files = conn.execute(
        "SELECT id, original_name, content_text, folder_name FROM files WHERE user_id = ? AND content_text != ''",
        (current_user["id"],)
    ).fetchall()

    # Filter by selected file_ids or use all
    if req.file_ids:
        relevant_files = [f for f in all_files if f["id"] in req.file_ids]
    else:
        relevant_files = list(all_files)

    # Build context from files
    context_chunks = []
    sources = []
    query_words = set(req.message.lower().split())

    for f in relevant_files:
        if not f["content_text"]:
            continue
        text = f["content_text"]
        # Simple relevance: count keyword matches
        text_lower = text.lower()
        score = sum(1 for w in query_words if w in text_lower)
        if score > 0 or not req.file_ids:
            context_chunks.append({
                "source": f["original_name"],
                "folder": f["folder_name"],
                "text": text[:3000],
                "score": score
            })
            sources.append(f["original_name"])

    # Sort by relevance
    context_chunks.sort(key=lambda x: x["score"], reverse=True)
    context_chunks = context_chunks[:5]  # Top 5 chunks

    # Get conversation history
    history = conn.execute(
        "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at LIMIT 20",
        (conv_id,)
    ).fetchall()

    messages = []
    for h in history:
        messages.append({"role": h["role"], "content": h["content"]})

    # Build RAG prompt
    context_text = ""
    if context_chunks:
        context_text = "\n\n".join([
            f"[Source: {c['source']} | Folder: {c['folder']}]\n{c['text']}"
            for c in context_chunks
        ])

    system_prompt = f"""You are an intelligent educational assistant for the Self-Healing RAG platform, helping students and professors.

RETRIEVED CONTEXT FROM UPLOADED DOCUMENTS:
{context_text if context_text else "No specific documents retrieved. Use your general knowledge."}

INSTRUCTIONS:
1. Answer based on the retrieved context when available
2. If the context doesn't contain the answer, say so clearly and provide general knowledge
3. Always cite which document/source you're drawing from
4. Be educational, clear, and helpful
5. For professors: provide detailed, technical explanations
6. For students: break down complex concepts with examples
7. Current user role: {current_user['role']}
"""

    # Generate initial answer
    messages_with_q = messages + [{"role": "user", "content": req.message}]

    first_response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "system", "content": system_prompt}] + messages_with_q,
        max_tokens=1500,
        temperature=0.7,
    )
    initial_answer = first_response.choices[0].message.content

    # Self-healing: Critic agent evaluates the answer
    critic_prompt = f"""You are a critic agent evaluating an AI response for accuracy and groundedness.

ORIGINAL QUESTION: {req.message}
RETRIEVED CONTEXT: {context_text[:2000] if context_text else "None"}
GENERATED ANSWER: {initial_answer}

Evaluate:
1. Is the answer grounded in the retrieved context? (yes/no)
2. Does it hallucinate facts not in context? (yes/no)
3. Is it helpful and accurate? (yes/no)
4. Confidence score (0.0 to 1.0)

Respond in JSON format only:
{{"grounded": true/false, "hallucinated": true/false, "helpful": true/false, "confidence": 0.0-1.0, "critique": "brief explanation", "needs_retry": true/false}}"""

    critic_response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": critic_prompt}],
        max_tokens=300,
        temperature=0.2,
    )
    
    critique_text = critic_response.choices[0].message.content
    confidence = 0.85
    critique_summary = ""
    needs_retry = False

    try:
        # Parse critic JSON
        import re
        json_match = re.search(r'\{.*\}', critique_text, re.DOTALL)
        if json_match:
            critique_data = json.loads(json_match.group())
            confidence = critique_data.get("confidence", 0.85)
            critique_summary = critique_data.get("critique", "")
            needs_retry = critique_data.get("needs_retry", False)
    except:
        pass

    final_answer = initial_answer

    # Self-heal: retry with better prompt if needed
    if needs_retry and context_text:
        retry_prompt = f"""The previous answer needed improvement. Please provide a more accurate, grounded response.

QUESTION: {req.message}
CONTEXT: {context_text}
ISSUE: {critique_summary}

Provide a corrected, well-grounded answer. If you don't have enough information, clearly state "I don't have enough information in the uploaded documents to answer this fully" and explain what you do know."""

        retry_response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": system_prompt},
                      {"role": "user", "content": retry_prompt}],
            max_tokens=1500,
            temperature=0.5,
        )
        final_answer = retry_response.choices[0].message.content

    # Save messages
    user_msg_id = str(uuid.uuid4())
    ai_msg_id = str(uuid.uuid4())

    conn.execute("INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)",
                 (user_msg_id, conv_id, "user", req.message))
    conn.execute(
        "INSERT INTO messages (id, conversation_id, role, content, sources, critique, confidence) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (ai_msg_id, conv_id, "assistant", final_answer, json.dumps(sources), critique_summary, confidence)
    )
    conn.execute("UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?", (conv_id,))
    conn.commit()
    conn.close()

    return {
        "conversation_id": conv_id,
        "message_id": ai_msg_id,
        "answer": final_answer,
        "sources": sources,
        "critique": critique_summary,
        "confidence": confidence,
        "was_healed": needs_retry,
        "chunks_used": len(context_chunks)
    }

@app.get("/api/conversations")
def get_conversations(current_user=Depends(get_current_user)):
    conn = get_db()
    convs = conn.execute(
        "SELECT * FROM conversations WHERE user_id = ? ORDER BY updated_at DESC",
        (current_user["id"],)
    ).fetchall()
    conn.close()
    return {"conversations": [dict(c) for c in convs]}

@app.get("/api/conversations/{conv_id}/messages")
def get_messages(conv_id: str, current_user=Depends(get_current_user)):
    conn = get_db()
    conv = conn.execute("SELECT * FROM conversations WHERE id = ? AND user_id = ?",
                        (conv_id, current_user["id"])).fetchone()
    if not conv:
        raise HTTPException(status_code=404, detail="Not found")
    msgs = conn.execute(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at",
        (conv_id,)
    ).fetchall()
    conn.close()
    return {"messages": [dict(m) for m in msgs]}

@app.delete("/api/conversations/{conv_id}")
def delete_conversation(conv_id: str, current_user=Depends(get_current_user)):
    conn = get_db()
    conn.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
    conn.execute("DELETE FROM conversations WHERE id = ? AND user_id = ?", (conv_id, current_user["id"]))
    conn.commit()
    conn.close()
    return {"message": "Deleted"}

@app.get("/api/stats")
def get_stats(current_user=Depends(get_current_user)):
    conn = get_db()
    file_count = conn.execute("SELECT COUNT(*) as c FROM files WHERE user_id = ?", (current_user["id"],)).fetchone()["c"]
    conv_count = conn.execute("SELECT COUNT(*) as c FROM conversations WHERE user_id = ?", (current_user["id"],)).fetchone()["c"]
    msg_count = conn.execute(
        "SELECT COUNT(*) as c FROM messages m JOIN conversations c ON m.conversation_id = c.id WHERE c.user_id = ?",
        (current_user["id"],)
    ).fetchone()["c"]
    total_size = conn.execute("SELECT SUM(file_size) as s FROM files WHERE user_id = ?", (current_user["id"],)).fetchone()["s"] or 0
    folders = conn.execute("SELECT DISTINCT folder_name FROM files WHERE user_id = ?", (current_user["id"],)).fetchall()
    conn.close()
    return {
        "file_count": file_count,
        "conversation_count": conv_count,
        "message_count": msg_count,
        "total_size_mb": round(total_size / 1024 / 1024, 2),
        "folder_count": len(folders)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
