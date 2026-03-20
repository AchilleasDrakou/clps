"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Search,
  FileText,
  Brain,
  Video,
  Sparkles,
  Mic,
  Film,
  CheckCircle2,
  XCircle,
  Loader2,
  Monitor,
  Clock,
  ArrowLeft,
  Download,
  Play,
} from "lucide-react";
import type { DemoBeat, PipelineEvent, PipelineStage } from "@/lib/pipeline/types";

import { StageCard, type StageStatus } from "./_components/stage-card";
import { StageTimeline } from "./_components/stage-timeline";
import {
  SkeletonBeats,
  SkeletonBrowser,
  SkeletonNarration,
} from "./_components/skeleton-stage";
import {
  DiscoveringDetail,
  UnderstandingDetail,
  PlanningDetail,
  CapturingDetail,
  RenderingDetail,
  NarratingDetail,
  MergingDetail,
} from "./_components/sub-process";

/* ── Constants (hoisted outside component) ── */
const STAGE_CONFIG: Record<
  string,
  { icon: typeof Search; label: string; color: string }
> = {
  discovering: { icon: Search, label: "Discovering", color: "#3B82F6" },
  understanding: { icon: FileText, label: "Understanding", color: "#3B82F6" },
  planning: { icon: Brain, label: "Planning", color: "#8B5CF6" },
  capturing: { icon: Video, label: "Capturing", color: "#F59E0B" },
  rendering: { icon: Sparkles, label: "Rendering", color: "#EC4899" },
  narrating: { icon: Mic, label: "Narrating", color: "#10B981" },
  merging: { icon: Film, label: "Merging", color: "#6366F1" },
  complete: { icon: CheckCircle2, label: "Complete", color: "#10B981" },
  error: { icon: XCircle, label: "Error", color: "#EF4444" },
};

const PIPELINE_STAGES: PipelineStage[] = [
  "discovering",
  "understanding",
  "planning",
  "capturing",
  "rendering",
  "narrating",
  "merging",
];

/* Build an index Map for O(1) lookups (js-index-maps) */
const STAGE_INDEX = new Map<string, number>(
  PIPELINE_STAGES.map((s, i) => [s, i])
);

const getStageStatus = (
  stage: PipelineStage,
  currentStage: string
): StageStatus => {
  if (currentStage === "complete") return "done";
  if (currentStage === "error") {
    // error isn't in PIPELINE_STAGES — find the last known stage from the index
    // All stages before the error point are done, the rest are upcoming
    // Since we can't know exactly where the error happened, mark all visited as done
    return "upcoming";
  }
  const currentIdx = STAGE_INDEX.get(currentStage) ?? -1;
  const stageIdx = STAGE_INDEX.get(stage) ?? -1;
  if (stageIdx < currentIdx) return "done";
  if (stageIdx === currentIdx) return "active";
  return "upcoming";
};

/* ── Page ── */
export default function GeneratePage() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") ?? "";
  const feature = searchParams.get("feature") ?? "";
  const tone = searchParams.get("tone") ?? "professional";
  const audience = searchParams.get("audience") ?? "general";

  const [percent, setPercent] = useState(0);
  const [currentStage, setCurrentStage] = useState<string>("");
  const [discoveredPages, setDiscoveredPages] = useState<
    { url: string; title: string }[]
  >([]);
  const [understandingIndex, setUnderstandingIndex] = useState(0);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [beats, setBeats] = useState<DemoBeat[]>([]);
  const [completedBeats, setCompletedBeats] = useState<Set<string>>(new Set());
  const [narrationScript, setNarrationScript] = useState<string[]>([]);
  const [narrationProgress, setNarrationProgress] = useState<Set<string>>(
    new Set()
  );
  const [finalVideoPath, setFinalVideoPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  // Track the stage where error occurred for proper status display
  const [errorStage, setErrorStage] = useState<string>("");
  // Store latest message per stage — use ref + state to avoid recreating map on every event
  const latestMessageRef = useRef<Record<string, string>>({});
  const [latestMessage, setLatestMessage] = useState<Record<string, string>>(
    {}
  );

  const idCounter = useRef(0);
  const startedRef = useRef(false);
  const beatsRef = useRef<DemoBeat[]>([]);
  const startTime = useRef(Date.now());
  const understandingCountRef = useRef(0);
  // Track which stages we've visited (for error state)
  const visitedStagesRef = useRef<Set<string>>(new Set());

  // Elapsed timer
  useEffect(() => {
    if (currentStage === "complete" || currentStage === "error") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 100);
    return () => clearInterval(interval);
  }, [currentStage]);

  // handleEvent uses functional setState throughout (rerender-functional-setstate)
  const handleEvent = useCallback((event: PipelineEvent) => {
    setPercent(event.percent);
    setCurrentStage(event.stage);

    // Track visited stages
    visitedStagesRef.current.add(event.stage);

    // Track latest message per stage incrementally (not rebuilding entire map)
    latestMessageRef.current = {
      ...latestMessageRef.current,
      [event.stage]: event.message,
    };
    setLatestMessage({ ...latestMessageRef.current });

    // Track discovered pages
    if (event.data?.pages) {
      setDiscoveredPages(event.data.pages);
    }

    // Track understanding progress
    if (event.stage === "understanding") {
      understandingCountRef.current++;
      setUnderstandingIndex(understandingCountRef.current);
    }

    // Plan data
    if (event.data?.plan) {
      beatsRef.current = event.data.plan.beats;
      setBeats(event.data.plan.beats);
      setNarrationScript(event.data.plan.narrationScript);
    }

    // Live view
    if (event.data?.liveViewUrl) setLiveViewUrl(event.data.liveViewUrl);

    // Beat completion during capture — functional setState
    if (event.data?.actionResult) {
      const beat = beatsRef.current.find(
        (b) => b.actionIndex === event.data!.actionResult!.index
      );
      if (beat) {
        const beatId = beat.id;
        setCompletedBeats((prev) => new Set([...prev, beatId]));
      }
    }

    // Narration segment — functional setState
    if (event.data?.narrationSegment) {
      const segBeatId = event.data.narrationSegment.beatId;
      setNarrationProgress((prev) => new Set([...prev, segBeatId]));
    }

    // Final video
    if (event.data?.finalVideoPath)
      setFinalVideoPath(event.data.finalVideoPath);

    // Error — track which stage the error occurred in
    if (event.data?.error) {
      setError(event.data.error);
      setErrorStage(event.stage);
    }
  }, []);

  // SSE connection
  useEffect(() => {
    if (!url || !feature || startedRef.current) return;
    startedRef.current = true;
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/generate/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, feature, tone, audience }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          setError("Failed to connect");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const payload = line.slice(6).trim();
              if (!payload) continue;
              try {
                handleEvent(JSON.parse(payload));
              } catch {}
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError")
          setError(err.message);
      }
    })();

    return () => controller.abort();
  }, [url, feature, tone, audience, handleEvent]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const stageConfig = STAGE_CONFIG[currentStage] ?? STAGE_CONFIG.discovering;

  // Summary badges — memoized on primitive deps
  const pageCount = discoveredPages.length;
  const beatCount = beats.length;
  const completedBeatCount = completedBeats.size;
  const narrationCount = narrationProgress.size;

  const summaries = useMemo(
    () => ({
      discovering: pageCount > 0 ? `${pageCount} pages found` : undefined,
      understanding: pageCount > 0 ? `${pageCount} pages scraped` : undefined,
      planning: beatCount > 0 ? `${beatCount} beats planned` : undefined,
      capturing:
        completedBeatCount > 0
          ? `${completedBeatCount} actions recorded`
          : undefined,
      rendering: "Cinematic render done",
      narrating:
        narrationCount > 0
          ? `${narrationCount} segments narrated`
          : undefined,
      merging: "Final video merged",
    }),
    [pageCount, beatCount, completedBeatCount, narrationCount]
  );

  // Visible stages: show current + 2 ahead
  const visibleStages = useMemo(() => {
    if (!currentStage) return PIPELINE_STAGES.slice(0, 1);
    if (currentStage === "complete" || currentStage === "error")
      return PIPELINE_STAGES;
    const currentIdx = STAGE_INDEX.get(currentStage) ?? 0;
    return PIPELINE_STAGES.slice(
      0,
      Math.min(PIPELINE_STAGES.length, currentIdx + 3)
    );
  }, [currentStage]);

  // Proper error-aware stage status
  const getStatus = useCallback(
    (stage: PipelineStage): StageStatus => {
      if (currentStage === "error") {
        if (visitedStagesRef.current.has(stage)) {
          return stage === errorStage ? "error" : "done";
        }
        return "upcoming";
      }
      return getStageStatus(stage, currentStage);
    },
    [currentStage, errorStage]
  );

  /* ── Left panel state ── */
  const currentIdx = STAGE_INDEX.get(currentStage) ?? -1;
  const captureIdx = STAGE_INDEX.get("capturing") ?? 3;
  const isCapturing = currentIdx >= captureIdx && currentStage !== "error";
  const isComplete = currentStage === "complete";
  const showBrowser = isCapturing && liveViewUrl != null && !isComplete;
  const showVideo = isComplete && finalVideoPath != null;

  if (!url || !feature) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-[#09090b] text-white">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No demo brief provided.</p>
          <a
            href="/"
            className="text-white underline hover:text-gray-300 transition"
          >
            Go back
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen bg-[#09090b] text-white overflow-hidden relative">
      {/* ── Ambient background glow — shifts color per stage ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute -top-1/2 -left-1/4 w-[60%] h-[60%] rounded-full blur-[120px] opacity-[0.03]"
          animate={{ background: stageConfig.color }}
          transition={{ duration: 1.5 }}
        />
        <motion.div
          className="absolute -bottom-1/3 -right-1/4 w-[50%] h-[50%] rounded-full blur-[100px] opacity-[0.02]"
          animate={{ background: stageConfig.color }}
          transition={{ duration: 1.5 }}
        />
      </div>

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl z-20 shrink-0 relative">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="text-gray-500 hover:text-white transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft size={16} />
          </a>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Clips</h1>
            <p className="text-[11px] text-gray-500 truncate max-w-sm">
              {new URL(url.startsWith("http") ? url : `https://${url}`)
                .hostname}
              <span className="mx-1.5 text-gray-700">/</span>
              <span className="text-gray-400">{feature}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs">
            <Clock size={11} className="text-gray-600" />
            <span className="text-gray-500 font-mono text-[11px] tabular-nums">
              {formatTime(elapsed)}
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03]">
            {currentStage === "complete" ? (
              <CheckCircle2 size={12} style={{ color: "#10B981" }} />
            ) : currentStage === "error" ? (
              <XCircle size={12} style={{ color: "#EF4444" }} />
            ) : (
              <Loader2
                size={12}
                className="animate-spin"
                style={{ color: stageConfig.color }}
              />
            )}
            <span
              className="text-[11px] font-medium tracking-wide"
              style={{ color: stageConfig.color }}
            >
              {stageConfig.label}
            </span>
          </div>
        </div>
      </header>

      {/* ── Progress bar with stage-shifting gradient ── */}
      <div className="h-[2px] bg-white/[0.04] shrink-0 relative z-10">
        <motion.div
          className="h-full"
          style={{
            background: `linear-gradient(90deg, ${stageConfig.color}CC, ${stageConfig.color}60, ${stageConfig.color}20)`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
        {/* Glow on the leading edge */}
        {percent > 0 && percent < 100 && (
          <motion.div
            className="absolute top-0 h-[2px] w-8 blur-sm"
            style={{ background: stageConfig.color }}
            animate={{ left: `${percent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )}
      </div>

      {/* ── Main workspace ── */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* ── Left panel ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2 text-[11px] text-gray-600 border-b border-white/[0.06] flex items-center gap-2 shrink-0 uppercase tracking-widest">
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              animate={{
                backgroundColor: showBrowser
                  ? "#22c55e"
                  : showVideo
                  ? "#10b981"
                  : "#374151",
              }}
              transition={{ duration: 0.3 }}
            />
            {showVideo ? (
              <>
                <Play size={11} />
                <span>Final Output</span>
              </>
            ) : showBrowser ? (
              <>
                <Monitor size={11} />
                <span>Live Browser</span>
              </>
            ) : (
              <>
                <Monitor size={11} />
                <span>Pipeline</span>
              </>
            )}
          </div>
          <div className="flex-1 bg-[#050506] flex items-center justify-center relative overflow-hidden">
            <AnimatePresence mode="wait">
              {showVideo ? (
                <motion.div
                  key="video"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full h-full flex items-center justify-center p-8"
                >
                  <div className="w-full max-w-3xl">
                    <video
                      src={`/api/video?path=${encodeURIComponent(finalVideoPath!)}`}
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
                      <span className="text-sm text-emerald-400 font-medium">
                        Demo ready
                      </span>
                      <span className="text-[11px] text-gray-600 font-mono tabular-nums">
                        {formatTime(elapsed)} total
                      </span>
                    </motion.div>
                  </div>
                </motion.div>
              ) : showBrowser ? (
                <motion.div
                  key="browser"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="w-full h-full"
                >
                  <iframe
                    src={liveViewUrl!}
                    className="w-full h-full"
                    sandbox="allow-scripts allow-same-origin"
                    title="Live browser preview"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="w-full h-full"
                >
                  <StageTimeline
                    currentStage={
                      (currentStage as PipelineStage) || "discovering"
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Right panel: Stage accordion ── */}
        <div className="w-[420px] flex flex-col border-l border-white/[0.06] bg-[#0a0a0d]">
          <div className="px-4 py-3 text-[10px] font-semibold text-gray-600 uppercase tracking-[0.2em] border-b border-white/[0.06] shrink-0">
            Pipeline
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-thin">
            <AnimatePresence mode="popLayout">
              {visibleStages.map((stage) => {
                const cfg = STAGE_CONFIG[stage];
                if (!cfg) return null;
                const status = getStatus(stage);

                return (
                  <StageCard
                    key={stage}
                    icon={cfg.icon}
                    label={cfg.label}
                    color={cfg.color}
                    status={status}
                    badge={
                      status === "done"
                        ? summaries[stage as keyof typeof summaries]
                        : undefined
                    }
                    summary={
                      status === "done" ? latestMessage[stage] : undefined
                    }
                  >
                    {/* ── Sub-process content per stage ── */}
                    {stage === "discovering" ? (
                      pageCount > 0 ? (
                        <DiscoveringDetail pages={discoveredPages} />
                      ) : status === "active" ? (
                        <div className="pl-7">
                          <div className="flex items-center gap-2">
                            <Loader2
                              size={12}
                              className="animate-spin text-blue-400"
                            />
                            <span className="text-xs text-gray-400">
                              Searching for relevant pages...
                            </span>
                          </div>
                        </div>
                      ) : null
                    ) : null}

                    {stage === "understanding" ? (
                      pageCount > 0 ? (
                        <UnderstandingDetail
                          pages={discoveredPages}
                          currentIndex={understandingIndex}
                        />
                      ) : status === "upcoming" ? (
                        <SkeletonBeats />
                      ) : null
                    ) : null}

                    {stage === "planning" ? (
                      beatCount > 0 ? (
                        <PlanningDetail beats={beats} />
                      ) : status === "active" ? (
                        <div className="pl-7">
                          <div className="flex items-center gap-2">
                            <Loader2
                              size={12}
                              className="animate-spin text-purple-400"
                            />
                            <span className="text-xs text-gray-400">
                              Generating demo beats...
                            </span>
                          </div>
                        </div>
                      ) : status === "upcoming" ? (
                        <SkeletonBeats />
                      ) : null
                    ) : null}

                    {stage === "capturing" ? (
                      beatCount > 0 ? (
                        <CapturingDetail
                          beats={beats}
                          completedBeats={completedBeats}
                        />
                      ) : status === "upcoming" ? (
                        <SkeletonBrowser />
                      ) : null
                    ) : null}

                    {stage === "rendering" ? (
                      status === "active" ? (
                        <RenderingDetail percent={percent} />
                      ) : status === "upcoming" ? (
                        <SkeletonBeats />
                      ) : null
                    ) : null}

                    {stage === "narrating" ? (
                      narrationScript.length > 0 ? (
                        <NarratingDetail
                          narrationScript={narrationScript}
                          narrationProgress={narrationProgress}
                          beats={beatsRef.current}
                        />
                      ) : status === "upcoming" ? (
                        <SkeletonNarration />
                      ) : null
                    ) : null}

                    {stage === "merging" ? (
                      status === "active" ? (
                        <MergingDetail percent={percent} />
                      ) : null
                    ) : null}
                  </StageCard>
                );
              })}
            </AnimatePresence>

            {/* Complete card */}
            {currentStage === "complete" ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 100,
                  damping: 14,
                }}
                className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 relative overflow-hidden"
              >
                {/* Success glow */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 via-transparent to-transparent" />
                </div>
                <div className="flex items-center gap-3 relative">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 12,
                      delay: 0.1,
                    }}
                  >
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  </motion.div>
                  <div>
                    <p className="text-sm font-medium text-emerald-300">
                      Demo video ready
                    </p>
                    <p className="text-[11px] text-gray-500 mt-0.5 font-mono tabular-nums">
                      Completed in {formatTime(elapsed)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* Error card */}
            {error != null ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4"
              >
                <div className="flex items-start gap-3">
                  <XCircle
                    size={16}
                    className="text-red-400 shrink-0 mt-0.5"
                  />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </motion.div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="px-6 py-3 border-t border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl shrink-0 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {finalVideoPath != null ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span className="text-[11px] text-emerald-400 font-medium tracking-wide">
                  Demo ready
                </span>
                <span className="text-[11px] text-gray-600 font-mono">
                  {finalVideoPath.split("/").slice(-2).join("/")}
                </span>
              </>
            ) : error != null ? (
              <>
                <XCircle size={14} className="text-red-400" />
                <span className="text-[11px] text-red-400 truncate max-w-md">
                  {error}
                </span>
              </>
            ) : (
              <span className="text-[11px] text-gray-600">
                {latestMessage[currentStage] ?? "Starting pipeline..."}
              </span>
            )}
          </div>
          {finalVideoPath != null ? (
            <motion.a
              href={`/api/video?path=${encodeURIComponent(finalVideoPath)}&download=1`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-[13px] text-gray-200 hover:bg-white/[0.1] transition-colors"
            >
              <Download size={14} />
              Download
            </motion.a>
          ) : null}
        </div>
      </footer>
    </main>
  );
}
