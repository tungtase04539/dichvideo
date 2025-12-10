"""
DichVideo Processing Server
Deployed on Railway/Render
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes import projects, voices

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info(f"Starting {settings.APP_NAME}...")
    logger.info(f"Supabase URL: {settings.SUPABASE_URL[:30]}...")
    yield
    logger.info("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="DichVideo Processing Server",
    description="""
    Video processing backend for DichVideo SaaS.
    
    Handles:
    - Speaker diarization
    - Speech-to-text transcription
    - Translation
    - Multi-voice TTS generation
    - Audio mixing and video rendering
    
    Connects to Supabase for database and storage.
    """,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.vercel.app",
        "*",  # Be more restrictive in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(projects.router, prefix="/api")
app.include_router(voices.router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "supabase_connected": bool(settings.SUPABASE_URL),
        "elevenlabs_configured": bool(settings.ELEVENLABS_API_KEY),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
