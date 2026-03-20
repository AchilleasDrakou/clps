"use client";

import { useRef, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  FileText,
  Brain,
  Video,
  Sparkles,
  Mic,
  Film,
  Play,
  Monitor,
  Globe,
  CheckCircle2,
  Loader2,
  FolderOpen,
} from "lucide-react";
import type { DemoBeat, PipelineStage } from "@/lib/pipeline/types";

/* ── Types ── */

interface FileOp {
  type: "write" | "read";
  path: string;
  sizeKb?: number;
}

interface LiveWorkspaceProps {
  currentStage: string;
  // Discovery
  searchQuery?: string;
  discoveredPages: { url: string; title: string; favicon?: string }[];
  // Understanding
  scrapeProgress: { url: string; title: string; charCount: number; tokenEstimate: number }[];
  // Planning
  beats: DemoBeat[];
  // Capture
  currentAction?: { index: number; total: number; type: string; selector?: string; text?: string };
  screenshots: { url: string; actionIndex: number }[];
  liveViewUrl: string | null;
  // Progress
  percent: number;
  // Narration
  narrationScript: string[];
  narrationProgress: Set<string>;
  beatsRef: DemoBeat[];
  // File ops
  fileOps: FileOp[];
  // Complete
  finalVideoPath: string | null;
  elapsed: number;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/* ── Stage Views ── */

function DiscoveringView({ searchQuery, pages }: { searchQuery?: string; pages: { url: string; title: string }[] }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      {/* Search query */}
      {searchQuery && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="mb-8 flex items-center gap-3 px-5 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] max-w-lg w-full"
        >
          <Search size={14} className="text-blue-400 shrink-0" />
          <span className="text-sm text-gray-300 font-mono truncate">{searchQuery}</span>
          <Loader2 size={14} className="animate-spin text-blue-400 shrink-0 ml-auto" />
        </motion.div>
      )}

      {/* Page results */}
      <div className="space-y-3 w-full max-w-lg">
        {pages.map((page, i) => (
          <motion.div
            key={page.url}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 14, delay: i * 0.12 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
          >
            <Globe size={14} className="text-blue-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-gray-200 truncate">{page.title || page.url}</p>
              <p className="text-[11px] text-gray-600 truncate">{page.url}</p>
            </div>
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
          </motion.div>
        ))}
        {pages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 py-12"
          >
            <Loader2 size={16} className="animate-spin text-blue-400" />
            <span className="text-sm text-gray-500">Searching for relevant pages...</span>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function UnderstandingView({ pages, scrapeProgress }: { pages: { url: string; title: string }[]; scrapeProgress: { url: string; charCount: number; tokenEstimate: number }[] }) {
  const scraped = new Set(scrapeProgress.map((s) => s.url));

  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="space-y-3 w-full max-w-lg">
        {pages.map((page, i) => {
          const progress = scrapeProgress.find((s) => s.url === page.url);
          const isDone = scraped.has(page.url);

          return (
            <motion.div
              key={page.url}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, ease: EASE }}
              className="px-4 py-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
            >
              <div className="flex items-center gap-3">
                {isDone ? (
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                ) : (
                  <Loader2 size={14} className="animate-spin text-blue-400 shrink-0" />
                )}
                <span className="text-sm text-gray-200 truncate flex-1">{page.title || page.url}</span>
                {progress && (
                  <span className="text-[10px] text-gray-600 font-mono shrink-0">
                    ~{progress.tokenEstimate.toLocaleString()} tokens
                  </span>
                )}
              </div>
              {/* Content preview bar */}
              {progress && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="mt-2 h-1 rounded-full bg-gradient-to-r from-blue-500/30 to-blue-500/10"
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PlanningView({ beats }: { beats: DemoBeat[] }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="w-full max-w-lg">
        {beats.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center gap-2 py-12">
            <Loader2 size={16} className="animate-spin text-purple-400" />
            <span className="text-sm text-gray-500">Generating demo storyboard...</span>
          </motion.div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-4">Storyboard</p>
            {beats.map((beat, i) => (
              <motion.div
                key={beat.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 120, damping: 14, delay: i * 0.06 }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05]"
              >
                <span className="text-[10px] font-mono text-gray-600 w-5 text-right shrink-0">{i + 1}</span>
                <span className="text-[10px] font-mono uppercase tracking-wide text-purple-400/80 w-14 shrink-0">{beat.kind}</span>
                <span className="text-[13px] text-gray-300 truncate flex-1">{beat.label}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CapturingView({
  liveViewUrl,
  currentAction,
  screenshots,
}: {
  liveViewUrl: string | null;
  currentAction?: { index: number; total: number; type: string; selector?: string; text?: string };
  screenshots: { url: string; actionIndex: number }[];
}) {
  const filmstripRef = useRef<HTMLDivElement>(null);

  // Auto-scroll filmstrip to latest screenshot
  useEffect(() => {
    if (filmstripRef.current) {
      filmstripRef.current.scrollLeft = filmstripRef.current.scrollWidth;
    }
  }, [screenshots.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Browser view */}
      <div className="flex-1 relative bg-[#050506]">
        {liveViewUrl ? (
          <iframe src={liveViewUrl} className="w-full h-full" sandbox="allow-scripts allow-same-origin" title="Live browser" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="animate-spin text-amber-400" />
            <span className="text-sm text-gray-500 ml-3">Launching browser...</span>
          </div>
        )}

        {/* Action overlay */}
        {currentAction && (
          <motion.div
            key={currentAction.index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute bottom-3 left-3 right-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-black/70 backdrop-blur-sm border border-white/[0.08]"
          >
            <Video size={12} className="text-amber-400 shrink-0" />
            <span className="text-[11px] text-gray-300 truncate">
              <span className="text-amber-400 font-medium">{currentAction.type}</span>
              {currentAction.selector && <span className="text-gray-500 ml-1.5 font-mono">{currentAction.selector}</span>}
              {currentAction.text && <span className="text-gray-400 ml-1.5">"{currentAction.text}"</span>}
            </span>
            <span className="text-[10px] text-gray-600 ml-auto shrink-0 font-mono">
              {currentAction.index + 1}/{currentAction.total}
            </span>
          </motion.div>
        )}
      </div>

      {/* Screenshot filmstrip */}
      {screenshots.length > 0 && (
        <div
          ref={filmstripRef}
          className="flex gap-2 px-3 py-2 overflow-x-auto scrollbar-thin border-t border-white/[0.06] bg-[#0a0a0d]"
        >
          {screenshots.map((ss, i) => (
            <motion.div
              key={ss.actionIndex}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 16 }}
              className="shrink-0"
            >
              <img
                src={ss.url}
                alt={`Action ${ss.actionIndex + 1}`}
                className="h-16 w-auto rounded-md border border-white/[0.06] object-cover"
                loading="lazy"
              />
              <p className="text-[9px] text-gray-600 text-center mt-0.5">{ss.actionIndex + 1}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function RenderingView({ percent }: { percent: number }) {
  const renderPercent = Math.min(100, Math.max(0, ((percent - 65) / 27) * 100));
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <Sparkles size={24} className="text-pink-400 mb-4" />
      <p className="text-sm text-gray-300 mb-6">Applying cinematic effects...</p>
      <div className="w-full max-w-sm">
        <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-pink-500 to-pink-400"
            initial={{ width: 0 }}
            animate={{ width: `${renderPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-[11px] text-gray-600 text-center mt-2 font-mono">{Math.round(renderPercent)}%</p>
      </div>
    </div>
  );
}

function NarratingView({ narrationScript, narrationProgress, beats }: { narrationScript: string[]; narrationProgress: Set<string>; beats: DemoBeat[] }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <div className="w-full max-w-lg space-y-2">
        <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-4">Voiceover</p>
        {narrationScript.map((line, i) => {
          const beatId = beats[i]?.id;
          const done = beatId ? narrationProgress.has(beatId) : false;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-start gap-3 px-4 py-2.5 rounded-xl"
            >
              {done ? (
                <Mic size={12} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <div className="w-3 h-3 mt-0.5 rounded-full border border-white/[0.08] bg-white/[0.02] shrink-0" />
              )}
              <p className={`text-[13px] leading-relaxed italic ${done ? "text-gray-500" : "text-gray-400"}`}>
                &ldquo;{line}&rdquo;
              </p>
            </motion.div>
          );
        })}
        {narrationScript.length === 0 && (
          <div className="flex items-center justify-center gap-2 py-12">
            <Loader2 size={16} className="animate-spin text-emerald-400" />
            <span className="text-sm text-gray-500">Generating voiceover...</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MergingView({ percent }: { percent: number }) {
  const mergePercent = Math.min(100, Math.max(0, ((percent - 92) / 8) * 100));
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      <Film size={24} className="text-indigo-400 mb-4" />
      <p className="text-sm text-gray-300 mb-6">Combining video and audio...</p>
      <div className="w-full max-w-sm">
        <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
            initial={{ width: 0 }}
            animate={{ width: `${mergePercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
        <p className="text-[11px] text-gray-600 text-center mt-2 font-mono">{Math.round(mergePercent)}%</p>
      </div>
    </div>
  );
}

function CompleteView({ finalVideoPath, elapsed }: { finalVideoPath: string; elapsed: number }) {
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full h-full flex items-center justify-center p-8"
    >
      <div className="w-full max-w-3xl">
        <video
          src={`/api/video?path=${encodeURIComponent(finalVideoPath)}`}
          controls
          autoPlay
          className="w-full rounded-xl shadow-2xl shadow-black/60 border border-white/[0.06]"
        />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-center gap-3 mt-5"
        >
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span className="text-sm text-emerald-400 font-medium">Demo ready</span>
          <span className="text-[11px] text-gray-600 font-mono tabular-nums">{formatTime(elapsed)} total</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ── File Activity Ticker ── */

function FileActivityTicker({ fileOps }: { fileOps: FileOp[] }) {
  if (fileOps.length === 0) return null;

  const latest = fileOps[fileOps.length - 1];
  const filename = latest.path.split("/").pop() ?? latest.path;

  return (
    <motion.div
      key={latest.path}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-4 py-2 bg-[#0a0a0d]/90 backdrop-blur-sm border-t border-white/[0.04] z-20"
    >
      <FolderOpen size={11} className="text-gray-600 shrink-0" />
      <span className="text-[10px] text-gray-500 font-mono truncate">
        {latest.type === "write" ? "wrote" : "read"} {filename}
        {latest.sizeKb != null && <span className="text-gray-700 ml-1">({latest.sizeKb}kb)</span>}
      </span>
    </motion.div>
  );
}

/* ── Stage Label Bar ── */

const STAGE_LABELS: Record<string, { icon: typeof Search; label: string }> = {
  discovering: { icon: Search, label: "Discovering" },
  understanding: { icon: FileText, label: "Understanding" },
  planning: { icon: Brain, label: "Planning" },
  capturing: { icon: Monitor, label: "Live Browser" },
  rendering: { icon: Sparkles, label: "Rendering" },
  narrating: { icon: Mic, label: "Narrating" },
  merging: { icon: Film, label: "Merging" },
  complete: { icon: Play, label: "Final Output" },
};

/* ── Main Component ── */

export function LiveWorkspace(props: LiveWorkspaceProps) {
  const { currentStage, fileOps, finalVideoPath, elapsed } = props;
  const stageInfo = STAGE_LABELS[currentStage] ?? STAGE_LABELS.discovering;
  const StageIcon = stageInfo.icon;

  const isComplete = currentStage === "complete" && finalVideoPath;

  return (
    <div className="flex flex-col h-full relative">
      {/* Stage label bar */}
      <div className="px-4 py-2 text-[11px] text-gray-600 border-b border-white/[0.06] flex items-center gap-2 shrink-0 uppercase tracking-widest">
        <motion.span
          className="w-1.5 h-1.5 rounded-full"
          animate={{
            backgroundColor: isComplete ? "#10b981" : currentStage === "capturing" ? "#22c55e" : "#374151",
          }}
          transition={{ duration: 0.3 }}
        />
        <StageIcon size={11} />
        <span>{stageInfo.label}</span>
      </div>

      {/* Stage content */}
      <div className="flex-1 bg-[#050506] relative overflow-hidden">
        <AnimatePresence mode="wait">
          {currentStage === "discovering" && (
            <motion.div key="discovering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
              <DiscoveringView searchQuery={props.searchQuery} pages={props.discoveredPages} />
            </motion.div>
          )}

          {currentStage === "understanding" && (
            <motion.div key="understanding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
              <UnderstandingView pages={props.discoveredPages} scrapeProgress={props.scrapeProgress} />
            </motion.div>
          )}

          {currentStage === "planning" && (
            <motion.div key="planning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
              <PlanningView beats={props.beats} />
            </motion.div>
          )}

          {currentStage === "capturing" && (
            <motion.div key="capturing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
              <CapturingView liveViewUrl={props.liveViewUrl} currentAction={props.currentAction} screenshots={props.screenshots} />
            </motion.div>
          )}

          {currentStage === "rendering" && (
            <motion.div key="rendering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
              <RenderingView percent={props.percent} />
            </motion.div>
          )}

          {currentStage === "narrating" && (
            <motion.div key="narrating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
              <NarratingView narrationScript={props.narrationScript} narrationProgress={props.narrationProgress} beats={props.beatsRef} />
            </motion.div>
          )}

          {currentStage === "merging" && (
            <motion.div key="merging" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="h-full">
              <MergingView percent={props.percent} />
            </motion.div>
          )}

          {isComplete && (
            <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }} className="h-full">
              <CompleteView finalVideoPath={finalVideoPath!} elapsed={elapsed} />
            </motion.div>
          )}

          {/* Fallback for empty/error state */}
          {!currentStage && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex items-center justify-center">
              <Loader2 size={20} className="animate-spin text-gray-600" />
              <span className="text-sm text-gray-600 ml-3">Starting pipeline...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* File activity ticker */}
        <AnimatePresence>
          {fileOps.length > 0 && !isComplete && <FileActivityTicker fileOps={fileOps} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
