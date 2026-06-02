"""
Self-Healing RAG pipeline using Groq (free tier).

Steps:
  1. Retrieve top-K chunks via keyword search (SQLite FTS-like)
  2. Generate answer with Groq Llama 3.3 70B
  3. Critic checks grounding → PASS or FAIL
  4. On FAIL, reformulate query and retry (up to MAX_RAG_RETRIES)
  5. Return grounded answer or graceful fallback
"""
from groq import Groq
from groq import APIConnectionError, AuthenticationError, BadRequestError, RateLimitError
from sqlalchemy.orm import Session as DBSession

from ..config import settings
from ..database.db import Chunk, FileRecord

_client: Groq | None = None
_MAX_CONTEXT_CHARS = 8000
_MAX_CRITIQUE_CONTEXT_CHARS = 4000


def _get_client() -> Groq:
    global _client
    if _client is None:
        _client = Groq(api_key=settings.GROQ_API_KEY)
    return _client


# ── Retrieval ──────────────────────────────────────────────────────────────

def retrieve_chunks(db: DBSession, query: str, file_ids: list[int] | None, top_k: int) -> list[dict]:
    """Keyword-based retrieval from SQLite chunks.

    Returns a list of dicts: {content, file_id, chunk_idx, filename}
    """
    q = db.query(Chunk).join(FileRecord)
    if file_ids:
        q = q.filter(Chunk.file_id.in_(file_ids))

    all_chunks = q.all()
    if not all_chunks:
        return []

    # Simple TF-style scoring: count query word overlaps
    query_words = set((query or "").lower().split())

    def score(chunk: Chunk) -> int:
        words = set((chunk.content or "").lower().split())
        return len(query_words & words)

    ranked = sorted(all_chunks, key=score, reverse=True)
    results: list[dict] = []
    for c in ranked[:top_k]:
        results.append({
            "content": c.content,
            "file_id": c.file_id,
            "chunk_idx": getattr(c, "chunk_idx", None),
            "filename": getattr(c.file, "filename", None),
        })
    return results


def _limit_chunks(chunks: list[dict], max_chars: int) -> list[dict]:
    selected: list[dict] = []
    total = 0

    for chunk in chunks:
        content = chunk.get("content", "")
        chunk_len = len(content)
        if selected and total + chunk_len + 5 > max_chars:
            break
        if not selected and chunk_len > max_chars:
            clipped = dict(chunk)
            clipped["content"] = content[:max_chars]
            selected.append(clipped)
            break

        selected.append(chunk)
        total += chunk_len + 5

    return selected


# ── LLM Calls ─────────────────────────────────────────────────────────────

def _llm(system: str, user: str, max_tokens: int = 1024) -> str:
    if not settings.GROQ_API_KEY.strip():
        raise RuntimeError("GROQ_API_KEY is not set")

    resp = _get_client().chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=[
            {"role": "system",  "content": system},
            {"role": "user",    "content": user},
        ],
        max_tokens=max_tokens,
        temperature=0,
    )
    return resp.choices[0].message.content.strip()


def generate_answer(question: str, chunks: list[dict]) -> str:
    chunks = _limit_chunks(chunks, _MAX_CONTEXT_CHARS)
    context = "\n\n---\n\n".join([c.get("content", "") for c in chunks]) if chunks else "No relevant content found."
    return _llm(
        system=(
            "You are a helpful AI study assistant. Answer the student's question "
            "using ONLY the provided context. Be clear and thorough. "
            "If the context lacks enough information, say so honestly."
        ),
        user=f"Context:\n{context}\n\nQuestion: {question}",
    )


def critique_answer(question: str, answer: str, chunks: list[dict]) -> tuple[str, str]:
    """Returns (verdict, feedback). verdict is 'pass' or 'fail'."""
    chunks = _limit_chunks(chunks, _MAX_CRITIQUE_CONTEXT_CHARS)
    context = "\n\n---\n\n".join([c.get("content", "") for c in chunks]) if chunks else ""
    feedback = _llm(
        system=(
            "You are a strict fact-checker. Determine if the answer is fully grounded "
            "in the provided context.\n\n"
            "Reply with exactly one of:\n"
            "  PASS – all claims are supported by the context.\n"
            "  FAIL – answer contains claims NOT in context (hallucination), or claims "
            "ignorance when the context has the answer.\n\n"
            "Follow with one sentence of explanation."
        ),
        user=f"Context:\n{context}\n\nAnswer:\n{answer}\n\nVerdict (PASS or FAIL):",
        max_tokens=200,
    )
    verdict = "pass" if feedback.strip().upper().startswith("PASS") else "fail"
    return verdict, feedback


def reformulate_query(question: str, query: str, critique: str) -> str:
    return _llm(
        system=(
            "You are a search-query optimizer. Rewrite the query to retrieve better "
            "evidence given the critic's feedback. Output ONLY the new query."
        ),
        user=f"Original question: {question}\nPrevious query: {query}\nCritic: {critique}\n\nNew query:",
        max_tokens=100,
    )


# ── Main Pipeline ──────────────────────────────────────────────────────────

def run_rag(
    db: DBSession,
    question: str,
    file_ids: list[int] | None = None,
) -> dict:
    """
    Run self-healing RAG and return:
      { answer, retries, verdict, chunks_used }
    """
    query    = question
    retries  = 0
    critique = ""
    chunks   = []
    answer   = ""
    verdict  = "fail"

    if not settings.GROQ_API_KEY.strip():
        return {
            "answer": (
                "GROQ_API_KEY is not set in backend/.env, so chat is disabled right now. "
                "Add your Groq API key and restart the server to enable answers."
            ),
            "retries": 0,
            "verdict": "fail",
            "chunks_used": 0,
            "error_type": "missing_api_key",
        }

    try:
        for attempt in range(settings.MAX_RAG_RETRIES + 1):
            # 1. Retrieve
            chunks = _limit_chunks(
                retrieve_chunks(db, query, file_ids, settings.TOP_K_CHUNKS),
                _MAX_CONTEXT_CHARS,
            )

            # 2. Generate
            answer = generate_answer(question, chunks)

            # 3. Critique
            verdict, critique = critique_answer(question, answer, chunks)

            if verdict == "pass":
                break

            # 4. Retry with reformulated query
            if attempt < settings.MAX_RAG_RETRIES:
                query   = reformulate_query(question, query, critique)
                retries += 1
    except Exception as exc:
        error_type = "groq_error"
        if isinstance(exc, AuthenticationError):
            error_type = "invalid_api_key"
        elif isinstance(exc, RateLimitError):
            error_type = "rate_limited"
        elif isinstance(exc, APIConnectionError):
            error_type = "network_error"
        elif isinstance(exc, BadRequestError):
            error_type = "bad_request"

        q_low = (question or "").lower()
        if ".env" in q_low or "env" in q_low or "environment" in q_low:
            # Provide env guidance even when Groq is unreachable
            return {
                "answer": (
                    "Common backend environment variables for StudyAI:\n\n"
                    "- `GROQ_API_KEY`: Your Groq API key (keep this secret).\n"
                    "- `GROQ_MODEL`: Model id, e.g. `llama-3.3-70b-versatile`.\n"
                    "- `DATABASE_URL`: SQLite URL, e.g. `sqlite:///./studyai.db`.\n"
                    "- `UPLOAD_DIR`: Directory where uploaded files are saved.\n"
                    "- `MAX_FILE_SIZE_MB`: Maximum file size to accept.\n"
                    "- `CORS_ORIGINS`: Allowed frontend origins.\n"
                    "- `MAX_RAG_RETRIES`: Number of self-healing retry attempts.\n"
                    "- `CHUNK_SIZE`, `CHUNK_OVERLAP`, `TOP_K_CHUNKS`: RAG chunking and retrieval parameters.\n\n"
                    "Example `backend/.env` (DO NOT commit your real API key):\n\n"
                    "GROQ_API_KEY=your_groq_api_key_here\n"
                    "GROQ_MODEL=llama-3.3-70b-versatile\n"
                    "DATABASE_URL=sqlite:///./studyai.db\n"
                    "UPLOAD_DIR=./uploads\n"
                    "MAX_FILE_SIZE_MB=50\n"
                    "CORS_ORIGINS=http://localhost:3000\n"
                    "MAX_RAG_RETRIES=2\n"
                    "CHUNK_SIZE=1000\n"
                    "CHUNK_OVERLAP=150\n"
                    "TOP_K_CHUNKS=5\n\n"
                    "Security note: never commit secrets to git. Rotate keys if exposed, and store secrets securely."
                ),
                "retries": retries,
                "verdict": "fail",
                "chunks_used": len(chunks),
                "error_type": error_type,
            }

        return {
            "answer": (
                "I couldn't reach Groq right now, so I couldn't generate an answer."
            ),
            "retries": retries,
            "verdict": "fail",
            "chunks_used": len(chunks),
            "error_type": error_type,
        }

    # 5. Graceful fallback if still failing
    if verdict != "pass":
        q_low = (question or "").lower()
        # Provide a helpful, specific fallback for common config questions
        if ".env" in q_low or "env" in q_low or "environment" in q_low:
            answer = (
                "Common backend environment variables for StudyAI:\n\n"
                "- `GROQ_API_KEY`: Your Groq API key (keep this secret).\n"
                "- `GROQ_MODEL`: Model id, e.g. `llama-3.3-70b-versatile`.\n"
                "- `DATABASE_URL`: SQLite URL, e.g. `sqlite:///./studyai.db`.\n"
                "- `UPLOAD_DIR`: Directory where uploaded files are saved.\n"
                "- `MAX_FILE_SIZE_MB`: Maximum file size to accept.\n"
                "- `CORS_ORIGINS`: Allowed frontend origins.\n"
                "- `MAX_RAG_RETRIES`: Number of self-healing retry attempts.\n"
                "- `CHUNK_SIZE`, `CHUNK_OVERLAP`, `TOP_K_CHUNKS`: RAG chunking and retrieval parameters.\n\n"
                "Example `backend/.env` (DO NOT commit your real API key):\n\n"
                "GROQ_API_KEY=your_groq_api_key_here\n"
                "GROQ_MODEL=llama-3.3-70b-versatile\n"
                "DATABASE_URL=sqlite:///./studyai.db\n"
                "UPLOAD_DIR=./uploads\n"
                "MAX_FILE_SIZE_MB=50\n"
                "CORS_ORIGINS=http://localhost:3000\n"
                "MAX_RAG_RETRIES=2\n"
                "CHUNK_SIZE=1000\n"
                "CHUNK_OVERLAP=150\n"
                "TOP_K_CHUNKS=5\n\n"
                "Security note: never commit secrets to git. Rotate keys if exposed, and store secrets securely."
            )
        else:
            answer = (
                "I don't have enough reliable information in your uploaded files to answer "
                "that question confidently. Please upload more relevant study materials, "
                "or rephrase your question."
            )

    return {
        "answer":      answer,
        "retries":     retries,
        "verdict":     verdict,
        "chunks_used": len(chunks),
        "sources": [
            {
                "filename": c.get("filename"),
                "file_id": c.get("file_id"),
                "chunk_idx": c.get("chunk_idx"),
                "snippet": (c.get("content", "")[:300] + ("..." if len(c.get("content", ""))>300 else "")),
            }
            for c in chunks
        ],
    }
