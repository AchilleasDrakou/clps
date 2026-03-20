import fs from "fs/promises";
import path from "path";
import { DemoBrief, DiscoveredPage, PipelineEvent, PipelineOptions, PipelineResult } from "./types";
import { discoverPages, scrapePage } from "./discover";
import { planDemo } from "./plan";
import { captureDemo } from "./capture";
import { renderCinematic } from "./render";
import { narrateBeats } from "./narrate";
import { mergeVideoAudio } from "./merge";

export async function runPipeline(
  brief: DemoBrief,
  options?: PipelineOptions,
  cachedMainPage?: { url: string; title: string; description: string; markdown: string }
): Promise<PipelineResult> {
  const { mode = "headless", onEvent } = options ?? {};
  const runId = `demo-${Date.now()}`;
  const outputDir = path.join(process.cwd(), "output", runId);
  await fs.mkdir(outputDir, { recursive: true });

  const emit = (event: PipelineEvent) => onEvent?.(event);
  const isVisual = mode === "visual";

  // 1. Discover — search returns markdown inline, so no separate scraping needed
  const hostname = new URL(brief.url.startsWith("http") ? brief.url : `https://${brief.url}`).hostname;
  const searchQuery = `${brief.feature} site:${hostname}`;
  emit({ stage: "discovering", message: `Searching for "${brief.feature}"...`, percent: 5, data: { searchQuery } });

  const [searchResults, mainPage] = await Promise.all([
    discoverPages(brief),
    cachedMainPage
      ? Promise.resolve(cachedMainPage as DiscoveredPage)
      : scrapePage(brief.url),
  ]);

  // Search results already have markdown — use directly, don't re-scrape
  const pages = [mainPage, ...searchResults.filter((p) => p.url !== brief.url)].slice(0, 3);

  // Emit per-page discovery events in visual mode
  if (isVisual) {
    for (const page of pages) {
      emit({ stage: "discovering", message: `Found: ${page.title || page.url}`, percent: 10, data: { pageDiscovered: { url: page.url, title: page.title } } });
    }
  }

  emit({
    stage: "understanding",
    message: `${pages.length} pages ready${cachedMainPage ? " (pre-cached)" : ""}`,
    percent: 20,
    data: { pages: pages.map((p) => ({ url: p.url, title: p.title })) },
  });

  // Emit per-page scrape progress in visual mode
  if (isVisual) {
    for (const page of pages) {
      const charCount = page.markdown.length;
      emit({ stage: "understanding", message: `Scraped: ${page.title || page.url}`, percent: 20, data: { scrapeProgress: { url: page.url, title: page.title, charCount, tokenEstimate: Math.ceil(charCount / 4) } } });
    }
  }

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

  const planJson = JSON.stringify(plan, null, 2);
  await fs.writeFile(path.join(outputDir, "plan.json"), planJson);
  if (isVisual) {
    emit({ stage: "planning", message: "Saved plan.json", percent: 36, data: { fileOp: { type: "write", path: `output/${runId}/plan.json`, sizeKb: Math.ceil(planJson.length / 1024) } } });
  }

  // 3. Capture + Narration in parallel
  emit({ stage: "capturing", message: "Launching browser...", percent: 40 });
  emit({ stage: "narrating", message: "Generating voiceover...", percent: 40 });

  const [capture, narration] = await Promise.all([
    captureDemo(plan, outputDir, isVisual ? emit : undefined).then((c) => {
      emit({ stage: "capturing", message: "Recording complete", percent: 62, data: { liveViewUrl: c.liveViewUrl } });
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
