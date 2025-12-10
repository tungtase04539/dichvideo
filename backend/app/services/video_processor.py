"""
Video Processor Service
Handles the complete multi-speaker dubbing workflow
Works with Supabase for storage and database
"""
import asyncio
import logging
import os
import shutil
import sys
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Callable

from app.config import settings
from app.services.supabase_client import get_supabase

logger = logging.getLogger(__name__)


class VideoProcessor:
    """
    Multi-speaker video dubbing processor
    
    Workflow:
    1. Download video from Supabase Storage
    2. Extract audio from video
    3. Speaker diarization (identify who speaks when)
    4. Speech-to-text (transcribe each segment)
    5. Translation
    6. Multi-voice TTS (different voice per speaker)
    7. Audio sync & mixing
    8. Final video render
    9. Upload result to Supabase Storage
    """
    
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.work_dir = settings.TEMP_DIR / project_id
        self.work_dir.mkdir(parents=True, exist_ok=True)
        self.supabase = get_supabase()
        
        # Add pyvideotrans to path
        pyvideotrans_path = str(settings.PYVIDEOTRANS_DIR)
        if pyvideotrans_path not in sys.path:
            sys.path.insert(0, pyvideotrans_path)
    
    async def download_source_video(self, video_url: str) -> Path:
        """Download video from Supabase Storage"""
        local_path = self.work_dir / "source_video.mp4"
        await self.supabase.download_video(video_url, str(local_path))
        return local_path
    
    async def extract_audio(self, video_path: Path) -> Path:
        """Extract audio from video using ffmpeg"""
        audio_path = self.work_dir / "original_audio.wav"
        
        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-vn",
            "-acodec", "pcm_s16le",
            "-ar", "16000",
            "-ac", "1",
            str(audio_path)
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await process.wait()
        
        if not audio_path.exists():
            raise Exception("Failed to extract audio from video")
        
        return audio_path
    
    async def run_speaker_diarization(
        self,
        audio_path: Path,
        language: str = "en",
        num_speakers: int = -1,
    ) -> List[Dict]:
        """Run speaker diarization using pyvideotrans"""
        try:
            from videotrans.diarization import get_diariz
            
            results = get_diariz(
                wave_filename=str(audio_path),
                language=language[:2],
                num_speakers=num_speakers,
                uuid=self.project_id
            )
            
            segments = []
            for item in results:
                timing, speaker = item
                segments.append({
                    "speaker": speaker,
                    "start_ms": timing[0],
                    "end_ms": timing[1],
                })
            
            return segments
            
        except Exception as e:
            logger.error(f"Speaker diarization failed: {e}")
            raise
    
    def get_speakers_summary(self, segments: List[Dict]) -> Dict[str, Dict]:
        """Summarize speaker statistics from segments"""
        speakers = {}
        
        for seg in segments:
            spk = seg["speaker"]
            if spk not in speakers:
                speakers[spk] = {
                    "label": spk,
                    "total_duration_ms": 0,
                    "segment_count": 0,
                    "segments": []
                }
            
            duration = seg["end_ms"] - seg["start_ms"]
            speakers[spk]["total_duration_ms"] += duration
            speakers[spk]["segment_count"] += 1
            speakers[spk]["segments"].append(seg)
        
        return speakers
    
    async def transcribe_segments(
        self,
        audio_path: Path,
        segments: List[Dict],
        language: str = "en",
    ) -> List[Dict]:
        """Transcribe each segment using Whisper"""
        try:
            from faster_whisper import WhisperModel
            import soundfile as sf
            
            model = WhisperModel(
                settings.WHISPER_MODEL,
                device="cuda" if settings.USE_CUDA else "cpu",
                compute_type="float16" if settings.USE_CUDA else "int8"
            )
            
            audio_data, sample_rate = sf.read(str(audio_path))
            transcribed = []
            
            for seg in segments:
                start_sample = int(seg["start_ms"] * sample_rate / 1000)
                end_sample = int(seg["end_ms"] * sample_rate / 1000)
                segment_audio = audio_data[start_sample:end_sample]
                
                result_segments, info = model.transcribe(
                    segment_audio,
                    language=language[:2],
                    task="transcribe"
                )
                
                text = " ".join([s.text for s in result_segments]).strip()
                
                transcribed.append({
                    **seg,
                    "text": text
                })
            
            return transcribed
            
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            raise
    
    async def translate_segments(
        self,
        segments: List[Dict],
        source_language: str,
        target_language: str,
    ) -> List[Dict]:
        """Translate text in each segment"""
        try:
            from videotrans.translator._google import trans
            
            translated = []
            
            for seg in segments:
                if seg.get("text"):
                    result = trans(
                        text=seg["text"],
                        source_code=source_language,
                        target_code=target_language
                    )
                    translated_text = result if result else seg["text"]
                else:
                    translated_text = ""
                
                translated.append({
                    **seg,
                    "translated_text": translated_text
                })
            
            return translated
            
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            raise
    
    async def generate_multi_voice_audio(
        self,
        segments: List[Dict],
        voice_mapping: Dict[str, str],
        target_language: str,
    ) -> List[Dict]:
        """Generate TTS audio for each segment using assigned voices"""
        from app.services.elevenlabs_service import ElevenLabsService
        
        elevenlabs = ElevenLabsService()
        audio_dir = self.work_dir / "segment_audio"
        audio_dir.mkdir(exist_ok=True)
        
        generated = []
        
        for i, seg in enumerate(segments):
            text = seg.get("translated_text") or seg.get("text", "")
            speaker = seg["speaker"]
            voice_id = voice_mapping.get(speaker)
            
            if text and voice_id:
                audio_path = audio_dir / f"seg_{i:04d}_{speaker}.mp3"
                
                success = await elevenlabs.generate_speech(
                    text=text,
                    voice_id=voice_id,
                    output_path=audio_path,
                    speed=1.0
                )
                
                if success:
                    generated.append({
                        **seg,
                        "audio_path": str(audio_path)
                    })
                else:
                    generated.append(seg)
            else:
                generated.append(seg)
        
        return generated
    
    async def mix_audio(
        self,
        video_path: Path,
        segments: List[Dict],
    ) -> Path:
        """Mix dubbed audio segments"""
        output_audio = self.work_dir / "mixed_audio.wav"
        
        # Get video duration
        duration_cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            str(video_path)
        ]
        
        process = await asyncio.create_subprocess_exec(
            *duration_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await process.communicate()
        total_duration = float(stdout.decode().strip())
        
        # Create silent base
        silence_cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi",
            "-i", f"anullsrc=channel_layout=stereo:sample_rate=44100",
            "-t", str(total_duration),
            str(output_audio)
        ]
        
        process = await asyncio.create_subprocess_exec(
            *silence_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await process.wait()
        
        # Overlay each segment
        temp_files = [output_audio]
        
        for i, seg in enumerate(segments):
            if not seg.get("audio_path"):
                continue
            
            temp_out = self.work_dir / f"temp_mix_{i}.wav"
            start_sec = seg["start_ms"] / 1000
            
            mix_cmd = [
                "ffmpeg", "-y",
                "-i", str(temp_files[-1]),
                "-i", seg["audio_path"],
                "-filter_complex",
                f"[1:a]adelay={int(start_sec*1000)}|{int(start_sec*1000)}[delayed];[0:a][delayed]amix=inputs=2:duration=first",
                str(temp_out)
            ]
            
            process = await asyncio.create_subprocess_exec(
                *mix_cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await process.wait()
            
            if temp_out.exists():
                temp_files.append(temp_out)
        
        if len(temp_files) > 1:
            final_audio = temp_files[-1]
            shutil.copy(final_audio, self.work_dir / "final_audio.wav")
            return self.work_dir / "final_audio.wav"
        
        return output_audio
    
    async def render_final_video(
        self,
        video_path: Path,
        audio_path: Path,
    ) -> Path:
        """Combine video with new audio"""
        output_path = self.work_dir / f"output_{self.project_id}.mp4"
        
        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-i", str(audio_path),
            "-c:v", "copy",
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-shortest",
            str(output_path)
        ]
        
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        await process.wait()
        
        if not output_path.exists():
            raise Exception("Failed to render final video")
        
        return output_path
    
    async def upload_result(self, local_path: Path) -> str:
        """Upload result video to Supabase Storage"""
        storage_path = f"{self.project_id}/output_{self.project_id}.mp4"
        url = await self.supabase.upload_video(str(local_path), storage_path)
        return url
    
    def cleanup(self):
        """Clean up temporary files"""
        if self.work_dir.exists():
            shutil.rmtree(self.work_dir)
    
    async def process_full_pipeline(
        self,
        video_url: str,
        source_language: str,
        target_language: str,
        voice_mapping: Dict[str, str],
        num_speakers: int = -1,
    ) -> str:
        """Run complete pipeline and return output URL"""
        
        async def update_status(status: str, progress: float, error: str = None):
            await self.supabase.update_project_status(
                self.project_id, status, progress, error
            )
        
        try:
            # Step 1: Download video
            await update_status("diarizing", 5)
            video_path = await self.download_source_video(video_url)
            
            # Step 2: Extract audio
            audio_path = await self.extract_audio(video_path)
            
            # Step 3: Speaker diarization
            await update_status("diarizing", 15)
            segments = await self.run_speaker_diarization(
                audio_path,
                language=source_language,
                num_speakers=num_speakers
            )
            
            # Step 4: Transcribe
            await update_status("transcribing", 30)
            segments = await self.transcribe_segments(
                audio_path,
                segments,
                language=source_language
            )
            
            # Step 5: Translate
            await update_status("translating", 50)
            segments = await self.translate_segments(
                segments,
                source_language,
                target_language
            )
            
            # Step 6: Generate TTS
            await update_status("dubbing", 65)
            segments = await self.generate_multi_voice_audio(
                segments,
                voice_mapping,
                target_language
            )
            
            # Step 7: Mix audio
            await update_status("mixing", 80)
            mixed_audio = await self.mix_audio(video_path, segments)
            
            # Step 8: Render
            await update_status("rendering", 90)
            output_path = await self.render_final_video(video_path, mixed_audio)
            
            # Step 9: Upload
            output_url = await self.upload_result(output_path)
            
            # Update project with output URL
            await self.supabase.update_project(self.project_id, {
                "output_video_url": output_url,
                "status": "completed",
                "progress": 100,
            })
            
            return output_url
            
        except Exception as e:
            logger.error(f"Pipeline failed: {e}")
            await update_status("failed", 0, str(e))
            raise
        
        finally:
            self.cleanup()
