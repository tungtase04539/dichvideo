"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Sparkles,
  Users,
  Languages,
  Zap,
  ArrowRight,
  Volume2,
} from "lucide-react";
import { Header } from "@/components/Header";
import { VideoUpload } from "@/components/VideoUpload";
import { projectsApi, languagesApi, Language } from "@/lib/api";

export default function Home() {
  const router = useRouter();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    name: "",
    original_language: "en",
    target_language: "vi",
    num_speakers: -1,
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [step, setStep] = useState<"upload" | "config">("upload");

  useEffect(() => {
    languagesApi.list().then(setLanguages).catch(console.error);
  }, []);

  const handleVideoSelect = (file: File) => {
    setVideoFile(file);
    setFormData((prev) => ({
      ...prev,
      name: file.name.replace(/\.[^/.]+$/, ""),
    }));
    setStep("config");
  };

  const handleSubmit = async () => {
    if (!videoFile) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const data = new FormData();
      data.append("video", videoFile);
      data.append("name", formData.name);
      data.append("original_language", formData.original_language);
      data.append("target_language", formData.target_language);
      data.append("num_speakers", String(formData.num_speakers));

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const project = await projectsApi.create(data);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Navigate to project page
      router.push(`/project/${project.id}`);
    } catch (error) {
      console.error("Upload failed:", error);
      setIsUploading(false);
    }
  };

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-400 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Powered by AI & PyVideoTrans
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-display text-5xl md:text-6xl font-bold mb-6"
          >
            <span className="text-white">Dịch video với</span>
            <br />
            <span className="gradient-text">nhiều giọng nói thông minh</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-dark-300 mb-12 max-w-2xl mx-auto"
          >
            Tự động phát hiện nhiều nhân vật trong video, gán giọng nói riêng
            cho từng người, và đồng bộ âm thanh hoàn hảo.
          </motion.p>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-6 mb-16"
          >
            {[
              {
                icon: Users,
                title: "Multi-Speaker",
                desc: "Nhận diện nhiều người nói",
              },
              {
                icon: Languages,
                title: "17+ Ngôn ngữ",
                desc: "Dịch sang đa ngôn ngữ",
              },
              {
                icon: Volume2,
                title: "ElevenLabs TTS",
                desc: "Giọng nói chất lượng cao",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-dark-800/50 border border-dark-700"
              >
                <feature.icon className="w-8 h-8 text-primary-400 mb-3" />
                <h3 className="font-semibold text-white mb-1">
                  {feature.title}
                </h3>
                <p className="text-sm text-dark-400">{feature.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Upload Section */}
      <section className="pb-32 px-6">
        <div className="max-w-3xl mx-auto">
          {step === "upload" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <VideoUpload
                onUpload={handleVideoSelect}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
              />
            </motion.div>
          )}

          {step === "config" && videoFile && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="gradient-border p-8"
            >
              <h2 className="text-2xl font-display font-bold text-white mb-6">
                Cấu hình dự án
              </h2>

              <div className="space-y-6">
                {/* Project name */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Tên dự án
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="input w-full"
                    placeholder="Nhập tên dự án..."
                  />
                </div>

                {/* Languages */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Ngôn ngữ gốc
                    </label>
                    <select
                      value={formData.original_language}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          original_language: e.target.value,
                        }))
                      }
                      className="select w-full"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.native_name} ({lang.name})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-2">
                      Dịch sang
                    </label>
                    <select
                      value={formData.target_language}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          target_language: e.target.value,
                        }))
                      }
                      className="select w-full"
                    >
                      {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                          {lang.native_name} ({lang.name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Number of speakers */}
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Số người nói
                  </label>
                  <select
                    value={formData.num_speakers}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        num_speakers: parseInt(e.target.value),
                      }))
                    }
                    className="select w-full"
                  >
                    <option value={-1}>Tự động phát hiện</option>
                    <option value={1}>1 người</option>
                    <option value={2}>2 người</option>
                    <option value={3}>3 người</option>
                    <option value={4}>4 người</option>
                    <option value={5}>5 người</option>
                    <option value={6}>6+ người</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => {
                      setStep("upload");
                      setVideoFile(null);
                    }}
                    className="btn-secondary"
                  >
                    Quay lại
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isUploading || !formData.name}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <Zap className="w-4 h-4 animate-pulse" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        Bắt đầu phân tích
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </section>
    </main>
  );
}

