"use client";

import { motion } from "motion/react";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  Film,
  Loader2,
  Mic,
  Play,
} from "lucide-react";
import type { DemoBeat } from "@/lib/pipeline/types";

/* ── Discovering ── */
interface DiscoveringDetailProps {
  pages: { url: string; title: string }[];
}

export const DiscoveringDetail = ({ pages }: DiscoveringDetailProps) => (
  <div className="space-y-2 pl-7">
    {pages.map((page, i) => (
      <motion.div
        key={page.url}
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          type: "spring",
          stiffness: 120,
          damping: 14,
          delay: i * 0.1,
        }}
        className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
      >
        <ExternalLink size={12} className="text-blue-400 shrink-0" />
        <span className="text-[13px] text-gray-300 truncate">
          {page.title || page.url}
        </span>
      </motion.div>
    ))}
  </div>
);

/* ── Understanding ── */
interface UnderstandingDetailProps {
  pages: { url: string; title: string }[];
  currentIndex: number;
}

export const UnderstandingDetail = ({
  pages,
  currentIndex,
}: UnderstandingDetailProps) => (
  <div className="space-y-1.5 pl-7">
    {pages.map((page, i) => {
      const done = i < currentIndex;
      const active = i === currentIndex;
      return (
        <motion.div
          key={page.url}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.08 }}
          className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg"
        >
          {done ? (
            <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
          ) : active ? (
            <Loader2
              size={12}
              className="animate-spin text-blue-400 shrink-0"
            />
          ) : (
            <FileText size={12} className="text-gray-600 shrink-0" />
          )}
          <span
            className={`text-[13px] truncate ${
              done
                ? "text-gray-500"
                : active
                ? "text-gray-200"
                : "text-gray-600"
            }`}
          >
            {page.title || page.url}
          </span>
        </motion.div>
      );
    })}
  </div>
);

/* ── Planning: beats appearing ── */
interface PlanningDetailProps {
  beats: DemoBeat[];
}

export const PlanningDetail = ({ beats }: PlanningDetailProps) => (
  <div className="space-y-1 pl-7">
    {beats.map((beat, i) => (
      <motion.div
        key={beat.id}
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{
          type: "spring",
          stiffness: 120,
          damping: 14,
          delay: i * 0.06,
        }}
        className="flex items-center gap-3 py-1.5 px-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
      >
        <span className="text-[10px] font-mono text-gray-600 w-5 text-right shrink-0">
          {i + 1}
        </span>
        <span className="text-[11px] font-mono uppercase tracking-wide text-gray-500 w-14 shrink-0">
          {beat.kind}
        </span>
        <span className="text-[13px] text-gray-300 truncate">{beat.label}</span>
      </motion.div>
    ))}
  </div>
);

/* ── Capturing: beat checklist ── */
interface CapturingDetailProps {
  beats: DemoBeat[];
  completedBeats: Set<string>;
}

export const CapturingDetail = ({
  beats,
  completedBeats,
}: CapturingDetailProps) => (
  <div className="space-y-1 pl-7">
    {beats.map((beat) => {
      const done = completedBeats.has(beat.id);
      return (
        <div
          key={beat.id}
          className="flex items-center gap-3 py-1.5 px-2.5 rounded-lg"
        >
          {done ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
            >
              <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
            </motion.div>
          ) : (
            <div className="w-3.5 h-3.5 rounded-[3px] border border-white/[0.08] bg-white/[0.02] shrink-0" />
          )}
          <span
            className={`text-[13px] truncate ${
              done ? "text-gray-500 line-through" : "text-gray-300"
            }`}
          >
            {beat.label}
          </span>
        </div>
      );
    })}
  </div>
);

/* ── Rendering: progress ── */
interface RenderingDetailProps {
  percent: number;
}

export const RenderingDetail = ({ percent }: RenderingDetailProps) => {
  // Map overall percent to render-local progress (rendering is ~70-85% range)
  const renderPercent = Math.min(100, Math.max(0, ((percent - 70) / 15) * 100));
  return (
    <div className="pl-7 space-y-2">
      <div className="flex items-center gap-2">
        <Play size={12} className="text-pink-400" />
        <span className="text-xs text-gray-400">Remotion cinematic render</span>
      </div>
      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-pink-500 to-pink-400"
          initial={{ width: 0 }}
          animate={{ width: `${renderPercent}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
};

/* ── Narrating: per-beat ── */
interface NarratingDetailProps {
  narrationScript: string[];
  narrationProgress: Set<string>;
  beats: DemoBeat[];
}

export const NarratingDetail = ({
  narrationScript,
  narrationProgress,
  beats,
}: NarratingDetailProps) => (
  <div className="space-y-2 pl-7">
    {narrationScript.map((line, i) => {
      const beatId = beats[i]?.id;
      const done = beatId ? narrationProgress.has(beatId) : false;
      return (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-start gap-2.5 py-1.5 px-2.5 rounded-lg"
        >
          {done ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 12 }}
              className="mt-0.5"
            >
              <Mic size={12} className="text-emerald-400 shrink-0" />
            </motion.div>
          ) : (
            <div className="w-3 h-3 mt-0.5 rounded-full border border-white/[0.08] bg-white/[0.02] shrink-0" />
          )}
          <p
            className={`text-[13px] leading-relaxed italic ${
              done ? "text-gray-500" : "text-gray-400"
            }`}
          >
            &ldquo;{line}&rdquo;
          </p>
        </motion.div>
      );
    })}
  </div>
);

/* ── Merging: simple progress ── */
interface MergingDetailProps {
  percent: number;
}

export const MergingDetail = ({ percent }: MergingDetailProps) => {
  const mergePercent = Math.min(100, Math.max(0, ((percent - 85) / 15) * 100));
  return (
    <div className="pl-7 space-y-2">
      <div className="flex items-center gap-2">
        <Film size={12} className="text-indigo-400" />
        <span className="text-xs text-gray-400">FFmpeg audio/video merge</span>
      </div>
      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
          initial={{ width: 0 }}
          animate={{ width: `${mergePercent}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
};
