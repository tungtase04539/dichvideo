"""
Supabase client for backend processing server
"""
import os
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
import httpx

from app.config import settings


class SupabaseClient:
    """Supabase client for database and storage operations"""
    
    def __init__(self):
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY
        )
        self.bucket = settings.SUPABASE_STORAGE_BUCKET
    
    # ============ Projects ============
    
    async def get_project(self, project_id: str) -> Optional[Dict]:
        """Get project by ID"""
        response = self.client.table("projects").select("*").eq("id", project_id).single().execute()
        return response.data
    
    async def update_project(self, project_id: str, data: Dict[str, Any]) -> Dict:
        """Update project"""
        response = self.client.table("projects").update(data).eq("id", project_id).execute()
        return response.data[0] if response.data else {}
    
    async def update_project_status(
        self,
        project_id: str,
        status: str,
        progress: float,
        error_message: Optional[str] = None
    ):
        """Update project status and progress"""
        data = {
            "status": status,
            "progress": progress,
        }
        if error_message:
            data["error_message"] = error_message
        if status == "completed":
            data["completed_at"] = "now()"
        
        await self.update_project(project_id, data)
    
    # ============ Speakers ============
    
    async def create_speakers(self, project_id: str, speakers: List[Dict]) -> List[Dict]:
        """Create speaker records"""
        speaker_records = [
            {
                "project_id": project_id,
                "speaker_label": spk["label"],
                "total_duration_ms": spk.get("total_duration_ms", 0),
                "segment_count": spk.get("segment_count", 0),
            }
            for spk in speakers
        ]
        
        response = self.client.table("speakers").insert(speaker_records).execute()
        return response.data
    
    async def get_speakers(self, project_id: str) -> List[Dict]:
        """Get speakers for a project"""
        response = self.client.table("speakers").select("*").eq("project_id", project_id).execute()
        return response.data
    
    # ============ Segments ============
    
    async def create_segments(self, project_id: str, segments: List[Dict]) -> List[Dict]:
        """Create segment records"""
        response = self.client.table("segments").insert(segments).execute()
        return response.data
    
    # ============ Storage ============
    
    async def download_video(self, video_url: str, local_path: str) -> str:
        """Download video from Supabase Storage"""
        # Extract path from URL
        # URL format: https://xxx.supabase.co/storage/v1/object/public/videos/path
        path = video_url.split(f"{self.bucket}/")[-1]
        
        # Download using httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(video_url)
            response.raise_for_status()
            
            with open(local_path, "wb") as f:
                f.write(response.content)
        
        return local_path
    
    async def upload_video(self, local_path: str, storage_path: str) -> str:
        """Upload video to Supabase Storage"""
        with open(local_path, "rb") as f:
            self.client.storage.from_(self.bucket).upload(
                storage_path,
                f,
                file_options={"content-type": "video/mp4"}
            )
        
        # Get public URL
        url = self.client.storage.from_(self.bucket).get_public_url(storage_path)
        return url
    
    async def upload_audio(self, local_path: str, storage_path: str) -> str:
        """Upload audio file to Supabase Storage"""
        with open(local_path, "rb") as f:
            self.client.storage.from_(self.bucket).upload(
                storage_path,
                f,
                file_options={"content-type": "audio/wav"}
            )
        
        url = self.client.storage.from_(self.bucket).get_public_url(storage_path)
        return url


# Singleton instance
_supabase_client: Optional[SupabaseClient] = None


def get_supabase() -> SupabaseClient:
    """Get Supabase client singleton"""
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = SupabaseClient()
    return _supabase_client

