from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    GROQ_API_KEY:    str  = ""
    GROQ_MODEL:      str  = "llama-3.3-70b-versatile"
    DATABASE_URL:    str  = "sqlite:///./studyai.db"
    UPLOAD_DIR:      str  = "./uploads"
    MAX_FILE_SIZE_MB: int = 50
    CORS_ORIGINS:    str  = "http://localhost:3000"
    MAX_RAG_RETRIES: int  = 2
    CHUNK_SIZE:      int  = 1000
    CHUNK_OVERLAP:   int  = 150
    TOP_K_CHUNKS:    int  = 5

    class Config:
        env_file = Path(__file__).resolve().parent / ".env"
        env_file_encoding = "utf-8"
        extra    = "ignore"

    @property
    def upload_path(self) -> Path:
        p = Path(self.UPLOAD_DIR)
        p.mkdir(parents=True, exist_ok=True)
        return p

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]


settings = Settings()
