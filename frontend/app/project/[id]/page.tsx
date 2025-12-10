"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Play,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  Volume2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { SpeakerCard } from "@/components/SpeakerCard";
import { ProgressTracker } from "@/components/ProgressTracker";
import {
  projectsApi,
  voicesApi,
  Project,
  Voice,
  ProjectStatus,
  statusLabels,
} from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voiceMapping, setVoiceMapping] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch project data
  const fetchProject = useCallback(async () => {
    try {
      const data = await projectsApi.get(projectId);
      setProject(data);

      // Initialize voice mapping from existing speakers
      const mapping: Record<string, string> = {};
      data.speakers.forEach((speaker) => {
        if (speaker.voice_id) {
          mapping[speaker.label] = speaker.voice_id;
        }
      });
      setVoiceMapping(mapping);

      return data;
    } catch (err) {
      setError("Không tìm thấy dự án");
      return null;
    }
  }, [projectId]);

  // Fetch voices
  const fetchVoices = useCallback(async () => {
    try {
      const data = await voicesApi.list();
      setVoices(data.voices);
    } catch (err) {
      console.error("Failed to fetch voices:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    Promise.all([fetchProject(), fetchVoices()]).then(() => {
      setIsLoading(false);
    });
  }, [fetchProject, fetchVoices]);

  // Poll for updates during processing
  useEffect(() => {
    if (!project) return;

    const processingStatuses: ProjectStatus[] = [
      "uploading",
      "diarizing",
      "transcribing",
      "translating",
      "dubbing",
      "mixing",
      "rendering",
    ];

    if (processingStatuses.includes(project.status)) {
      const interval = setInterval(fetchProject, 2000);
      return () => clearInterval(interval);
    }
  }, [project?.status, fetchProject]);

  // Handle voice selection
  const handleVoiceSelect = (speakerLabel: string, voiceId: string) => {
    setVoiceMapping((prev) => ({
      ...prev,
      [speakerLabel]: voiceId,
    }));
  };

  // Start speaker analysis
  const handleAnalyze = async () => {
    setIsProcessing(true);
    try {
      await projectsApi.analyze(projectId);
      await fetchProject();
    } catch (err) {
      setError("Phân tích thất bại");
    } finally {
      setIsProcessing(false);
    }
  };

  // Start full processing
  const handleProcess = async () => {
    if (Object.keys(voiceMapping).length !== project?.speakers.length) {
      setError("Vui lòng chọn giọng nói cho tất cả nhân vật");
      return;
    }

    setIsProcessing(true);
    try {
      await projectsApi.startProcessing(projectId, voiceMapping);
      await fetchProject();
    } catch (err) {
      setError("Xử lý thất bại");
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
      </main>
    );
  }

  if (error && !project) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">{error}</h1>
          <Link href="/" className="btn-primary mt-4 inline-block">
            Quay lại trang chủ
          </Link>
        </div>
      </main>
    );
  }

  if (!project) return null;

  const isVoiceMappingStep = project.status === "voice_mapping";
  const isCompleted = project.status === "completed";
  const isFailed = project.status === "failed";
  const isPending = project.status === "pending";
  const isProcessingStatus = [
    "diarizing",
    "transcribing",
    "translating",
    "dubbing",
    "mixing",
    "rendering",
  ].includes(project.status);

  return (
    <main className="min-h-screen pb-20">
      <Header />

      <div className="pt-28 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Back button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-dark-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại
          </Link>

          {/* Project header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-3xl font-display font-bold text-white mb-2">
                {project.name}
              </h1>
              <div className="flex items-center gap-4 text-dark-400">
                <span>
                  {project.original_language} → {project.target_language}
                </span>
                <span>•</span>
                <span
                  className={cn(
                    "flex items-center gap-1",
                    isCompleted && "text-green-400",
                    isFailed && "text-red-400",
                    isProcessingStatus && "text-primary-400"
                  )}
                >
                  {isProcessingStatus && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  {isCompleted && <CheckCircle className="w-4 h-4" />}
                  {isFailed && <XCircle className="w-4 h-4" />}
                  {statusLabels[project.status]}
                </span>
              </div>
            </div>

            {isCompleted && project.output_video_url && (
              <a
                href={project.output_video_url}
                download
                className="btn-primary flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Tải video
              </a>
            )}
          </div>

          {/* Progress tracker */}
          {!isPending && (
            <div className="gradient-border p-6 mb-8">
              <ProgressTracker
                status={project.status}
                progress={project.progress}
              />
            </div>
          )}

          {/* Error message */}
          {isFailed && project.error_message && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-8"
            >
              <p className="text-red-400">{project.error_message}</p>
            </motion.div>
          )}

          {/* Pending state - start analysis */}
          {isPending && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="gradient-border p-8 text-center"
            >
              <Volume2 className="w-16 h-16 text-primary-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-white mb-2">
                Sẵn sàng phân tích
              </h2>
              <p className="text-dark-400 mb-6">
                Bắt đầu phân tích để phát hiện số người nói trong video
              </p>
              <button
                onClick={handleAnalyze}
                disabled={isProcessing}
                className="btn-primary"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Đang phân tích...
                  </>
                ) : (
                  "Bắt đầu phân tích"
                )}
              </button>
            </motion.div>
          )}

          {/* Voice mapping step */}
          {isVoiceMappingStep && project.speakers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-white">
                  Gán giọng nói cho {project.num_speakers} nhân vật
                </h2>
                <span className="text-dark-400 text-sm">
                  {Object.keys(voiceMapping).length}/{project.speakers.length}{" "}
                  đã chọn
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                {project.speakers.map((speaker, index) => (
                  <SpeakerCard
                    key={speaker.id}
                    speaker={speaker}
                    voices={voices}
                    selectedVoice={voiceMapping[speaker.label]}
                    onVoiceSelect={handleVoiceSelect}
                    index={index}
                  />
                ))}
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleProcess}
                  disabled={
                    isProcessing ||
                    Object.keys(voiceMapping).length !== project.speakers.length
                  }
                  className="btn-primary flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Bắt đầu dịch & lồng tiếng
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* Completed - video preview */}
          {isCompleted && project.output_video_url && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="gradient-border p-6"
            >
              <h2 className="text-xl font-semibold text-white mb-4">
                Video đã hoàn thành
              </h2>
              <div className="aspect-video rounded-xl overflow-hidden bg-dark-800">
                <video
                  src={project.output_video_url}
                  controls
                  className="w-full h-full"
                />
              </div>
            </motion.div>
          )}

          {/* Processing status */}
          {isProcessingStatus && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="gradient-border p-8 text-center"
            >
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full bg-primary-500/20" />
                <Loader2 className="w-full h-full text-primary-400 animate-spin p-4" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Đang xử lý...
              </h2>
              <p className="text-dark-400">
                {statusLabels[project.status]} - {project.progress.toFixed(0)}%
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}

