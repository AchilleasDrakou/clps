"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceAgent } from "@/components/voice-agent";
import { DemoBrief } from "@/lib/pipeline/types";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "";

export default function Home() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [feature, setFeature] = useState("");
  const [tone, setTone] = useState("professional");
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");

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
    <main className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-6xl font-bold tracking-tight mb-2">Clips</h1>
      <p className="text-lg text-gray-400 mb-8">
        Demo videos for any website. Powered by voice.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setInputMode("voice")}
          className={`px-4 py-2 rounded-lg text-sm transition ${
            inputMode === "voice"
              ? "bg-white text-black"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Voice
        </button>
        <button
          onClick={() => setInputMode("text")}
          className={`px-4 py-2 rounded-lg text-sm transition ${
            inputMode === "text"
              ? "bg-white text-black"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Text
        </button>
      </div>

      {/* Voice mode */}
      {inputMode === "voice" && AGENT_ID && (
        <VoiceAgent
          agentId={AGENT_ID}
          onDemoRequested={navigateToGenerate}
        />
      )}

      {inputMode === "voice" && !AGENT_ID && (
        <p className="text-sm text-gray-500 mb-4">
          Set NEXT_PUBLIC_ELEVENLABS_AGENT_ID to enable voice mode.
        </p>
      )}

      {/* Text mode */}
      {inputMode === "text" && (
        <div className="w-full max-w-lg space-y-4">
          <input
            type="url"
            placeholder="Website URL (e.g. https://stripe.com/payments)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
          />
          <input
            type="text"
            placeholder="Feature to demo (e.g. Stripe Checkout setup)"
            value={feature}
            onChange={(e) => setFeature(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-white"
          />
          <select
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-white"
          >
            <option value="professional">Professional</option>
            <option value="casual">Casual</option>
            <option value="tutorial">Tutorial</option>
            <option value="cinematic">Cinematic</option>
          </select>

          <button
            onClick={handleTextSubmit}
            disabled={!url || !feature}
            className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Generate Demo
          </button>
        </div>
      )}
    </main>
  );
}
