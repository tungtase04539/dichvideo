"use client";

import { motion } from "framer-motion";
import {
  Upload,
  Users,
  FileText,
  Languages,
  Mic,
  Music,
  Film,
  CheckCircle,
  Loader2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/api";

interface ProgressTrackerProps {
  status: ProjectStatus;
  progress: number;
}

const steps = [
  { key: "uploading", label: "Tải lên", icon: Upload },
  { key: "diarizing", label: "Phân tích", icon: Users },
  { key: "transcribing", label: "Chuyển văn bản", icon: FileText },
  { key: "translating", label: "Dịch", icon: Languages },
  { key: "dubbing", label: "Tạo giọng", icon: Mic },
  { key: "mixing", label: "Trộn audio", icon: Music },
  { key: "rendering", label: "Xuất video", icon: Film },
  { key: "completed", label: "Hoàn thành", icon: CheckCircle },
];

const statusOrder: ProjectStatus[] = [
  "pending",
  "uploading",
  "diarizing",
  "transcribing",
  "translating",
  "voice_mapping",
  "dubbing",
  "mixing",
  "rendering",
  "completed",
];

export function ProgressTracker({ status, progress }: ProgressTrackerProps) {
  const currentIndex = statusOrder.indexOf(status);
  const isFailed = status === "failed";

  return (
    <div className="w-full">
      {/* Progress bar */}
      <div className="relative mb-8">
        <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full",
              isFailed ? "bg-red-500" : "progress-bar"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <div className="absolute right-0 top-4 text-sm">
          <span className={cn(
            "font-mono font-medium",
            isFailed ? "text-red-400" : "text-primary-400"
          )}>
            {progress.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Steps */}
      <div className="flex justify-between">
        {steps.map((step, index) => {
          const stepIndex = statusOrder.indexOf(step.key as ProjectStatus);
          const isActive = status === step.key;
          const isCompleted = stepIndex < currentIndex && !isFailed;
          const isPending = stepIndex > currentIndex;

          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className="flex flex-col items-center gap-2"
            >
              <motion.div
                initial={false}
                animate={{
                  scale: isActive ? 1.1 : 1,
                }}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative",
                  isCompleted && "bg-primary-500 text-white",
                  isActive && !isFailed && "bg-primary-500/20 text-primary-400",
                  isActive && isFailed && "bg-red-500/20 text-red-400",
                  isPending && "bg-dark-700 text-dark-500"
                )}
              >
                {isActive && !isFailed && status !== "completed" && (
                  <div className="absolute inset-0 rounded-xl">
                    <Loader2 className="w-full h-full p-2 animate-spin text-primary-400" />
                  </div>
                )}
                {isActive && isFailed && (
                  <XCircle className="w-5 h-5" />
                )}
                {!isActive && <Icon className="w-5 h-5" />}
                {isActive && !isFailed && <Icon className="w-5 h-5" />}
              </motion.div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isCompleted && "text-primary-400",
                  isActive && !isFailed && "text-white",
                  isActive && isFailed && "text-red-400",
                  isPending && "text-dark-500"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

