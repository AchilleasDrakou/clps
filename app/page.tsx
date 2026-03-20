"use client";

import {
  useState,
  useRef,
  useCallback,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, X, Globe } from "lucide-react";
import { VoiceInput } from "@/components/voice-input";
import type { DemoBrief } from "@/lib/pipeline/types";

type FlowState = "url-input" | "brief-builder";

const TONES: DemoBrief["tone"][] = [
  "professional",
  "casual",
  "tutorial",
  "cinematic",
];

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export default function Home() {
  const router = useRouter();
  const [flowState, setFlowState] = useState<FlowState>("url-input");
  const [url, setUrl] = useState("");
  const [feature, setFeature] = useState("");
  const [tone, setTone] = useState<DemoBrief["tone"]>("professional");
  const featureInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (!url.trim()) return;
      setFlowState("brief-builder");
      setTimeout(() => featureInputRef.current?.focus(), 450);

      // Pre-scrape in background — cached server-side for generate page
      fetch("/api/prescrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      }).catch(() => {}); // non-critical — pipeline will scrape if cache miss
    },
    [url]
  );

  const handleUrlKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") handleUrlSubmit();
    },
    [handleUrlSubmit]
  );

  const handleResetUrl = useCallback(() => {
    setFlowState("url-input");
    setUrl("");
    setFeature("");
    setTone("professional");
  }, []);

  const handleGenerate = useCallback(() => {
    if (!url.trim() || !feature.trim()) return;
    const params = new URLSearchParams({
      url: url.trim(),
      feature: feature.trim(),
      audience: "general",
      tone,
    });
    router.push(`/generate?${params.toString()}`);
  }, [url, feature, tone, router]);

  const handleFeatureKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && feature.trim()) handleGenerate();
    },
    [feature, handleGenerate]
  );

  return (
    <main className="grain relative flex flex-col items-center justify-center min-h-screen px-6 py-16 bg-[var(--color-surface)] overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full opacity-[0.04]"
        style={{
          background:
            "radial-gradient(ellipse, var(--color-accent) 0%, transparent 70%)",
        }}
      />

      {/* Hero */}
      <motion.div
        layout
        transition={{ duration: 0.6, ease: EASE_OUT_EXPO }}
        className="relative text-center"
      >
        {/* Staggered entrance */}
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT_EXPO }}
          className="inline-block text-[11px] font-medium tracking-[0.25em] uppercase text-[var(--color-text-muted)] mb-6"
        >
          by Pelian
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: EASE_OUT_EXPO }}
          className="font-[family-name:var(--font-display)] text-8xl md:text-9xl tracking-tight mb-4 text-white"
          style={{ fontStyle: "italic" }}
        >
          Clips
        </motion.h1>

        <AnimatePresence mode="wait">
          {flowState === "url-input" ? (
            <motion.p
              key="sub-url"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
              className="text-base text-[var(--color-text-muted)] max-w-sm mx-auto leading-relaxed"
            >
              Demo videos for any website.
              <br />
              Just paste a URL.
            </motion.p>
          ) : (
            <motion.p
              key="sub-brief"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
              className="text-base text-[var(--color-text-muted)] max-w-sm mx-auto leading-relaxed"
            >
              Describe the feature to demo.
            </motion.p>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Flow content */}
      <div className="w-full max-w-lg mt-12 relative z-10">
        <AnimatePresence mode="wait">
          {flowState === "url-input" ? (
            <motion.div
              key="url-step"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30, scale: 0.98 }}
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
            >
              <div className="input-glow relative">
                <Globe
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)]"
                />
                <input
                  type="url"
                  placeholder="Paste a website URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleUrlKeyDown}
                  autoFocus
                  className="w-full pl-11 pr-14 py-4.5 bg-white/[0.03] border border-[var(--color-border)] rounded-2xl text-white placeholder-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-border-focus)] transition-all duration-300 text-[15px]"
                />
                <motion.button
                  onClick={() => handleUrlSubmit()}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{
                    opacity: url.trim() ? 1 : 0,
                    scale: url.trim() ? 1 : 0.8,
                  }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white/[0.06] text-[var(--color-text-muted)] hover:bg-white/[0.12] hover:text-white transition-colors duration-200"
                  aria-label="Submit URL"
                  tabIndex={url.trim() ? 0 : -1}
                >
                  <ArrowRight size={16} />
                </motion.button>
              </div>

              {/* Subtle hint */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="text-center text-[11px] text-[var(--color-text-dim)] mt-4 tracking-wide"
              >
                press enter to continue
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="brief-step"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              className="space-y-5"
            >
              {/* URL chip */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05, duration: 0.35, ease: EASE_OUT_EXPO }}
                className="flex justify-center"
              >
                <div className="group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white/[0.04] border border-[var(--color-border)] text-[13px] text-[var(--color-text-muted)] transition-colors duration-200 hover:border-[var(--color-border-focus)]">
                  <Globe size={13} className="text-[var(--color-text-dim)] shrink-0" />
                  <span className="max-w-[260px] truncate">{url}</span>
                  <button
                    onClick={handleResetUrl}
                    className="p-0.5 rounded-full opacity-40 group-hover:opacity-100 hover:bg-white/[0.08] transition-all duration-200"
                    aria-label="Change URL"
                  >
                    <X size={12} />
                  </button>
                </div>
              </motion.div>

              {/* Feature input + mic */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.4, ease: EASE_OUT_EXPO }}
                className="input-glow relative flex items-center gap-3"
              >
                <input
                  ref={featureInputRef}
                  type="text"
                  placeholder="What feature do you want to demo?"
                  value={feature}
                  onChange={(e) => setFeature(e.target.value)}
                  onKeyDown={handleFeatureKeyDown}
                  className="flex-1 px-4 py-4.5 bg-white/[0.03] border border-[var(--color-border)] rounded-2xl text-white placeholder-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-border-focus)] transition-all duration-300 text-[15px]"
                />
                <VoiceInput className="shrink-0" />
              </motion.div>

              {/* Tone pills */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.4, ease: EASE_OUT_EXPO }}
                className="flex items-center gap-2 justify-center"
              >
                {TONES.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium capitalize transition-all duration-250 ${
                      tone === t
                        ? "bg-[var(--color-accent)] text-black"
                        : "bg-white/[0.03] text-[var(--color-text-muted)] border border-[var(--color-border)] hover:border-[var(--color-border-focus)] hover:text-gray-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </motion.div>

              {/* Generate button */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24, duration: 0.4, ease: EASE_OUT_EXPO }}
                onClick={handleGenerate}
                disabled={!feature.trim()}
                className="w-full py-4 bg-white text-black font-semibold rounded-2xl hover:bg-gray-100 disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 text-[14px] tracking-wide"
              >
                Generate Demo
                <ArrowRight size={15} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 text-[11px] text-[var(--color-text-dim)] tracking-widest"
      >
        clps.ai
      </motion.p>
    </main>
  );
}
