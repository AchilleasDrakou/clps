# Task: Live Workspace View — Agent Desktop for Left Panel

## Summary

Replace the left panel's static StageTimeline with a live "agent desktop" that shows users exactly what the pipeline is doing in real-time: search queries firing, pages being scraped, screenshots after each browser action, files being written. Users should feel like they're watching an agent work on their screen.

## Problem

Current left panel shows a static timeline of 7 nodes until capture starts, then flips to a browser iframe. Users stare at the sidebar text updates with no visual feedback. They have no idea what's actually happening — it feels like waiting for a loading bar.

## Vision

The left panel becomes a **live activity canvas** that evolves per stage:

### Stage: Discovering
- Show the Firecrawl search query being sent (animated typing effect)
- Results appear one by one as cards: favicon + title + URL
- Each card slides in with spring animation
- Visual: search engine results appearing in real-time

### Stage: Understanding
- Show each page being scraped with a mini browser-like frame
- Markdown content streams in (first ~200 chars preview)
- Token count appears as content loads
- Visual: documents being "read" and processed

### Stage: Planning
- Show the plan assembling: a timeline/storyboard of beats
- Each beat card appears as the LLM generates it
- Beat cards show: number, kind badge (click/reveal/type), label, action selector
- Narration text appears below each beat
- Visual: a storyboard/script being written

### Stage: Capturing (HIGHEST IMPACT)
- **Live browser iframe** (already exists) — make it the main focus
- **Action overlay**: show current action being executed ("clicking .btn-login", "typing hello@...")
- **Screenshot strip**: after each action completes, capture a screenshot thumbnail that slides into a filmstrip below the browser
- **Action checklist**: small overlay showing which actions are done/in-progress
- Visual: watching someone use a browser with an action log

### Stage: Rendering
- Show Remotion progress with a preview frame if available
- Or: filmstrip of captured screenshots with a "processing" overlay sweeping across them
- Visual: video editing in progress

### Stage: Narrating
- Show narration text per beat with a waveform/audio indicator
- Each segment lights up as it's generated
- Visual: voiceover recording session

### Stage: Merging
- Show video + audio tracks being combined
- Simple progress visualization
- Visual: final assembly

### Stage: Complete
- Video player (already exists)

## Backend Changes Required

### New SSE Event Data

Enrich `PipelineEvent.data` with:

```typescript
// types.ts additions
interface PipelineEvent {
  data?: {
    // existing fields...

    // NEW: Discovery detail
    searchQuery?: string;              // "login feature site:example.com"
    pageDiscovered?: {                 // emitted per page as found
      url: string;
      title: string;
      favicon?: string;
    };

    // NEW: Understanding detail
    scrapeProgress?: {
      url: string;
      title: string;
      charCount: number;              // how much markdown extracted
      tokenEstimate: number;
    };

    // NEW: Capture detail
    screenshot?: string;               // base64 data URI or path after each action
    currentAction?: {                  // what's happening RIGHT NOW
      index: number;
      total: number;
      type: string;
      selector?: string;
      text?: string;
    };

    // NEW: File operations
    fileOp?: {
      type: "write" | "read";
      path: string;                    // relative path (e.g., "output/demo-123/plan.json")
      sizeKb?: number;
    };

    // NEW: Rendering detail
    renderFrame?: string;              // preview frame base64 (sampled, not every frame)
    renderPercent?: number;            // 0-100 within rendering stage
  };
}
```

### Orchestrator Changes (`orchestrator.ts`)

1. **Discovering**: emit `searchQuery` before search, emit `pageDiscovered` per result
2. **Understanding**: emit `scrapeProgress` per page with char count
3. **Planning**: emit individual beats as they're planned (if possible to stream from LLM)
4. **Capturing**: emit `currentAction` BEFORE executing each action, emit `screenshot` AFTER each action
5. **File writes**: emit `fileOp` when plan.json, audio files, video files are created

### Capture Changes (`capture.ts`)

After each action, take a CDP screenshot:
```typescript
// After each action in the loop:
const screenshotResult = await fcFetch(`/browser/${sessionId}/execute`, {
  code: `const buf = await page.screenshot({ type: 'jpeg', quality: 60 }); return buf.toString('base64');`,
  language: "node",
  timeout: 5,
});
// Emit as screenshot data URI
```

## Frontend Component

### New: `app/generate/_components/live-workspace.tsx`

A component that receives pipeline state and renders the appropriate stage view.

```typescript
interface LiveWorkspaceProps {
  currentStage: string;
  // All the pipeline state needed to render each stage view
  searchQuery?: string;
  discoveredPages: { url: string; title: string; favicon?: string }[];
  scrapeProgress: { url: string; charCount: number }[];
  beats: DemoBeat[];
  currentAction?: { index: number; total: number; type: string; selector?: string };
  screenshots: string[];          // base64 thumbnails, one per completed action
  liveViewUrl: string | null;
  renderPercent: number;
  narrationScript: string[];
  narrationProgress: Set<string>;
  fileOps: { type: string; path: string; sizeKb?: number }[];
  percent: number;
  finalVideoPath: string | null;
}
```

### Stage Transitions
- Use `AnimatePresence mode="wait"` between stage views
- Each stage view fades/slides in
- Previous stage's final state briefly visible during transition

### Screenshot Filmstrip (during capture)
- Horizontal strip below browser iframe
- Thumbnails scroll left as new ones appear
- Click to enlarge
- Shows action label below each thumbnail

### File Activity Ticker
- Small persistent bar at bottom of workspace
- Shows recent file operations: "wrote plan.json (2.4kb)", "wrote beat-1.mp3 (148kb)"
- Fades in/out as ops happen

## Files to Create/Modify

| File | Change |
|------|--------|
| `lib/pipeline/types.ts` | Add new event data fields |
| `lib/pipeline/orchestrator.ts` | Emit granular events per stage |
| `lib/pipeline/capture.ts` | Add screenshot capture after each action |
| `lib/pipeline/discover.ts` | Emit per-page discovery events |
| `app/generate/_components/live-workspace.tsx` | **NEW** — main workspace component |
| `app/generate/_components/stage-views/` | **NEW** — per-stage view components |
| `app/generate/page.tsx` | Replace left panel with LiveWorkspace, add new state |

## Priority & Phasing

### Phase 1 (Highest Impact)
- Capture screenshots after each action (backend)
- Live browser + screenshot filmstrip + action overlay (frontend)
- File activity ticker

### Phase 2
- Discovery: search query animation + page cards appearing
- Planning: storyboard assembly view
- Understanding: scrape progress per page

### Phase 3
- Rendering: preview frames
- Narrating: waveform visualization
- Polish transitions between stages

## Open Questions
- Screenshot quality/size tradeoff — JPEG 60% quality? Resize to thumbnail on server or client?
- Should screenshots be base64 in SSE or written to disk and served via URL?
- Can we stream beats from the LLM planner (currently waits for full response)?
- How much does screenshot capture slow down the action loop?
