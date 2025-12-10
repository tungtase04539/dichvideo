"""
PyVideoTrans API Client
Communicates with pyvideotrans Flask API
"""
import asyncio
import logging
from pathlib import Path
from typing import Dict, Optional, List, Any
import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class PyVideoTransClient:
    """Client for PyVideoTrans API"""
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or settings.PYVIDEOTRANS_API_URL
        self.timeout = httpx.Timeout(30.0, connect=10.0)
    
    async def health_check(self) -> bool:
        """Check if pyvideotrans API is running"""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/")
                return response.status_code == 200
        except Exception as e:
            logger.error(f"PyVideoTrans health check failed: {e}")
            return False
    
    async def recognize_speech(
        self,
        video_path: str,
        detect_language: str = "en",
        recogn_type: int = 0,  # 0=faster-whisper
        model_name: str = "medium",
        is_cuda: bool = False,
    ) -> Optional[str]:
        """
        Speech recognition (video/audio -> subtitles)
        Returns task_id
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/recogn",
                    json={
                        "name": video_path,
                        "recogn_type": recogn_type,
                        "model_name": model_name,
                        "detect_language": detect_language,
                        "is_cuda": is_cuda,
                        "split_type": "all",
                    }
                )
                data = response.json()
                
                if data.get("code") == 0:
                    return data.get("task_id")
                else:
                    logger.error(f"Recognition error: {data.get('msg')}")
                    return None
        except Exception as e:
            logger.error(f"Recognition request failed: {e}")
            return None
    
    async def translate_subtitles(
        self,
        srt_content: str,
        source_language: str,
        target_language: str,
        translate_type: int = 0,  # 0=Google
    ) -> Optional[str]:
        """
        Translate SRT subtitles
        Returns task_id
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/translate_srt",
                    json={
                        "name": srt_content,
                        "source_code": source_language,
                        "target_language": target_language,
                        "translate_type": translate_type,
                    }
                )
                data = response.json()
                
                if data.get("code") == 0:
                    return data.get("task_id")
                else:
                    logger.error(f"Translation error: {data.get('msg')}")
                    return None
        except Exception as e:
            logger.error(f"Translation request failed: {e}")
            return None
    
    async def text_to_speech(
        self,
        srt_content: str,
        voice_role: str,
        target_language: str,
        tts_type: int = 9,  # 9=ElevenLabs
        voice_rate: str = "+0%",
        voice_autorate: bool = True,
    ) -> Optional[str]:
        """
        Generate TTS from subtitles
        Returns task_id
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/tts",
                    json={
                        "name": srt_content,
                        "voice_role": voice_role,
                        "target_language_code": target_language,
                        "tts_type": tts_type,
                        "voice_rate": voice_rate,
                        "voice_autorate": voice_autorate,
                        "out_ext": "wav",
                    }
                )
                data = response.json()
                
                if data.get("code") == 0:
                    return data.get("task_id")
                else:
                    logger.error(f"TTS error: {data.get('msg')}")
                    return None
        except Exception as e:
            logger.error(f"TTS request failed: {e}")
            return None
    
    async def full_translation(
        self,
        video_path: str,
        source_language: str,
        target_language: str,
        voice_role: str,
        recogn_type: int = 0,
        translate_type: int = 0,
        tts_type: int = 9,
        model_name: str = "medium",
        is_cuda: bool = False,
        voice_autorate: bool = True,
        subtitle_type: int = 1,
    ) -> Optional[str]:
        """
        Full video translation pipeline
        Returns task_id
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/trans_video",
                    json={
                        "name": video_path,
                        "recogn_type": recogn_type,
                        "model_name": model_name,
                        "is_cuda": is_cuda,
                        "translate_type": translate_type,
                        "source_language": source_language,
                        "target_language": target_language,
                        "tts_type": tts_type,
                        "voice_role": voice_role,
                        "voice_rate": "+0%",
                        "voice_autorate": voice_autorate,
                        "subtitle_type": subtitle_type,
                        "is_separate": False,
                    }
                )
                data = response.json()
                
                if data.get("code") == 0:
                    return data.get("task_id")
                else:
                    logger.error(f"Translation error: {data.get('msg')}")
                    return None
        except Exception as e:
            logger.error(f"Full translation request failed: {e}")
            return None
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get task status
        Returns: {code: int, msg: str, data?: {...}}
        code: -1=in progress, 0=success, >0=error
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    f"{self.base_url}/task_status",
                    json={"task_id": task_id}
                )
                return response.json()
        except Exception as e:
            logger.error(f"Task status request failed: {e}")
            return {"code": 1, "msg": str(e)}
    
    async def wait_for_task(
        self,
        task_id: str,
        poll_interval: float = 2.0,
        timeout: float = 3600.0,  # 1 hour
        progress_callback: Optional[callable] = None,
    ) -> Dict[str, Any]:
        """
        Wait for task to complete
        """
        elapsed = 0.0
        
        while elapsed < timeout:
            status = await self.get_task_status(task_id)
            
            if progress_callback:
                await progress_callback(status)
            
            code = status.get("code", 1)
            
            if code == 0:  # Success
                return status
            elif code > 0:  # Error
                return status
            
            # In progress, wait and retry
            await asyncio.sleep(poll_interval)
            elapsed += poll_interval
        
        return {"code": 2, "msg": "Task timeout"}

