"use client";

import { useConversation } from "@elevenlabs/react";
import { useCallback, useState } from "react";
import { DemoBrief } from "@/lib/pipeline/types";

interface VoiceAgentProps {
  agentId: string;
  onDemoRequested: (brief: DemoBrief) => void;
  onStatusChange?: (status: string) => void;
}

export function VoiceAgent({ agentId, onDemoRequested, onStatusChange }: VoiceAgentProps) {
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<"speaking" | "listening" | "idle">("idle");
  const [transcript, setTranscript] = useState<string[]>([]);

  const conversation = useConversation({
    onConnect: () => {
      setIsActive(true);
      onStatusChange?.("Connected");
    },
    onDisconnect: () => {
      setIsActive(false);
      setMode("idle");
      onStatusChange?.("Disconnected");
    },
    onMessage: (message) => {
      if (message.source === "ai") {
        setTranscript((prev) => [...prev.slice(-8), `Clippee: ${message.message}`]);
      } else {
        setTranscript((prev) => [...prev.slice(-8), `You: ${message.message}`]);
      }
    },
    onModeChange: (data) => {
      setMode(data.mode === "speaking" ? "speaking" : data.mode === "listening" ? "listening" : "idle");
    },
    clientTools: {
      start_demo_generation: async (params: any) => {
        const brief: DemoBrief = {
          url: params.url,
          feature: params.feature,
          audience: params.audience ?? "general",
          tone: params.tone ?? "professional",
        };
        onDemoRequested(brief);
        return "Demo generation started. The user can see the live view.";
      },
    },
  });

  const handleToggle = useCallback(async () => {
    if (isActive) {
      await conversation.endSession();
    } else {
      await conversation.startSession({ agentId, connectionType: "websocket" });
    }
  }, [isActive, agentId, conversation]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mic button */}
      <button
        onClick={handleToggle}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
          isActive
            ? mode === "speaking"
              ? "bg-blue-500 scale-110 animate-pulse"
              : mode === "listening"
              ? "bg-red-500 scale-105"
              : "bg-green-500"
            : "bg-gray-700 hover:bg-gray-600"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {isActive ? (
            <>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </>
          ) : (
            <>
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </>
          )}
        </svg>
      </button>

      <span className="text-sm text-gray-400">
        {!isActive
          ? "Tap to talk to Clippee"
          : mode === "listening"
          ? "Listening..."
          : mode === "speaking"
          ? "Clippee is speaking..."
          : "Connected"}
      </span>

      {/* Transcript */}
      {transcript.length > 0 && (
        <div className="w-full max-w-lg mt-4 space-y-1">
          {transcript.map((line, i) => (
            <p
              key={i}
              className={`text-sm ${
                line.startsWith("Clippee:") ? "text-blue-400" : "text-gray-300"
              }`}
            >
              {line}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
