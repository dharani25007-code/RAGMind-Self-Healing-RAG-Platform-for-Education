from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..database import get_db
from ..database.db import Session as SessionModel

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


class SessionCreate(BaseModel):
    name: str = "Untitled session"


class SessionUpdate(BaseModel):
    name: str


@router.post("/")
def create_session(body: SessionCreate, db: Session = Depends(get_db)):
    s = SessionModel(name=body.name)
    db.add(s)
    db.commit()
    db.refresh(s)
    return {"id": s.id, "name": s.name, "created_at": s.created_at}


@router.get("/")
def list_sessions(db: Session = Depends(get_db)):
    rows = db.query(SessionModel).order_by(SessionModel.created_at.desc()).all()
    return [{"id": r.id, "name": r.name, "created_at": r.created_at} for r in rows]


@router.delete("/{session_id}")
def delete_session(session_id: int, db: Session = Depends(get_db)):
    s = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.put("/{session_id}")
def rename_session(session_id: int, body: SessionUpdate, db: Session = Depends(get_db)):
    s = db.query(SessionModel).filter(SessionModel.id == session_id).first()
    if not s:
        raise HTTPException(404, "Session not found")
    s.name = body.name.strip() or s.name
    db.commit()
    db.refresh(s)
    return {"id": s.id, "name": s.name, "created_at": s.created_at}
