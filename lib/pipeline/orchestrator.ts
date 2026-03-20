import fs from "fs/promises";
import path from "path";
import { DemoBrief, DiscoveredPage, PipelineEvent, PipelineResult } from "./types";
import { discoverPages, scrapePage } from "./discover";
import { planDemo } from "./plan";
import { captureDemo } from "./capture";
import { renderCinematic } from "./render";
import { narrateBeats } from "./narrate";
import { mergeVideoAudio } from "./merge";

export type ProgressCallback = (event: PipelineEvent) => void;

export async function runPipeline(
  brief: DemoBrief,
  onProgress?: ProgressCallback,
  cachedMainPage?: { url: string; title: string; description: string; markdown: string }
): Promise<PipelineResult> {
  const runId = `demo-${Date.now()}`;
  const outputDir = path.join(process.cwd(), "output", runId);
  await fs.mkdir(outputDir, { recursive: true });

  const emit = (event: PipelineEvent) => onProgress?.(event);

  // 1. Discover — search returns markdown inline, so no separate scraping needed
  // If we have cached main page from pre-scrape, skip that scrape entirely
  emit({ stage: "discovering", message: `Searching for "${brief.feature}"...`, percent: 5 });

  const [searchResults, mainPage] = await Promise.all([
    discoverPages(brief),
    cachedMainPage
      ? Promise.resolve(cachedMainPage as DiscoveredPage)
      : scrapePage(brief.url),
  ]);

  // Search results already have markdown — use directly, don't re-scrape
  const pages = [mainPage, ...searchResults.filter((p) => p.url !== brief.url)].slice(0, 3);

  emit({
    stage: "understanding",
    message: `${pages.length} pages ready${cachedMainPage ? " (pre-cached)" : ""}`,
    percent: 20,
    data: { pages: pages.map((p) => ({ url: p.url, title: p.title })) },
  });

  // 2. Plan
  emit({ stage: "planning", message: "Generating demo plan...", percent: 25 });
  const plan = await planDemo(brief, pages);

  emit({
    stage: "planning",
    message: `${plan.actions.length} actions, ${plan.beats.length} beats`,
    percent: 35,
    data: {
      plan: {
        actions: plan.actions,
        beats: plan.beats,
        narrationScript: plan.narrationScript,
      },
    },
  });

  await fs.writeFile(path.join(outputDir, "plan.json"), JSON.stringify(plan, null, 2));

  // 3. Capture + Narration in parallel
  // Both emit their own stage events — UI should show both as active
  emit({ stage: "capturing", message: "Launching browser...", percent: 40 });
  emit({ stage: "narrating", message: "Generating voiceover...", percent: 40 });

  const [capture, narration] = await Promise.all([
    captureDemo(plan, outputDir).then((c) => {
      emit({ stage: "capturing", message: "Recording complete", percent: 62, data: { liveViewUrl: c.liveViewUrl } });
      for (let i = 0; i < plan.actions.length; i++) {
        const a = plan.actions[i];
        emit({
          stage: "capturing",
          message: `${a.type} ${a.selector ?? ""}`.trim(),
          percent: 45 + Math.round((i / plan.actions.length) * 15),
          data: { actionResult: { index: i, type: a.type, selector: a.selector, ok: true } },
        });
      }
      return c;
    }),
    (async () => {
      const n = await narrateBeats(plan.beats, outputDir);
      for (let i = 0; i < n.segments.length; i++) {
        const seg = n.segments[i];
        emit({
          stage: "narrating",
          message: `Beat ${i + 1}/${n.segments.length}`,
          percent: 78 + Math.round((i / n.segments.length) * 12),
          data: { narrationSegment: { beatId: seg.beatId, durationMs: seg.durationMs } },
        });
      }
      return n;
    })(),
  ]);

  // 4. Render
  emit({ stage: "rendering", message: "Applying cinematic effects...", percent: 65 });
  const render = await renderCinematic(capture, plan, outputDir);

  // 5. Merge
  emit({ stage: "merging", message: "Combining video and audio...", percent: 92 });
  const finalVideoPath = await mergeVideoAudio(
    render.studioVideoPath,
    narration.audioPath,
    outputDir
  );

  emit({ stage: "complete", message: "Demo video ready!", percent: 100, data: { finalVideoPath } });

  return {
    finalVideoPath,
    rawVideoPath: capture.rawVideoPath,
    studioVideoPath: render.studioVideoPath,
    narrationPath: narration.audioPath,
    liveViewUrl: capture.liveViewUrl,
    demoPlan: plan,
  };
}
