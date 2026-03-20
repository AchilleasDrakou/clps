"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { DemoAction, DemoBeat, PipelineEvent } from "@/lib/pipeline/types";

interface ActivityItem {
  id: number;
  stage: string;
  message: string;
  timestamp: Date;
  done: boolean;
}

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

  const activityEndRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);
  const startedRef = useRef(false);
  const beatsRef = useRef<DemoBeat[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activity]);

  const handleEvent = useCallback((event: PipelineEvent) => {
    setPercent(event.percent);
    setCurrentStage(event.stage);

    // Add to activity feed
    const newId = ++idCounter.current;
    setActivity((prev) => {
      const updated = prev.map((item) =>
        item.stage === event.stage && !item.done ? { ...item, done: true } : item
      );
      return [
        ...updated,
        {
          id: newId,
          stage: event.stage,
          message: event.message,
          timestamp: new Date(),
          done: event.stage === "complete" || event.stage === "error",
        },
      ];
    });

    if (event.data?.plan) {
      beatsRef.current = event.data.plan.beats;
      setBeats(event.data.plan.beats);
      setNarrationScript(event.data.plan.narrationScript);
    }

    if (event.data?.liveViewUrl) {
      setLiveViewUrl(event.data.liveViewUrl);
    }

    if (event.data?.actionResult) {
      const { index } = event.data.actionResult;
      const beat = beatsRef.current.find((b) => b.actionIndex === index);
      if (beat) {
        setCompletedBeats((prev) => new Set([...prev, beat.id]));
      }
    }

    if (event.data?.narrationSegment) {
      setNarrationProgress((prev) => new Set([...prev, event.data!.narrationSegment!.beatId]));
    }

    if (event.data?.finalVideoPath) {
      setFinalVideoPath(event.data.finalVideoPath);
    }

    if (event.data?.error) {
      setError(event.data.error);
    }
  }, []);

  useEffect(() => {
    if (!url || !feature || startedRef.current) return;
    startedRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const res = await fetch("/api/generate/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, feature, tone, audience }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setError("Failed to start generation");
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
                const event: PipelineEvent = JSON.parse(payload);
                handleEvent(event);
              } catch {}
            }
          }
        } finally {
          reader.releaseLock();
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      }
    })();

    return () => {
      controller.abort();
    };
  }, [url, feature, tone, audience, handleEvent]);

  const stageIcon = (stage: string) => {
    switch (stage) {
      case "discovering": return "🔍";
      case "understanding": return "📄";
      case "planning": return "🧠";
      case "capturing": return "🎬";
      case "rendering": return "✨";
      case "narrating": return "🎙️";
      case "merging": return "🎞️";
      case "complete": return "✅";
      case "error": return "❌";
      default: return "●";
    }
  };

  if (!url || !feature) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">No demo brief provided. <a href="/" className="text-white underline">Go back</a></p>
      </main>
    );
  }

  return (
    <main className="flex flex-col h-screen bg-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div>
          <h1 className="text-lg font-semibold">Clips</h1>
          <p className="text-sm text-gray-400 truncate max-w-md">
            Generating demo for <span className="text-white">{url}</span>
          </p>
        </div>
        <div className="text-sm text-gray-400">
          {currentStage === "complete" ? "Done" : currentStage || "Starting..."}
        </div>
      </header>

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Browser view */}
        <div className="flex-1 flex flex-col border-r border-gray-800">
          <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-800 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${liveViewUrl ? "bg-green-500 animate-pulse" : "bg-gray-600"}`} />
            Live Browser
          </div>
          <div className="flex-1 bg-gray-950 flex items-center justify-center">
            {liveViewUrl ? (
              <iframe
                src={liveViewUrl}
                className="w-full h-full"
                sandbox="allow-scripts allow-same-origin"
              />
            ) : (
              <div className="text-center text-gray-600">
                <div className="text-4xl mb-3">🖥️</div>
                <p className="text-sm">Browser will appear here during capture</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Activity + Plan + Narration */}
        <div className="w-[420px] flex flex-col overflow-hidden">
          {/* Activity feed */}
          <div className="flex-1 overflow-y-auto border-b border-gray-800">
            <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-800 sticky top-0 bg-black z-10">
              Activity
            </div>
            <div className="px-4 py-2 space-y-1">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-sm py-1">
                  <span className="shrink-0 mt-0.5">{stageIcon(item.stage)}</span>
                  <span className={item.done ? "text-gray-500" : "text-gray-200"}>
                    {item.message}
                  </span>
                </div>
              ))}
              <div ref={activityEndRef} />
            </div>
          </div>

          {/* Demo plan */}
          {beats.length > 0 && (
            <div className="border-b border-gray-800 max-h-[200px] overflow-y-auto">
              <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-800 sticky top-0 bg-black z-10">
                Demo Plan — {beats.length} beats
              </div>
              <div className="px-4 py-2 space-y-1">
                {beats.map((beat) => (
                  <div key={beat.id} className="flex items-center gap-2 text-sm">
                    <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                      completedBeats.has(beat.id)
                        ? "border-green-500 bg-green-500/20 text-green-400"
                        : "border-gray-700 text-gray-700"
                    }`}>
                      {completedBeats.has(beat.id) ? "✓" : ""}
                    </span>
                    <span className="text-gray-400 text-xs w-16 shrink-0">{beat.kind}</span>
                    <span className={completedBeats.has(beat.id) ? "text-gray-500" : "text-gray-300"}>
                      {beat.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Narration script */}
          {narrationScript.length > 0 && (
            <div className="max-h-[160px] overflow-y-auto">
              <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-800 sticky top-0 bg-black z-10">
                Narration Script
              </div>
              <div className="px-4 py-2 space-y-2">
                {narrationScript.map((line, i) => {
                  const beatId = beatsRef.current[i]?.id;
                  const done = beatId ? narrationProgress.has(beatId) : false;
                  return (
                    <p key={i} className={`text-sm italic ${done ? "text-gray-500" : "text-gray-300"}`}>
                      {done && <span className="text-green-400 not-italic mr-1">🎙️</span>}
                      &ldquo;{line}&rdquo;
                    </p>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Progress bar */}
      <footer className="px-6 py-3 border-t border-gray-800">
        <div className="flex items-center gap-4">
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-500 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="text-sm text-gray-400 w-10 text-right">{percent}%</span>
        </div>
        {error && (
          <p className="text-sm text-red-400 mt-2">{error}</p>
        )}
        {finalVideoPath && (
          <div className="mt-2 flex items-center gap-3">
            <span className="text-sm text-green-400">Demo ready!</span>
            <span className="text-sm text-gray-400">
              Saved to: {finalVideoPath.split("/").slice(-2).join("/")}
            </span>
          </div>
        )}
      </footer>
    </main>
  );
}
