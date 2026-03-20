export interface DemoBrief {
  url: string;
  feature: string;
  audience: "buyers" | "users" | "engineers" | "general";
  tone: "professional" | "casual" | "tutorial" | "cinematic";
}

export interface DiscoveredPage {
  url: string;
  title: string;
  description: string;
  markdown: string;
}

export interface DemoAction {
  type: "click" | "hover" | "type" | "press" | "scroll" | "scroll_to" | "wait" | "wait_for" | "select" | "focus";
  selector?: string;
  text?: string;
  key?: string;
  containsText?: string;
  delayMs?: number;
}

export interface DemoBeat {
  id: string;
  kind: "establish" | "click" | "reveal" | "type" | "press" | "overview" | "outro";
  label: string;
  caption: string;
  narrationText: string;
  holdMs: number;
  actionIndex?: number;
  camera?: {
    mode: "overview" | "focus";
    emphasis: "wide" | "subtle" | "detail" | "hero";
  };
}

export interface DemoPlan {
  brief: DemoBrief;
  pages: DiscoveredPage[];
  actions: DemoAction[];
  beats: DemoBeat[];
  narrationScript: string[];
}

export interface CaptureResult {
  rawVideoPath: string;
  sidecarPath: string;
  liveViewUrl: string;
  durationMs: number;
}

export interface RenderResult {
  studioVideoPath: string;
  beatTimings: { beatId: string; startMs: number; endMs: number }[];
}

export interface NarrationSegment {
  beatId: string;
  audioPath: string;
  durationMs: number;
  wordTimestamps: { word: string; startMs: number; endMs: number }[];
}

export interface NarrationResult {
  audioPath: string;
  segments: NarrationSegment[];
  totalDurationMs: number;
}

export interface PipelineResult {
  finalVideoPath: string;
  rawVideoPath: string;
  studioVideoPath: string;
  narrationPath: string;
  liveViewUrl: string;
  demoPlan: DemoPlan;
}

export type PipelineStage =
  | "discovering"
  | "understanding"
  | "planning"
  | "capturing"
  | "rendering"
  | "narrating"
  | "merging"
  | "complete"
  | "error";

export interface PipelineProgress {
  stage: PipelineStage;
  message: string;
  percent: number;
}
