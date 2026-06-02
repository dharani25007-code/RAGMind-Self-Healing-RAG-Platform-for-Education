from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Any

from ..database       import get_db
from ..database.db    import FileRecord, Session as SessionModel, Message
from ..config         import settings
from groq             import Groq
from groq import APIConnectionError, AuthenticationError

router = APIRouter(tags=["misc"])

GROQ_FREE_MODELS = [
    {"id": "llama-3.3-70b-versatile",  "name": "Llama 3.3 70B",     "ctx": "128K", "speed": "⚡ Fast"},
    {"id": "llama-3.1-8b-instant",     "name": "Llama 3.1 8B",      "ctx": "128K", "speed": "⚡⚡ Fastest"},
    {"id": "mixtral-8x7b-32768",       "name": "Mixtral 8x7B",      "ctx": "32K",  "speed": "⚡ Fast"},
    {"id": "gemma2-9b-it",             "name": "Gemma 2 9B",        "ctx": "8K",   "speed": "⚡⚡ Fast"},
    {"id": "llama-3.2-11b-vision-preview","name": "Llama 3.2 11B Vision","ctx": "128K","speed": "⚡ Fast"},
]


@router.get("/api/stats/")
def get_stats(db: Session = Depends(get_db)):
    return {
        "files":    db.query(FileRecord).count(),
        "sessions": db.query(SessionModel).count(),
        "messages": db.query(Message).filter(Message.role == "assistant").count(),
    }


@router.get("/api/models/")
def list_models():
    return GROQ_FREE_MODELS


@router.get("/api/misc/health")
def health_check() -> dict[str, Any]:
    """Check basic app health and Groq connectivity."""
    groq_ok = False
    groq_error = None
    if not settings.GROQ_API_KEY.strip():
        groq_error = "missing_api_key"
    else:
        try:
            client = Groq(api_key=settings.GROQ_API_KEY)
            client.models.list()
            groq_ok = True
        except AuthenticationError:
            groq_error = "invalid_api_key"
        except APIConnectionError:
            groq_error = "network_error"
        except Exception as e:
            groq_error = "groq_error: " + str(e)

    return {
        "ok": True,
        "groq": {
            "ok": groq_ok,
            "error": groq_error,
            "model": settings.GROQ_MODEL,
        },
        "db": {
            "files": get_db, # presence only — detailed DB checks not run here
        }
    }
