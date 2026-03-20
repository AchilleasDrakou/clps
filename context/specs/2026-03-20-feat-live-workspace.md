---
title: Live Workspace UI
type: feat
status: in-progress
created: 2026-03-20
---

# Live Workspace UI

## Problem
User submits a demo request and sees nothing until it's done. No visibility into what's happening.

## Solution
Real-time split-panel workspace that shows every pipeline stage as it happens — like watching a co-worker build the demo.

## Acceptance Criteria
- [ ] SSE endpoint streams enriched progress events (not just stage/message — includes data payloads)
- [ ] Orchestrator emits rich events: discovered pages, plan with beats/actions, live view URL, action execution status, narration segments, final video
- [ ] Generation page (`/generate`) with split-panel layout
- [ ] Left panel: Firecrawl Live View iframe (appears during capture stage)
- [ ] Right panel: scrolling activity feed showing each step with real data
- [ ] Demo plan renders as checklist — beats check off as they execute
- [ ] Narration script appears and populates per-beat
- [ ] Progress bar at bottom
- [ ] Final state: download button + video preview
- [ ] Landing page redirects to /generate on submit

## Technical Approach

### 1. Enriched progress events
Extend `PipelineProgress` type to carry data payloads:
```ts
interface PipelineEvent {
  stage: PipelineStage;
  message: string;
  percent: number;
  data?: {
    pages?: DiscoveredPage[];
    plan?: DemoPlan;
    liveViewUrl?: string;
    actionResult?: { index: number; type: string; ok: boolean };
    narrationSegment?: { beatId: string; durationMs: number };
    finalVideoPath?: string;
  };
}
```

### 2. SSE endpoint
`app/api/generate/stream/route.ts` — POST that returns `text/event-stream`. Orchestrator progress callback writes to the stream.

### 3. Generation page
`app/generate/page.tsx` — receives brief via query params or POST body, connects to SSE, renders workspace.

### 4. Layout
```
┌─────────────────────────────────────────────┐
│  Clips — Generating demo for {url}          │
├──────────────────────┬──────────────────────┤
│                      │  Activity Feed       │
│  Live Browser View   │  ✓ Found 3 pages     │
│  (iframe or          │  ✓ Scraped content    │
│   placeholder)       │  → Planning demo...  │
│                      │    beat-1: establish  │
│                      │    beat-2: click      │
│                      │  Narration Script     │
│                      │  "Here's how..."     │
├──────────────────────┴──────────────────────┤
│  ● Capturing...                        45%  │
└─────────────────────────────────────────────┘
```
