"""
Voice API routes - ElevenLabs voice management
"""
from typing import List

from fastapi import APIRouter, HTTPException

from app.models.schemas import ElevenLabsVoice, VoiceListResponse
from app.services.elevenlabs_service import ElevenLabsService

router = APIRouter(prefix="/voices", tags=["voices"])


@router.get("/", response_model=VoiceListResponse)
async def list_voices():
    """Get all available ElevenLabs voices"""
    service = ElevenLabsService()
    voices_data = await service.get_voices()
    
    voices = [
        ElevenLabsVoice(
            voice_id=v["voice_id"],
            name=v["name"],
            category=v.get("category", "premade"),
            labels=v.get("labels", {}),
            preview_url=v.get("preview_url"),
        )
        for v in voices_data
    ]
    
    return VoiceListResponse(voices=voices)


@router.get("/{voice_id}", response_model=ElevenLabsVoice)
async def get_voice(voice_id: str):
    """Get voice details by ID"""
    service = ElevenLabsService()
    voice = await service.get_voice_by_id(voice_id)
    
    if not voice:
        raise HTTPException(404, "Voice not found")
    
    return ElevenLabsVoice(
        voice_id=voice["voice_id"],
        name=voice["name"],
        category=voice.get("category", "premade"),
        labels=voice.get("labels", {}),
        preview_url=voice.get("preview_url"),
    )


@router.get("/categories/", response_model=List[str])
async def list_voice_categories():
    """Get available voice categories"""
    return ["premade", "cloned", "generated"]


@router.get("/preview/{voice_id}")
async def preview_voice(voice_id: str, text: str = "Hello, this is a voice preview."):
    """Generate a preview audio for a voice"""
    # For now, return the ElevenLabs preview URL if available
    service = ElevenLabsService()
    voice = await service.get_voice_by_id(voice_id)
    
    if not voice:
        raise HTTPException(404, "Voice not found")
    
    if voice.get("preview_url"):
        return {"preview_url": voice["preview_url"]}
    
    # TODO: Generate preview audio
    raise HTTPException(501, "Preview generation not implemented")

