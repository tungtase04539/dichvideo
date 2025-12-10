"""
ElevenLabs API Service for multi-voice TTS
"""
import json
import logging
from pathlib import Path
from typing import List, Dict, Optional
import httpx
from elevenlabs import ElevenLabs, VoiceSettings

from app.config import settings

logger = logging.getLogger(__name__)


class ElevenLabsService:
    """Service for ElevenLabs API interactions"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.ELEVENLABS_API_KEY
        self.client = None
        if self.api_key:
            self.client = ElevenLabs(api_key=self.api_key)
    
    async def get_voices(self) -> List[Dict]:
        """Get all available voices from ElevenLabs"""
        if not self.client:
            # Return default voices from pyvideotrans config
            return self._get_default_voices()
        
        try:
            voices = self.client.voices.get_all()
            return [
                {
                    "voice_id": voice.voice_id,
                    "name": voice.name,
                    "category": voice.category or "premade",
                    "labels": voice.labels or {},
                    "preview_url": voice.preview_url,
                }
                for voice in voices.voices
            ]
        except Exception as e:
            logger.error(f"Error fetching voices: {e}")
            return self._get_default_voices()
    
    def _get_default_voices(self) -> List[Dict]:
        """Get default voices from pyvideotrans elevenlabs.json"""
        voice_file = settings.PYVIDEOTRANS_DIR / "videotrans" / "voicejson" / "elevenlabs.json"
        
        if voice_file.exists():
            try:
                with open(voice_file, 'r', encoding='utf-8') as f:
                    voices_data = json.load(f)
                
                return [
                    {
                        "voice_id": data.get("voice_id", ""),
                        "name": name,
                        "category": "premade",
                        "labels": {},
                        "preview_url": None,
                    }
                    for name, data in voices_data.items()
                    if isinstance(data, dict) and data.get("voice_id")
                ]
            except Exception as e:
                logger.error(f"Error reading voices file: {e}")
        
        # Fallback hardcoded voices
        return [
            {"voice_id": "21m00Tcm4TlvDq8ikWAM", "name": "Rachel", "category": "premade", "labels": {"gender": "female"}, "preview_url": None},
            {"voice_id": "AZnzlk1XvdvUeBnXmlld", "name": "Domi", "category": "premade", "labels": {"gender": "female"}, "preview_url": None},
            {"voice_id": "EXAVITQu4vr4xnSDxMaL", "name": "Bella", "category": "premade", "labels": {"gender": "female"}, "preview_url": None},
            {"voice_id": "ErXwobaYiN019PkySvjV", "name": "Antoni", "category": "premade", "labels": {"gender": "male"}, "preview_url": None},
            {"voice_id": "MF3mGyEYCl7XYWbV9V6O", "name": "Elli", "category": "premade", "labels": {"gender": "female"}, "preview_url": None},
            {"voice_id": "TxGEqnHWrfWFTfGW9XjX", "name": "Josh", "category": "premade", "labels": {"gender": "male"}, "preview_url": None},
            {"voice_id": "VR6AewLTigWG4xSOukaG", "name": "Arnold", "category": "premade", "labels": {"gender": "male"}, "preview_url": None},
            {"voice_id": "pNInz6obpgDQGcFmaJgB", "name": "Adam", "category": "premade", "labels": {"gender": "male"}, "preview_url": None},
            {"voice_id": "yoZ06aMxZJJ28mfd3POQ", "name": "Sam", "category": "premade", "labels": {"gender": "male"}, "preview_url": None},
        ]
    
    async def generate_speech(
        self,
        text: str,
        voice_id: str,
        output_path: Path,
        speed: float = 1.0,
    ) -> bool:
        """Generate speech audio file"""
        if not self.client:
            logger.error("ElevenLabs client not initialized")
            return False
        
        try:
            response = self.client.text_to_speech.convert(
                text=text,
                voice_id=voice_id,
                model_id="eleven_multilingual_v2",
                output_format="mp3_44100_128",
                voice_settings=VoiceSettings(
                    speed=speed,
                    stability=0.5,
                    similarity_boost=0.75,
                    style=0.0,
                    use_speaker_boost=True
                )
            )
            
            # Save to file
            with open(output_path, 'wb') as f:
                for chunk in response:
                    if chunk:
                        f.write(chunk)
            
            return True
        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            return False
    
    async def get_voice_by_id(self, voice_id: str) -> Optional[Dict]:
        """Get voice details by ID"""
        voices = await self.get_voices()
        for voice in voices:
            if voice["voice_id"] == voice_id:
                return voice
        return None

