"""
Project API routes for processing server
"""
import asyncio
import uuid
from typing import Dict

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.services.supabase_client import get_supabase
from app.services.video_processor import VideoProcessor

router = APIRouter(prefix="/projects", tags=["projects"])


class VoiceMappingRequest(BaseModel):
    voice_mapping: Dict[str, str]


# ============ Analysis ============

@router.post("/{project_id}/analyze")
async def analyze_speakers(
    project_id: str,
    background_tasks: BackgroundTasks,
):
    """Start speaker analysis (diarization)"""
    supabase = get_supabase()
    
    project = await supabase.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    
    if project["status"] not in ["pending", "failed"]:
        raise HTTPException(400, "Project is already being processed")
    
    # Update status
    await supabase.update_project_status(project_id, "diarizing", 5)
    
    # Start background task
    background_tasks.add_task(
        run_speaker_analysis,
        project_id,
        project["original_video_url"],
        project["original_language"],
        project["num_speakers"] or -1
    )
    
    return {"status": "started", "message": "Speaker analysis started"}


async def run_speaker_analysis(
    project_id: str,
    video_url: str,
    language: str,
    num_speakers: int
):
    """Background task for speaker analysis"""
    supabase = get_supabase()
    
    try:
        processor = VideoProcessor(project_id)
        
        # Download and extract audio
        video_path = await processor.download_source_video(video_url)
        audio_path = await processor.extract_audio(video_path)
        
        # Run diarization
        segments = await processor.run_speaker_diarization(
            audio_path,
            language=language,
            num_speakers=num_speakers
        )
        
        # Get speaker summary
        speakers_summary = processor.get_speakers_summary(segments)
        
        # Create speaker records in Supabase
        speakers_list = [
            {
                "label": label,
                "total_duration_ms": data["total_duration_ms"],
                "segment_count": data["segment_count"],
            }
            for label, data in speakers_summary.items()
        ]
        
        await supabase.create_speakers(project_id, speakers_list)
        
        # Update project
        await supabase.update_project(project_id, {
            "num_speakers": len(speakers_summary),
            "status": "voice_mapping",
            "progress": 25,
        })
        
        processor.cleanup()
        
    except Exception as e:
        await supabase.update_project_status(project_id, "failed", 0, str(e))


# ============ Processing ============

@router.post("/{project_id}/process")
async def start_processing(
    project_id: str,
    request: VoiceMappingRequest,
    background_tasks: BackgroundTasks,
):
    """Start full dubbing process"""
    supabase = get_supabase()
    
    project = await supabase.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    
    if not request.voice_mapping:
        raise HTTPException(400, "Voice mapping required")
    
    # Update voice mapping
    await supabase.update_project(project_id, {
        "voice_mapping": request.voice_mapping,
        "status": "transcribing",
        "progress": 30,
    })
    
    # Start background processing
    background_tasks.add_task(
        run_full_processing,
        project_id,
        request.voice_mapping
    )
    
    return {"status": "started", "message": "Processing started"}


async def run_full_processing(project_id: str, voice_mapping: Dict[str, str]):
    """Background task for full video processing"""
    supabase = get_supabase()
    
    project = await supabase.get_project(project_id)
    
    try:
        processor = VideoProcessor(project_id)
        
        await processor.process_full_pipeline(
            video_url=project["original_video_url"],
            source_language=project["original_language"],
            target_language=project["target_language"],
            voice_mapping=voice_mapping,
            num_speakers=project["num_speakers"] or -1,
        )
        
    except Exception as e:
        await supabase.update_project_status(project_id, "failed", 0, str(e))


# ============ Status ============

@router.get("/{project_id}/status")
async def get_processing_status(project_id: str):
    """Get current processing status"""
    supabase = get_supabase()
    
    project = await supabase.get_project(project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    
    return {
        "project_id": project_id,
        "status": project["status"],
        "progress": project["progress"],
        "error_message": project["error_message"],
    }
