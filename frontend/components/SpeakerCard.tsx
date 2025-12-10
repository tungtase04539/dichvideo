"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Clock, MessageSquare, ChevronDown, Check } from "lucide-react";
import { cn, formatDuration } from "@/lib/utils";
import type { Speaker, Voice } from "@/lib/api";

interface SpeakerCardProps {
  speaker: Speaker;
  voices: Voice[];
  selectedVoice?: string;
  onVoiceSelect: (speakerId: string, voiceId: string) => void;
  index: number;
}

export function SpeakerCard({
  speaker,
  voices,
  selectedVoice,
  onVoiceSelect,
  index,
}: SpeakerCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedVoiceData = voices.find((v) => v.voice_id === selectedVoice);

  // Speaker colors based on index
  const colors = [
    "from-primary-500 to-teal-400",
    "from-accent-500 to-pink-400",
    "from-blue-500 to-cyan-400",
    "from-orange-500 to-yellow-400",
    "from-green-500 to-emerald-400",
    "from-purple-500 to-violet-400",
  ];

  const color = colors[index % colors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="speaker-card gradient-border p-5"
    >
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={cn(
            "w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center flex-shrink-0",
            color
          )}
        >
          <User className="w-7 h-7 text-white" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-semibold text-white">
              {speaker.name || `Nhân vật ${index + 1}`}
            </h3>
            <span className="px-2 py-0.5 rounded-full text-xs bg-dark-700 text-dark-300">
              {speaker.label}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-dark-400 mb-4">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>{formatDuration(speaker.total_duration_ms)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{speaker.segment_count} đoạn</span>
            </div>
          </div>

          {/* Voice selector */}
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                selectedVoice
                  ? "bg-primary-500/10 border-primary-500/50 text-white"
                  : "bg-dark-800 border-dark-600 text-dark-400 hover:border-dark-500"
              )}
            >
              <div className="flex items-center gap-2">
                {selectedVoice && (
                  <Check className="w-4 h-4 text-primary-400" />
                )}
                <span>
                  {selectedVoiceData?.name || "Chọn giọng nói..."}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 transition-transform",
                  isOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown */}
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-10 w-full mt-2 py-2 bg-dark-800 border border-dark-600 rounded-xl shadow-xl max-h-60 overflow-y-auto"
              >
                {voices.map((voice) => (
                  <button
                    key={voice.voice_id}
                    onClick={() => {
                      onVoiceSelect(speaker.label, voice.voice_id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full px-4 py-2 text-left hover:bg-dark-700 transition-colors flex items-center justify-between",
                      selectedVoice === voice.voice_id && "bg-dark-700"
                    )}
                  >
                    <div>
                      <p className="text-white font-medium">{voice.name}</p>
                      <p className="text-xs text-dark-400">
                        {voice.labels?.gender || voice.category}
                      </p>
                    </div>
                    {selectedVoice === voice.voice_id && (
                      <Check className="w-4 h-4 text-primary-400" />
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

