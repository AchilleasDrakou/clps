---
title: Dual-Mode Pipeline — Visual Workspace + Headless API
type: feat
status: in-progress
created: 2026-03-20
---

# Dual-Mode Pipeline — Visual Workspace + Headless API

## Problem

Clips has one mode: a browser-based UI that streams pipeline events via SSE. But the product is dual-purpose:

1. **Humans** want to watch the agent work in real-time — see screenshots, file operations, browser actions
2. **Agents/tools** want to POST a brief and get an MP4 back — no UI, maximum speed

The pipeline core is already decoupled (`orchestrator.ts` has zero UI deps), but:
- The visual mode lacks granular real-time feedback (no screenshots, no action overlay, no file ops)
- The headless mode exists (`route.ts`) but is barebones — no job tracking, no webhook, no artifact storage
- Screenshot capture doesn't exist yet — the biggest visual gap
- No infrastructure for storing/serving pipeline artifacts (screenshots, intermediate files)

## Solution

### Observable Pipeline with Conditional Subscription (Approach C)

Extend `runPipeline` with a `mode` option. Visual mode captures screenshots and emits granular events. Headless mode skips all visual work — zero overhead.

```typescript
interface PipelineOptions {
  mode: 'visual' | 'headless';
  onEvent?: (event: PipelineEvent) => void;
}

// Visual: captures screenshots, emits rich events → SSE stream
// Headless: no-op callbacks, skips screenshots → returns PipelineResult
```

### Infrastructure Layer

| Component | Purpose | When |
|-----------|---------|------|
| Local disk + `/api/artifacts/[id]` | Serve screenshots/files during pipeline run | Phase 1 (now) |
| Cloudflare R2 | Persistent artifact storage, presigned URLs | Phase 2 (when we need persistence/CDN) |
| Cloudflare Workers + Durable Objects | Long-running headless jobs beyond Vercel's 60s timeout | Phase 3 (when headless demand requires it) |

Start with local disk. Migrate to R2 when we need persistence or CDN. Workers when Vercel limits bite.

## Acceptance Criteria

### Pipeline Core
- [ ] `runPipeline` accepts `{ mode: 'visual' | 'headless' }` option
- [ ] `mode: 'headless'` skips screenshot capture — zero performance overhead
- [ ] `mode: 'visual'` captures CDP screenshot after each browser action
- [ ] Screenshots saved to `output/{runId}/screenshots/` directory
- [ ] New event types emitted: `screenshot`, `currentAction`, `scrapeProgress`, `fileOp`
- [ ] `PipelineEvent` type extended with new data fields

### Headless API (`POST /api/generate`)
- [ ] Returns `{ jobId, status }` immediately
- [ ] `GET /api/generate/[jobId]` returns job status + result when complete
- [ ] Job state stored in-memory (Map) for now — no DB needed yet
- [ ] Clean response shape: `{ jobId, status, result?: { videoUrl, duration, plan } }`
- [ ] Optional `webhookUrl` param — POST result to callback URL on completion

### Screenshot Serving
- [ ] `GET /api/artifacts/[runId]/[filename]` serves screenshots from disk
- [ ] Screenshots are JPEG, 60% quality, 1280x720
- [ ] SSE events include screenshot URL (not base64)
- [ ] Artifact cleanup: delete `output/{runId}/` after configurable TTL

### Live Workspace UI (Left Panel)
- [ ] Replaces static StageTimeline before capture starts
- [ ] **Discovering**: search query + page cards appearing
- [ ] **Understanding**: pages being scraped with content preview
- [ ] **Planning**: storyboard/beat timeline assembling
- [ ] **Capturing**: live browser + action overlay + screenshot filmstrip
- [ ] **Rendering/Narrating/Merging**: progress indicators
- [ ] **Complete**: video player (existing)
- [ ] File activity ticker at bottom of workspace
- [ ] Smooth transitions between stage views

### Enriched SSE Events
- [ ] `searchQuery` emitted before Firecrawl search
- [ ] `pageDiscovered` emitted per page as found
- [ ] `scrapeProgress` emitted per page with char count
- [ ] `currentAction` emitted BEFORE each browser action
- [ ] `screenshot` emitted AFTER each browser action (URL-based)
- [ ] `fileOp` emitted on file writes (plan.json, audio files, video)

## Technical Approach

### 1. Pipeline Options (lib/pipeline/orchestrator.ts)

```typescript
export interface PipelineOptions {
  mode: 'visual' | 'headless';
  onEvent?: (event: PipelineEvent) => void;
}

export async function runPipeline(
  brief: DemoBrief,
  options: PipelineOptions = { mode: 'headless' }
): Promise<PipelineResult> {
  const emit = options.onEvent ?? (() => {});
  // Pass mode to captureDemo for conditional screenshots
}
```

Backwards compat: existing `onProgress` callers migrated to `options.onEvent`.

### 2. Conditional Screenshot Capture (lib/pipeline/capture.ts)

```typescript
// Inside action loop, after each action:
if (mode === 'visual') {
  const screenshotCode = `
    const buf = await page.screenshot({ type: 'jpeg', quality: 60 });
    return buf.toString('base64');
  `;
  const result = await fcFetch(`/browser/${sessionId}/execute`, {
    code: screenshotCode, language: "node", timeout: 5
  });
  // Write to disk, emit URL
  const filename = `action-${i}.jpg`;
  await fs.writeFile(path.join(screenshotDir, filename), Buffer.from(result.result, 'base64'));
  emit({ type: 'screenshot', url: `/api/artifacts/${runId}/screenshots/${filename}`, actionIndex: i });
}
```

### 3. Headless API Enhancement (app/api/generate/route.ts)

```typescript
// In-memory job store (upgrade to Redis/KV later)
const jobs = new Map<string, { status: string; result?: PipelineResult; error?: string }>();

export async function POST(req: Request) {
  const { url, feature, tone, audience, webhookUrl } = await req.json();
  const jobId = `job-${Date.now()}`;
  jobs.set(jobId, { status: 'running' });

  // Fire and forget — don't await
  runPipeline(brief, { mode: 'headless' }).then(result => {
    jobs.set(jobId, { status: 'complete', result });
    if (webhookUrl) fetch(webhookUrl, { method: 'POST', body: JSON.stringify({ jobId, result }) });
  }).catch(err => {
    jobs.set(jobId, { status: 'error', error: err.message });
  });

  return Response.json({ jobId, status: 'running' });
}
```

### 4. Artifact Serving (app/api/artifacts/[...path]/route.ts)

Simple static file serving from `output/` directory with proper cache headers and MIME types.

### 5. Live Workspace Component (app/generate/_components/live-workspace.tsx)

Stage-aware component that renders the appropriate view based on `currentStage`. Receives all pipeline state as props. Uses `AnimatePresence` for transitions between stages.

### 6. Future: Cloudflare R2 Migration

When needed, swap local disk writes for R2 puts:
```typescript
// Before (local)
await fs.writeFile(path.join(screenshotDir, filename), buffer);
const url = `/api/artifacts/${runId}/screenshots/${filename}`;

// After (R2)
await r2.put(`${runId}/screenshots/${filename}`, buffer);
const url = await r2.createPresignedUrl(`${runId}/screenshots/${filename}`, { expiresIn: 300 });
```

SSE event shape stays the same — only the URL changes. Frontend doesn't care.

### 7. Future: Cloudflare Workers for Headless Jobs

If Vercel's 60s function timeout blocks long pipelines:
- Move `runPipeline` headless execution to a Cloudflare Worker with Durable Objects
- Worker manages job lifecycle, stores state, handles webhook callbacks
- Vercel API route becomes a thin proxy: POST to Worker, return jobId
- R2 stores all artifacts (screenshots, video files)
- This is a clean migration path — same API surface, different execution environment

## References

- `lib/pipeline/orchestrator.ts` — pipeline core (already decoupled)
- `lib/pipeline/capture.ts:119-134` — action loop insertion point for screenshots
- `app/api/generate/route.ts` — existing headless route (enhance)
- `app/api/generate/stream/route.ts` — existing SSE route (enrich events)
- `lib/pipeline/types.ts` — PipelineEvent type to extend
- `context/tasks/live-workspace-view.md` — detailed UI spec
- `context/tasks/hero-redesign.md` — hero card redesign
- `context/tasks/sidebar-pipeline-redesign.md` — sidebar redesign
