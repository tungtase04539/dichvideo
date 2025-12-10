"""
Application configuration for Railway/Render deployment
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings"""
    
    # App
    APP_NAME: str = "DichVideo Processing Server"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = int(os.getenv("PORT", "8000"))  # Railway sets PORT env
    
    # Paths
    BASE_DIR: Path = Path(__file__).parent.parent
    TEMP_DIR: Path = Path("/tmp/dichvideo") if os.getenv("RAILWAY_ENVIRONMENT") else BASE_DIR / "temp"
    PYVIDEOTRANS_DIR: Path = BASE_DIR.parent / "pyvideotrans"
    
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")
    SUPABASE_STORAGE_BUCKET: str = "videos"
    
    # ElevenLabs
    ELEVENLABS_API_KEY: Optional[str] = os.getenv("ELEVENLABS_API_KEY")
    
    # Processing
    MAX_VIDEO_DURATION: int = 3600  # 1 hour
    WHISPER_MODEL: str = os.getenv("WHISPER_MODEL", "medium")
    USE_CUDA: bool = os.getenv("USE_CUDA", "false").lower() == "true"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()

# Create temp directory
settings.TEMP_DIR.mkdir(parents=True, exist_ok=True)
