from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
import shutil, uuid

from ..database import get_db, FileRecord, Chunk
from ..services  import extract_text, chunk_text
from ..config    import settings

router = APIRouter(prefix="/api/files", tags=["files"])


@router.post("/upload")
async def upload_files(
    files: list[UploadFile] = File(...),
    db:    Session          = Depends(get_db),
):
    results = []
    for uf in files:
        # Size guard
        content = await uf.read()
        if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
            raise HTTPException(400, f"{uf.filename} exceeds {settings.MAX_FILE_SIZE_MB} MB limit")

        # Save to disk
        safe_name = f"{uuid.uuid4().hex}_{uf.filename}"
        dest      = settings.upload_path / safe_name
        dest.write_bytes(content)

        # DB record
        rec = FileRecord(
            filename  = uf.filename,
            file_path = str(dest),
            file_size = len(content),
            mime_type = uf.content_type or "",
        )
        db.add(rec)
        db.flush()

        # Extract text and chunk
        text   = extract_text(str(dest), uf.filename)
        chunks = chunk_text(text, settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
        for i, c in enumerate(chunks):
            db.add(Chunk(file_id=rec.id, content=c, chunk_idx=i))

        db.commit()
        db.refresh(rec)
        results.append({"id": rec.id, "filename": rec.filename, "chunks": len(chunks)})

    return results


@router.get("/")
def list_files(db: Session = Depends(get_db)):
    rows = db.query(FileRecord).order_by(FileRecord.created_at.desc()).all()
    return [
        {
            "id": r.id, "filename": r.filename,
            "file_size": r.file_size, "created_at": r.created_at,
        }
        for r in rows
    ]


@router.delete("/{file_id}")
def delete_file(file_id: int, db: Session = Depends(get_db)):
    rec = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if not rec:
        raise HTTPException(404, "File not found")
    # Remove from disk
    try: Path(rec.file_path).unlink(missing_ok=True)
    except Exception: pass
    db.delete(rec)
    db.commit()
    return {"ok": True}
