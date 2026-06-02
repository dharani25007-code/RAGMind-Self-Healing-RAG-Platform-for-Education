"""
SQLite database — tables: files, sessions, messages, chunks
"""
from datetime import datetime
from sqlalchemy import (
    create_engine, Column, Integer, String, Text,
    DateTime, ForeignKey, Float
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from ..config import settings

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class FileRecord(Base):
    __tablename__ = "files"
    id         = Column(Integer, primary_key=True, index=True)
    filename   = Column(String, nullable=False)
    file_path  = Column(String, nullable=False)
    file_size  = Column(Integer, default=0)
    mime_type  = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    chunks     = relationship("Chunk", back_populates="file", cascade="all, delete")


class Chunk(Base):
    __tablename__ = "chunks"
    id         = Column(Integer, primary_key=True, index=True)
    file_id    = Column(Integer, ForeignKey("files.id"), nullable=False)
    content    = Column(Text, nullable=False)
    chunk_idx  = Column(Integer, default=0)
    file       = relationship("FileRecord", back_populates="chunks")


class Session(Base):
    __tablename__ = "sessions"
    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, default="Untitled session")
    created_at = Column(DateTime, default=datetime.utcnow)
    messages   = relationship("Message", back_populates="session", cascade="all, delete")


class Message(Base):
    __tablename__ = "messages"
    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    role       = Column(String, nullable=False)       # user | assistant
    content    = Column(Text, nullable=False)
    retries    = Column(Integer, default=0)
    verdict    = Column(String, default="pass")
    created_at = Column(DateTime, default=datetime.utcnow)
    session    = relationship("Session", back_populates="messages")


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
