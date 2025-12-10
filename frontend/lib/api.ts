import { supabase, uploadVideo, STORAGE_BUCKET } from "./supabase";
import type { Database, ProjectStatus } from "./database.types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Speaker = Database["public"]["Tables"]["speakers"]["Row"];

// Processing server URL (Railway/Render)
const PROCESSING_SERVER_URL = process.env.NEXT_PUBLIC_PROCESSING_SERVER_URL || "http://localhost:8000";

export interface ProjectWithSpeakers extends Project {
  speakers: Speaker[];
}

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url?: string;
}

export interface Language {
  code: string;
  name: string;
  native_name: string;
}

// ============ Project API ============

export const projectsApi = {
  async list(page = 1, pageSize = 20) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from("projects")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      items: data || [],
      total: count || 0,
      page,
      page_size: pageSize,
    };
  },

  async get(id: string): Promise<ProjectWithSpeakers> {
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (projectError) throw projectError;

    const { data: speakers, error: speakersError } = await supabase
      .from("speakers")
      .select("*")
      .eq("project_id", id)
      .order("speaker_label");

    if (speakersError) throw speakersError;

    return {
      ...project,
      speakers: speakers || [],
    };
  },

  async create(data: {
    name: string;
    original_language: string;
    target_language: string;
    num_speakers: number;
    video: File;
  }): Promise<Project> {
    // 1. Create project record
    const { data: project, error: createError } = await supabase
      .from("projects")
      .insert({
        name: data.name,
        original_language: data.original_language,
        target_language: data.target_language,
        num_speakers: data.num_speakers,
        status: "uploading" as ProjectStatus,
      })
      .select()
      .single();

    if (createError) throw createError;

    try {
      // 2. Upload video to Supabase Storage
      const videoUrl = await uploadVideo(data.video, project.id);

      // 3. Update project with video URL
      const { data: updated, error: updateError } = await supabase
        .from("projects")
        .update({
          original_video_url: videoUrl,
          status: "pending" as ProjectStatus,
        })
        .eq("id", project.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return updated;
    } catch (error) {
      // Cleanup on error
      await supabase.from("projects").delete().eq("id", project.id);
      throw error;
    }
  },

  async delete(id: string) {
    // Delete from storage first
    const { data: project } = await supabase
      .from("projects")
      .select("original_video_url, output_video_url")
      .eq("id", id)
      .single();

    if (project) {
      // Delete video files from storage
      const filesToDelete: string[] = [];
      if (project.original_video_url) {
        const path = project.original_video_url.split(`${STORAGE_BUCKET}/`)[1];
        if (path) filesToDelete.push(path);
      }
      if (project.output_video_url) {
        const path = project.output_video_url.split(`${STORAGE_BUCKET}/`)[1];
        if (path) filesToDelete.push(path);
      }

      if (filesToDelete.length > 0) {
        await supabase.storage.from(STORAGE_BUCKET).remove(filesToDelete);
      }
    }

    // Delete project (cascades to speakers/segments)
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) throw error;
  },

  async analyze(id: string) {
    // Call processing server to start analysis
    const response = await fetch(`${PROCESSING_SERVER_URL}/api/projects/${id}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Failed to start analysis");
    }

    return response.json();
  },

  async assignVoices(id: string, mappings: Record<string, string>) {
    // Update voice mapping in Supabase
    const { error: projectError } = await supabase
      .from("projects")
      .update({ voice_mapping: mappings })
      .eq("id", id);

    if (projectError) throw projectError;

    // Update individual speakers
    for (const [label, voiceId] of Object.entries(mappings)) {
      await supabase
        .from("speakers")
        .update({ elevenlabs_voice_id: voiceId })
        .eq("project_id", id)
        .eq("speaker_label", label);
    }

    return { status: "updated", mappings };
  },

  async startProcessing(id: string, voiceMapping: Record<string, string>) {
    // Update voice mapping first
    await this.assignVoices(id, voiceMapping);

    // Call processing server
    const response = await fetch(`${PROCESSING_SERVER_URL}/api/projects/${id}/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voice_mapping: voiceMapping }),
    });

    if (!response.ok) {
      throw new Error("Failed to start processing");
    }

    return response.json();
  },

  async getStatus(id: string) {
    const { data, error } = await supabase
      .from("projects")
      .select("status, progress, error_message")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  },

  // Subscribe to realtime updates
  subscribeToProject(id: string, callback: (project: Project) => void) {
    return supabase
      .channel(`project:${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "projects",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          callback(payload.new as Project);
        }
      )
      .subscribe();
  },
};

// ============ Voices API ============

export const voicesApi = {
  async list(): Promise<{ voices: Voice[] }> {
    // Call processing server for ElevenLabs voices
    try {
      const response = await fetch(`${PROCESSING_SERVER_URL}/api/voices/`);
      if (response.ok) {
        return response.json();
      }
    } catch (e) {
      console.error("Failed to fetch voices from server:", e);
    }

    // Fallback to default voices
    return {
      voices: [
        { voice_id: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", category: "premade", labels: { gender: "female" } },
        { voice_id: "AZnzlk1XvdvUeBnXmlld", name: "Domi", category: "premade", labels: { gender: "female" } },
        { voice_id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", category: "premade", labels: { gender: "female" } },
        { voice_id: "ErXwobaYiN019PkySvjV", name: "Antoni", category: "premade", labels: { gender: "male" } },
        { voice_id: "MF3mGyEYCl7XYWbV9V6O", name: "Elli", category: "premade", labels: { gender: "female" } },
        { voice_id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", category: "premade", labels: { gender: "male" } },
        { voice_id: "VR6AewLTigWG4xSOukaG", name: "Arnold", category: "premade", labels: { gender: "male" } },
        { voice_id: "pNInz6obpgDQGcFmaJgB", name: "Adam", category: "premade", labels: { gender: "male" } },
        { voice_id: "yoZ06aMxZJJ28mfd3POQ", name: "Sam", category: "premade", labels: { gender: "male" } },
      ],
    };
  },
};

// ============ Languages API ============

export const languagesApi = {
  async list(): Promise<Language[]> {
    return [
      { code: "vi", name: "Vietnamese", native_name: "Tiếng Việt" },
      { code: "en", name: "English", native_name: "English" },
      { code: "zh-cn", name: "Chinese (Simplified)", native_name: "简体中文" },
      { code: "zh-tw", name: "Chinese (Traditional)", native_name: "繁體中文" },
      { code: "ja", name: "Japanese", native_name: "日本語" },
      { code: "ko", name: "Korean", native_name: "한국어" },
      { code: "fr", name: "French", native_name: "Français" },
      { code: "de", name: "German", native_name: "Deutsch" },
      { code: "es", name: "Spanish", native_name: "Español" },
      { code: "pt", name: "Portuguese", native_name: "Português" },
      { code: "ru", name: "Russian", native_name: "Русский" },
      { code: "th", name: "Thai", native_name: "ไทย" },
      { code: "id", name: "Indonesian", native_name: "Bahasa Indonesia" },
      { code: "it", name: "Italian", native_name: "Italiano" },
      { code: "ar", name: "Arabic", native_name: "العربية" },
      { code: "hi", name: "Hindi", native_name: "हिन्दी" },
      { code: "tr", name: "Turkish", native_name: "Türkçe" },
    ];
  },
};

// ============ Status Helpers ============

export const statusLabels: Record<ProjectStatus, string> = {
  pending: "Chờ xử lý",
  uploading: "Đang tải lên",
  diarizing: "Phân tích giọng nói",
  transcribing: "Chuyển đổi văn bản",
  translating: "Đang dịch",
  voice_mapping: "Chọn giọng nói",
  dubbing: "Tạo giọng mới",
  mixing: "Trộn âm thanh",
  rendering: "Xuất video",
  completed: "Hoàn thành",
  failed: "Lỗi",
};

export const statusColors: Record<ProjectStatus, string> = {
  pending: "text-dark-400",
  uploading: "text-blue-400",
  diarizing: "text-yellow-400",
  transcribing: "text-yellow-400",
  translating: "text-yellow-400",
  voice_mapping: "text-primary-400",
  dubbing: "text-accent-400",
  mixing: "text-accent-400",
  rendering: "text-accent-400",
  completed: "text-green-400",
  failed: "text-red-400",
};
