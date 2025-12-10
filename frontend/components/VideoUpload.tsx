"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Film, X, CheckCircle, Loader2 } from "lucide-react";
import { cn, formatFileSize } from "@/lib/utils";

interface VideoUploadProps {
  onUpload: (file: File) => void;
  isUploading?: boolean;
  uploadProgress?: number;
}

export function VideoUpload({
  onUpload,
  isUploading = false,
  uploadProgress = 0,
}: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const videoFile = acceptedFiles[0];
      if (videoFile) {
        setFile(videoFile);
        setPreview(URL.createObjectURL(videoFile));
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "video/*": [".mp4", ".mov", ".avi", ".mkv", ".webm"],
    },
    maxFiles: 1,
    disabled: isUploading,
  });

  const handleUpload = () => {
    if (file) {
      onUpload(file);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setPreview(null);
  };

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div
            key="dropzone"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div
              {...getRootProps()}
              className={cn(
                "dropzone relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300",
                isDragActive
                  ? "border-primary-400 bg-primary-500/10"
                  : "border-dark-600 hover:border-primary-500/50 hover:bg-dark-800/50"
              )}
            >
              <input {...getInputProps()} />

              <motion.div
                animate={{ y: isDragActive ? -10 : 0 }}
                className="flex flex-col items-center gap-4"
              >
                <div
                  className={cn(
                    "w-20 h-20 rounded-2xl flex items-center justify-center transition-colors",
                    isDragActive
                      ? "bg-primary-500/20 text-primary-400"
                      : "bg-dark-700 text-dark-400"
                  )}
                >
                  <Upload className="w-10 h-10" />
                </div>

                <div>
                  <p className="text-lg font-medium text-white mb-1">
                    {isDragActive
                      ? "Thả video tại đây..."
                      : "Kéo thả video hoặc click để chọn"}
                  </p>
                  <p className="text-sm text-dark-400">
                    Hỗ trợ MP4, MOV, AVI, MKV, WebM • Tối đa 500MB
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="gradient-border p-6"
          >
            <div className="flex gap-6">
              {/* Video preview */}
              <div className="relative w-80 aspect-video rounded-xl overflow-hidden bg-dark-800">
                {preview && (
                  <video
                    src={preview}
                    className="w-full h-full object-cover"
                    controls={false}
                    muted
                    autoPlay
                    loop
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 to-transparent" />
                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <Film className="w-4 h-4 text-primary-400" />
                  <span className="text-sm text-white font-medium">
                    Video Preview
                  </span>
                </div>
              </div>

              {/* File info */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2 truncate">
                    {file.name}
                  </h3>
                  <p className="text-dark-400 text-sm mb-4">
                    {formatFileSize(file.size)}
                  </p>

                  {isUploading && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-dark-400">Đang tải lên...</span>
                        <span className="text-primary-400">
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full progress-bar"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  {!isUploading && (
                    <>
                      <button
                        onClick={handleRemove}
                        className="btn-secondary flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Xóa
                      </button>
                      <button
                        onClick={handleUpload}
                        className="btn-primary flex items-center gap-2 flex-1 justify-center"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Tiếp tục
                      </button>
                    </>
                  )}
                  {isUploading && (
                    <button
                      disabled
                      className="btn-primary flex items-center gap-2 flex-1 justify-center opacity-70"
                    >
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang xử lý...
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

