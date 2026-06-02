"""
StudyAI Backend — FastAPI + Groq Self-Healing RAG
Run: uvicorn backend.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config   import settings
from .database import create_tables
from .routers  import files_router, sessions_router, chat_router, misc_router
from fastapi.staticfiles import StaticFiles
from pathlib import Path

app = FastAPI(
    title       = "StudyAI API",
    description = "Self-Healing RAG pipeline powered by Groq (free tier)",
    version     = "1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins     = settings.cors_list,
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# Create DB tables on startup
@app.on_event("startup")
def startup():
    create_tables()
    print(f"✅  StudyAI started — model: {settings.GROQ_MODEL}")
    if not settings.GROQ_API_KEY:
        print("⚠️   GROQ_API_KEY not set — chat will fail. Add it to backend/.env")


app.include_router(files_router)
app.include_router(sessions_router)
app.include_router(chat_router)
app.include_router(misc_router)

# Serve built frontend if available
dist_path = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if dist_path.exists():
    app.mount("/", StaticFiles(directory=str(dist_path), html=True), name="frontend")


@app.get("/")
def root():
    return {"status": "ok", "model": settings.GROQ_MODEL}


@app.get("/health")
def health():
    return {"status": "ok"}
