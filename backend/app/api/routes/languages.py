"""
Language API routes
"""
from typing import List

from fastapi import APIRouter

from app.models.schemas import LanguageInfo, SUPPORTED_LANGUAGES

router = APIRouter(prefix="/languages", tags=["languages"])


@router.get("/", response_model=List[LanguageInfo])
async def list_languages():
    """Get all supported languages"""
    return SUPPORTED_LANGUAGES


@router.get("/source", response_model=List[LanguageInfo])
async def list_source_languages():
    """Get languages available as source (speech recognition)"""
    # All languages can be source
    return SUPPORTED_LANGUAGES


@router.get("/target", response_model=List[LanguageInfo])
async def list_target_languages():
    """Get languages available as target (translation + TTS)"""
    # All languages can be target
    return SUPPORTED_LANGUAGES

