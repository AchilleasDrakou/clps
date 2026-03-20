"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Search, FileText, Brain, Video, Sparkles, Mic, Film,
  CheckCircle2, XCircle, Loader2, Monitor, ChevronDown,
  ChevronRight, Clock, Download, ArrowLeft,
} from "lucide-react";
import { DemoBeat, PipelineEvent } from "@/lib/pipeline/types";

interface ActivityItem {
  id: number;
  stage: string;
  message: string;
  timestamp: Date;
  status: "active" | "done" | "error";
}

const STAGE_CONFIG: Record<string, { icon: typeof Search; label: string; color: string }> = {
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

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") ?? "";
  const feature = searchParams.get("feature") ?? "";
  const tone = searchParams.get("tone") ?? "professional";
  const audience = searchParams.get("audience") ?? "general";

  const [percent, setPercent] = useState(0);
  const [currentStage, setCurrentStage] = useState("");
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [beats, setBeats] = useState<DemoBeat[]>([]);
  const [completedBeats, setCompletedBeats] = useState<Set<string>>(new Set());
  const [narrationScript, setNarrationScript] = useState<string[]>([]);
  const [narrationProgress, setNarrationProgress] = useState<Set<string>>(new Set());
  const [finalVideoPath, setFinalVideoPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [planExpanded, setPlanExpanded] = useState(true);
  const [narrationExpanded, setNarrationExpanded] = useState(true);

  const activityEndRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const startedRef = useRef(false);
  const beatsRef = useRef<DemoBeat[]>([]);
  const startTime = useRef(Date.now());

  // Elapsed timer
  useEffect(() => {
    if (currentStage === "complete" || currentStage === "error") return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 100);
    return () => clearInterval(interval);
  }, [currentStage]);

  // Auto-scroll activity
  useEffect(() => {
    requestAnimationFrame(() => {
      activityEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, [activity]);

  const handleEvent = useCallback((event: PipelineEvent) => {
    setPercent(event.percent);
    setCurrentStage(event.stage);

    const newId = ++idCounter.current;
    setActivity((prev) => {
      const updated = prev.map((item) =>
        item.stage === event.stage && item.status === "active"
          ? { ...item, status: "done" as const }
          : item
      );
      return [
        ...updated,
        {
          id: newId,
          stage: event.stage,
          message: event.message,
          timestamp: new Date(),
          status: (event.stage === "complete" ? "done" : event.stage === "error" ? "error" : "active") as ActivityItem["status"],
        },
      ];
    });

    if (event.data?.plan) {
      beatsRef.current = event.data.plan.beats;
      setBeats(event.data.plan.beats);
      setNarrationScript(event.data.plan.narrationScript);
    }
    if (event.data?.liveViewUrl) setLiveViewUrl(event.data.liveViewUrl);
    if (event.data?.actionResult) {
      const beat = beatsRef.current.find((b) => b.actionIndex === event.data!.actionResult!.index);
      if (beat) setCompletedBeats((prev) => new Set([...prev, beat.id]));
    }
    if (event.data?.narrationSegment) {
      setNarrationProgress((prev) => new Set([...prev, event.data!.narrationSegment!.beatId]));
    }
    if (event.data?.finalVideoPath) setFinalVideoPath(event.data.finalVideoPath);
    if (event.data?.error) setError(event.data.error);
  }, []);

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
        if (!res.ok || !res.body) { setError("Failed to connect"); return; }

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
              try { handleEvent(JSON.parse(payload)); } catch {}
            }
          }
        } finally { reader.releaseLock(); }
      } catch (err: any) {
        if (err.name !== "AbortError") setError(err.message);
      }
    })();

    return () => controller.abort();
  }, [url, feature, tone, audience, handleEvent]);

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const stageConfig = STAGE_CONFIG[currentStage] ?? STAGE_CONFIG.discovering;
  const StageIcon = stageConfig.icon;

  if (!url || !feature) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No demo brief provided.</p>
          <a href="/" className="text-white underline hover:text-gray-300 transition">Go back</a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen bg-[#09090b] text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-4">
          <a href="/" className="text-gray-500 hover:text-white transition">
            <ArrowLeft size={16} />
          </a>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Clips</h1>
            <p className="text-xs text-gray-500 truncate max-w-sm">
              {new URL(url.startsWith("http") ? url : `https://${url}`).hostname}
              <span className="mx-1.5 text-gray-700">/</span>
              <span className="text-gray-400">{feature}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <Clock size={12} className="text-gray-500" />
            <span className="text-gray-400 font-mono">{formatTime(elapsed)}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03]">
            {currentStage === "complete" ? (
              <CheckCircle2 size={12} style={{ color: "#10B981" }} />
            ) : currentStage === "error" ? (
              <XCircle size={12} style={{ color: "#EF4444" }} />
            ) : (
              <Loader2 size={12} className="animate-spin" style={{ color: stageConfig.color }} />
            )}
            <span className="text-xs font-medium" style={{ color: stageConfig.color }}>
              {stageConfig.label}
            </span>
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-white/[0.04] shrink-0">
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${stageConfig.color}, ${stageConfig.color}88)` }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Live browser */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-2 text-xs text-gray-600 border-b border-white/[0.06] flex items-center gap-2 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${liveViewUrl ? "bg-green-500" : "bg-gray-700"}`} />
            <Monitor size={12} />
            <span>Live Browser</span>
          </div>
          <div className="flex-1 bg-[#050506] flex items-center justify-center relative">
            {liveViewUrl ? (
              <motion.div
                className="w-full h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <iframe src={liveViewUrl} className="w-full h-full" sandbox="allow-scripts allow-same-origin" />
              </motion.div>
            ) : (
              <div className="text-center">
                <motion.div
                  className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Monitor size={24} className="text-gray-600" />
                </motion.div>
                <p className="text-sm text-gray-600">Browser preview will appear during capture</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Activity panel */}
        <div className="w-[400px] flex flex-col border-l border-white/[0.06] bg-[#0c0c0f]">
          {/* Activity feed */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <div className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-white/[0.06] sticky top-0 bg-[#0c0c0f] z-10">
              Activity
            </div>
            <div className="px-3 py-2">
              <AnimatePresence mode="popLayout">
                {activity.map((item, i) => {
                  const cfg = STAGE_CONFIG[item.stage] ?? STAGE_CONFIG.discovering;
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: 0.05 }}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="mt-0.5 shrink-0">
                        {item.status === "active" ? (
                          <Loader2 size={14} className="animate-spin" style={{ color: cfg.color }} />
                        ) : item.status === "error" ? (
                          <XCircle size={14} className="text-red-400" />
                        ) : (
                          <CheckCircle2 size={14} className="text-gray-600" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-[13px] leading-snug ${
                          item.status === "active" ? "text-gray-200" :
                          item.status === "error" ? "text-red-400" :
                          "text-gray-500"
                        }`}>
                          {item.message}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={activityEndRef} />
            </div>
          </div>

          {/* Demo plan (collapsible) */}
          {beats.length > 0 && (
            <div className="border-t border-white/[0.06]">
              <button
                onClick={() => setPlanExpanded(!planExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-white/[0.02] transition"
              >
                <span>Demo Plan — {beats.length} beats</span>
                {planExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              <AnimatePresence>
                {planExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-0.5 max-h-[180px] overflow-y-auto">
                      {beats.map((beat, i) => {
                        const done = completedBeats.has(beat.id);
                        return (
                          <motion.div
                            key={beat.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/[0.02] transition"
                          >
                            <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-all ${
                              done
                                ? "border-green-500/40 bg-green-500/10"
                                : "border-white/[0.08] bg-white/[0.02]"
                            }`}>
                              {done && <CheckCircle2 size={10} className="text-green-400" />}
                            </div>
                            <span className="text-[11px] text-gray-600 w-14 shrink-0 font-mono">{beat.kind}</span>
                            <span className={`text-[13px] truncate ${done ? "text-gray-600" : "text-gray-300"}`}>
                              {beat.label}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Narration script (collapsible) */}
          {narrationScript.length > 0 && (
            <div className="border-t border-white/[0.06]">
              <button
                onClick={() => setNarrationExpanded(!narrationExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-medium text-gray-500 uppercase tracking-wider hover:bg-white/[0.02] transition"
              >
                <span>Narration</span>
                {narrationExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
              <AnimatePresence>
                {narrationExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 max-h-[180px] overflow-y-auto">
                      {narrationScript.map((line, i) => {
                        const beatId = beatsRef.current[i]?.id;
                        const done = beatId ? narrationProgress.has(beatId) : false;
                        return (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.08 }}
                            className="flex gap-2"
                          >
                            <span className="text-[11px] text-gray-700 font-mono mt-0.5 shrink-0 w-4">{i + 1}</span>
                            <p className={`text-[13px] leading-relaxed italic ${
                              done ? "text-gray-600" : "text-gray-400"
                            }`}>
                              {done && <Mic size={10} className="inline mr-1.5 text-green-400 not-italic" />}
                              &ldquo;{line}&rdquo;
                            </p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl shrink-0">
        {error && (
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-400 truncate">{error}</p>
          </div>
        )}
        {finalVideoPath && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <CheckCircle2 size={16} className="text-green-400" />
            <span className="text-sm text-green-400 font-medium">Demo ready</span>
            <span className="text-xs text-gray-500 font-mono">
              {finalVideoPath.split("/").slice(-2).join("/")}
            </span>
          </motion.div>
        )}
      </footer>
    </main>
  );
}
