"use client";

import {
  useState,
  useRef,
  useCallback,
  Suspense,
  lazy,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, X, Globe } from "lucide-react";
import { VoiceInput } from "@/components/voice-input";
import type { DemoBrief } from "@/lib/pipeline/types";

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then((mod) => ({
    default: mod.Dithering,
  }))
);

type FlowState = "url-input" | "brief-builder";

const MODES: DemoBrief["mode"][] = ["raw", "tutorial", "showreel"];

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export default function Home() {
  const router = useRouter();
  const [flowState, setFlowState] = useState<FlowState>("url-input");
  const [url, setUrl] = useState("");
  const [feature, setFeature] = useState("");
  const [mode, setMode] = useState<DemoBrief["mode"]>("raw");
  const [isCardHovered, setIsCardHovered] = useState(false);
  const featureInputRef = useRef<HTMLInputElement>(null);

  const handleUrlSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (!url.trim()) return;
      setFlowState("brief-builder");
      setTimeout(() => featureInputRef.current?.focus(), 450);

      fetch("/api/prescrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      }).catch(() => {});
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
    setMode("raw");
  }, []);

  const handleGenerate = useCallback(() => {
    if (!url.trim() || !feature.trim()) return;
    const params = new URLSearchParams({
      url: url.trim(),
      feature: feature.trim(),
      audience: "general",
      mode,
    });
    router.push(`/generate?${params.toString()}`);
  }, [url, feature, mode, router]);

  const handleFeatureKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && feature.trim()) handleGenerate();
    },
    [feature, handleGenerate]
  );

  return (
    <main className="grain relative flex flex-col items-center justify-center min-h-screen px-4 md:px-6 py-16 bg-[var(--color-surface)] overflow-hidden">
      {/* Hero card */}
      <div
        className="relative w-full max-w-7xl min-h-[600px] rounded-[48px] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm overflow-hidden flex flex-col items-center justify-center"
        onMouseEnter={() => setIsCardHovered(true)}
        onMouseLeave={() => setIsCardHovered(false)}
      >
        {/* Dithering shader background */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-30 mix-blend-screen">
          <Suspense fallback={<div className="absolute inset-0 bg-white/5" />}>
            <Dithering
              colorBack="#00000000"
              colorFront="#EC4E02"
              shape="warp"
              type="4x4"
              speed={isCardHovered ? 0.6 : 0.2}
              style={{ width: "100%", height: "100%" }}
            />
          </Suspense>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-6">
          <AnimatePresence mode="wait">
            {flowState === "url-input" ? (
              <motion.div
                key="url-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.98 }}
                transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                className="flex flex-col items-center text-center"
              >
                {/* Badge */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.7,
                    delay: 0.1,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="mb-6"
                >
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-accent)]/10 bg-[var(--color-accent)]/5 px-4 py-1.5 text-sm font-medium text-[var(--color-accent)]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>
                    AI-Powered Demos
                  </span>
                </motion.div>

                {/* Headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="font-[family-name:var(--font-display)] italic text-5xl md:text-7xl lg:text-8xl tracking-tight mb-4 text-white"
                >
                  See what your agents shipped.
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.3,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="text-base text-[var(--color-text-muted)] max-w-md mx-auto leading-relaxed mb-10"
                >
                  Paste a URL. Get a narrated demo in seconds. No IDE required.
                </motion.p>

                {/* URL input */}
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: 0.4,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="w-full max-w-lg"
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

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.8 }}
                    className="text-center text-[11px] text-[var(--color-text-dim)] mt-4 tracking-wide"
                  >
                    press enter to continue
                  </motion.p>
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="brief-state"
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                className="w-full max-w-lg space-y-5"
              >
                {/* URL chip */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: 0.05,
                    duration: 0.35,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="flex justify-center"
                >
                  <div className="group inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-white/[0.04] border border-[var(--color-border)] text-[13px] text-[var(--color-text-muted)] transition-colors duration-200 hover:border-[var(--color-border-focus)]">
                    <Globe
                      size={13}
                      className="text-[var(--color-text-dim)] shrink-0"
                    />
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
                  transition={{
                    delay: 0.12,
                    duration: 0.4,
                    ease: EASE_OUT_EXPO,
                  }}
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
                  transition={{
                    delay: 0.18,
                    duration: 0.4,
                    ease: EASE_OUT_EXPO,
                  }}
                  className="flex items-center gap-2 justify-center"
                >
                  {MODES.map((t) => (
                    <button
                      key={t}
                      onClick={() => setMode(t)}
                      className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium capitalize transition-all duration-250 ${
                        mode === t
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
                  transition={{
                    delay: 0.24,
                    duration: 0.4,
                    ease: EASE_OUT_EXPO,
                  }}
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
      </div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 text-[11px] text-[var(--color-text-dim)] tracking-widest"
      >
        by Pelian Labs
      </motion.p>
    </main>
  );
}
