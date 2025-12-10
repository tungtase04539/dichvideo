export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ProjectStatus =
  | "pending"
  | "uploading"
  | "diarizing"
  | "transcribing"
  | "translating"
  | "voice_mapping"
  | "dubbing"
  | "mixing"
  | "rendering"
  | "completed"
  | "failed";

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          name: string;
          user_id: string | null;
          original_video_url: string | null;
          original_language: string;
          target_language: string;
          num_speakers: number;
          status: ProjectStatus;
          progress: number;
          error_message: string | null;
          output_video_url: string | null;
          voice_mapping: Json | null;
          processing_server_task_id: string | null;
          created_at: string;
          updated_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          user_id?: string | null;
          original_video_url?: string | null;
          original_language?: string;
          target_language?: string;
          num_speakers?: number;
          status?: ProjectStatus;
          progress?: number;
          error_message?: string | null;
          output_video_url?: string | null;
          voice_mapping?: Json | null;
          processing_server_task_id?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          user_id?: string | null;
          original_video_url?: string | null;
          original_language?: string;
          target_language?: string;
          num_speakers?: number;
          status?: ProjectStatus;
          progress?: number;
          error_message?: string | null;
          output_video_url?: string | null;
          voice_mapping?: Json | null;
          processing_server_task_id?: string | null;
          created_at?: string;
          updated_at?: string;
          completed_at?: string | null;
        };
      };
      speakers: {
        Row: {
          id: string;
          project_id: string;
          speaker_label: string;
          name: string | null;
          elevenlabs_voice_id: string | null;
          elevenlabs_voice_name: string | null;
          total_duration_ms: number;
          segment_count: number;
          sample_audio_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          speaker_label: string;
          name?: string | null;
          elevenlabs_voice_id?: string | null;
          elevenlabs_voice_name?: string | null;
          total_duration_ms?: number;
          segment_count?: number;
          sample_audio_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          speaker_label?: string;
          name?: string | null;
          elevenlabs_voice_id?: string | null;
          elevenlabs_voice_name?: string | null;
          total_duration_ms?: number;
          segment_count?: number;
          sample_audio_url?: string | null;
          created_at?: string;
        };
      };
      segments: {
        Row: {
          id: string;
          project_id: string;
          speaker_id: string | null;
          start_ms: number;
          end_ms: number;
          original_text: string | null;
          translated_text: string | null;
          dubbed_audio_url: string | null;
          sequence: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          speaker_id?: string | null;
          start_ms: number;
          end_ms: number;
          original_text?: string | null;
          translated_text?: string | null;
          dubbed_audio_url?: string | null;
          sequence: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          speaker_id?: string | null;
          start_ms?: number;
          end_ms?: number;
          original_text?: string | null;
          translated_text?: string | null;
          dubbed_audio_url?: string | null;
          sequence?: number;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {
      project_status: ProjectStatus;
    };
  };
}

