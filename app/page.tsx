"use client";

import { useState } from "react";
import { VoiceAgent } from "@/components/voice-agent";
import { DemoBrief } from "@/lib/pipeline/types";

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID ?? "";

export default function Home() {
  const [url, setUrl] = useState("");
  const [feature, setFeature] = useState("");
  const [tone, setTone] = useState<string>("professional");
  const [status, setStatus] = useState<string | null>(null);
  const [liveViewUrl, setLiveViewUrl] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");

  async function startGeneration(brief: DemoBrief) {
    setGenerating(true);
    setStatus("Starting pipeline...");
    setUrl(brief.url);
    setFeature(brief.feature);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(brief),
      });

      const data = await res.json();
      if (data.success) {
        setStatus(`Done! Video ready.`);
        if (data.liveViewUrl) setLiveViewUrl(data.liveViewUrl);
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  }

  function handleTextSubmit() {
    if (!url || !feature) return;
    startGeneration({ url, feature, audience: "general", tone: tone as any });
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
          onDemoRequested={startGeneration}
          onStatusChange={(s) => setStatus(s)}
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
            disabled={generating || !url || !feature}
            className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {generating ? "Generating..." : "Generate Demo"}
          </button>
        </div>
      )}

      {/* Status */}
      {status && (
        <div className="mt-8 p-4 bg-gray-900 border border-gray-700 rounded-lg max-w-lg w-full">
          <p className="text-sm text-gray-300">{status}</p>
        </div>
      )}

      {/* Live View */}
      {liveViewUrl && (
        <div className="mt-8 w-full max-w-4xl">
          <h2 className="text-sm text-gray-400 mb-2">Live View — watching the demo being recorded</h2>
          <iframe
            src={liveViewUrl}
            className="w-full h-[500px] rounded-lg border border-gray-700"
          />
        </div>
      )}
    </main>
  );
}
