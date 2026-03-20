"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Mic, Type, ArrowRight, Sparkles } from "lucide-react";
import { VoiceAgent } from "@/components/voice-agent";
import { DemoBrief } from "@/lib/pipeline/types";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [feature, setFeature] = useState("");
  const [tone, setTone] = useState("professional");
  const [inputMode, setInputMode] = useState<"voice" | "text">(AGENT_ID ? "voice" : "text");

  function navigateToGenerate(brief: DemoBrief) {
    const params = new URLSearchParams({
      url: brief.url,
      feature: brief.feature,
      audience: brief.audience,
      tone: brief.tone,
    });
    router.push(`/generate?${params.toString()}`);
  }

  function handleTextSubmit() {
    if (!url || !feature) return;
    navigateToGenerate({
      url,
      feature,
      audience: "general",
      tone: tone as DemoBrief["tone"],
    });
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-8 bg-[#09090b]">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles size={20} className="text-gray-500" />
          <span className="text-xs font-medium text-gray-500 uppercase tracking-[0.2em]">
            by Pelian
          </span>
        </div>
        <h1 className="text-7xl font-bold tracking-tighter mb-3">Clips</h1>
        <p className="text-lg text-gray-500 max-w-md mx-auto">
          Demo videos for any website. Just describe what to show.
        </p>
      </motion.div>

      {/* Mode toggle */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="flex gap-1 p-1 rounded-xl border border-white/[0.06] bg-white/[0.02] mb-8"
      >
        <button
          onClick={() => setInputMode("voice")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            inputMode === "voice"
              ? "bg-white text-black shadow-sm"
              : "text-gray-500 hover:text-white"
          }`}
        >
          <Mic size={14} />
          Voice
        </button>
        <button
          onClick={() => setInputMode("text")}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
            inputMode === "text"
              ? "bg-white text-black shadow-sm"
              : "text-gray-500 hover:text-white"
          }`}
        >
          <Type size={14} />
          Text
        </button>
      </motion.div>

      {/* Voice mode */}
      {inputMode === "voice" && AGENT_ID && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <VoiceAgent agentId={AGENT_ID} onDemoRequested={navigateToGenerate} />
        </motion.div>
      )}

      {inputMode === "voice" && !AGENT_ID && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-gray-600"
        >
          Voice mode requires NEXT_PUBLIC_ELEVENLABS_AGENT_ID
        </motion.p>
      )}

      {/* Text mode */}
      {inputMode === "text" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-lg space-y-3"
        >
          <input
            type="url"
            placeholder="Website URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm"
          />
          <input
            type="text"
            placeholder="What feature to demo?"
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all text-sm"
          />
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-gray-400 focus:outline-none focus:border-white/20 transition-all text-sm"
          >
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="tutorial">Tutorial</option>
            <option value="cinematic">Cinematic</option>
          </select>

          <button
            onClick={handleTextSubmit}
            disabled={!url || !feature}
            className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
          >
            Generate Demo
            <ArrowRight size={14} />
          </button>
        </motion.div>
      )}

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-16 text-xs text-gray-700"
      >
        clps.ai
      </motion.p>
    </main>
  );
}
