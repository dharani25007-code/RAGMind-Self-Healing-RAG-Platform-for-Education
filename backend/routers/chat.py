from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database       import get_db
from ..database.db    import Session as SessionModel, Message
from ..services.rag   import run_rag

router = APIRouter(prefix="/api/chat", tags=["chat"])


class AskRequest(BaseModel):
    session_id: int
    question:   str
    file_ids:   list[int] | None = None


@router.post("/ask")
def ask(body: AskRequest, db: Session = Depends(get_db)):
    sess = db.query(SessionModel).filter(SessionModel.id == body.session_id).first()
    if not sess:
        raise HTTPException(404, "Session not found")

    if not body.question.strip():
        raise HTTPException(400, "Question cannot be empty")

    # Save user message
    db.add(Message(session_id=body.session_id, role="user", content=body.question))
    db.commit()

    # Run self-healing RAG
    result = run_rag(db, body.question, body.file_ids)

    # Save assistant message
    db.add(Message(
        session_id = body.session_id,
        role       = "assistant",
        content    = result["answer"],
        retries    = result["retries"],
        verdict    = result["verdict"],
    ))
    db.commit()

    return result


@router.get("/history/{session_id}")
def get_history(session_id: int, db: Session = Depends(get_db)):
    sess = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not sess:
        raise HTTPException(404, "Session not found")

    msgs = (
        db.query(Message)
        .filter(Message.session_id == session_id)
        .order_by(Message.created_at)
        .all()
    )
    return {
        "session": {"id": sess.id, "name": sess.name, "created_at": sess.created_at},
        "messages": [
            {
                "role":    m.role,
                "content": m.content,
                "retries": m.retries,
                "verdict": m.verdict,
            }
            for m in msgs
        ],
    }
