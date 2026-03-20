"use client";

import { motion } from "motion/react";
import {
  Search,
  FileText,
  Brain,
  Video,
  Sparkles,
  Mic,
  Film,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import type { PipelineStage } from "@/lib/pipeline/types";

const STAGES: {
  key: PipelineStage;
  icon: React.ElementType;
  label: string;
  desc: string;
  color: string;
}[] = [
  { key: "discovering", icon: Search, label: "Discover", desc: "Finding relevant pages", color: "#3B82F6" },
  { key: "understanding", icon: FileText, label: "Understand", desc: "Scraping page content", color: "#3B82F6" },
  { key: "planning", icon: Brain, label: "Plan", desc: "Generating demo beats", color: "#8B5CF6" },
  { key: "capturing", icon: Video, label: "Capture", desc: "Recording browser actions", color: "#F59E0B" },
  { key: "rendering", icon: Sparkles, label: "Render", desc: "Cinematic post-production", color: "#EC4899" },
  { key: "narrating", icon: Mic, label: "Narrate", desc: "Generating voiceover", color: "#10B981" },
  { key: "merging", icon: Film, label: "Merge", desc: "Final audio/video mix", color: "#6366F1" },
];

const STAGE_ORDER: PipelineStage[] = STAGES.map((s) => s.key);

const getStatus = (
  stageKey: PipelineStage,
  currentStage: PipelineStage
): "done" | "active" | "upcoming" => {
  if (currentStage === "complete") return "done";
  const currentIdx = STAGE_ORDER.indexOf(currentStage);
  const stageIdx = STAGE_ORDER.indexOf(stageKey);
  if (currentIdx === -1) return stageIdx === 0 ? "active" : "upcoming";
  if (stageIdx < currentIdx) return "done";
  if (stageIdx === currentIdx) return "active";
  return "upcoming";
};

interface StageTimelineProps {
  currentStage: PipelineStage;
}

export const StageTimeline = ({ currentStage }: StageTimelineProps) => (
  <div className="flex flex-col items-center py-10 px-8 h-full justify-center relative">
    {/* Ambient glow behind the active node */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div
        className="w-[280px] h-[280px] rounded-full opacity-[0.04] blur-[80px]"
        style={{
          background: STAGES.find((s) => s.key === currentStage)?.color ?? "#3B82F6",
        }}
      />
    </div>

    <div className="relative">
      {STAGES.map((stage, i) => {
        const status = getStatus(stage.key, currentStage);
        const Icon = stage.icon;
        const isLast = i === STAGES.length - 1;

        return (
          <div key={stage.key} className="flex items-start gap-5">
            {/* Node + connector */}
            <div className="flex flex-col items-center">
              <motion.div
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all relative ${
                  status === "active"
                    ? "border-white/[0.15] bg-white/[0.06]"
                    : status === "done"
                    ? "border-emerald-500/20 bg-emerald-500/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
                animate={
                  status === "active"
                    ? { scale: [1, 1.06, 1] }
                    : { scale: 1 }
                }
                transition={
                  status === "active"
                    ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
                    : {}
                }
              >
                {/* Active glow ring */}
                {status === "active" && (
                  <motion.div
                    className="absolute inset-0 rounded-xl"
                    style={{
                      boxShadow: `0 0 20px 4px ${stage.color}20, inset 0 0 12px ${stage.color}08`,
                    }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                {status === "active" ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                    style={{ color: stage.color }}
                  />
                ) : status === "done" ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 12 }}
                  >
                    <CheckCircle2 size={16} className="text-emerald-400" />
                  </motion.div>
                ) : (
                  <Icon size={16} className="text-gray-600" />
                )}
              </motion.div>
              {/* Connector line */}
              {!isLast && (
                <div className="relative w-0.5 h-7 bg-white/[0.04] my-1.5">
                  {status === "done" && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ background: "linear-gradient(to bottom, #10B98140, #10B98120)", transformOrigin: "top" }}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.4 }}
                    />
                  )}
                  {status === "active" && (
                    <motion.div
                      className="absolute inset-0 rounded-full overflow-hidden"
                      style={{ transformOrigin: "top" }}
                    >
                      <motion.div
                        className="w-full h-full"
                        style={{ background: `linear-gradient(to bottom, ${stage.color}40, transparent)` }}
                        animate={{ y: ["-100%", "100%"] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* Label + description */}
            <div className="pt-1.5 pb-2">
              <span
                className={`text-sm font-medium block ${
                  status === "active"
                    ? "text-gray-100"
                    : status === "done"
                    ? "text-gray-500"
                    : "text-gray-600"
                }`}
              >
                {stage.label}
              </span>
              <span
                className={`text-[11px] block mt-0.5 ${
                  status === "active"
                    ? "text-gray-400"
                    : "text-gray-700"
                }`}
              >
                {stage.desc}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
