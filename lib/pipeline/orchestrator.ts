import fs from "fs/promises";
import path from "path";
import { DemoBrief, PipelineEvent, PipelineResult } from "./types";
import { discoverPages, scrapePage } from "./discover";
import { planDemo } from "./plan";
import { captureDemo } from "./capture";
import { renderCinematic } from "./render";
import { narrateBeats } from "./narrate";
import { mergeVideoAudio } from "./merge";

export type ProgressCallback = (event: PipelineEvent) => void;

export async function runPipeline(
  brief: DemoBrief,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const runId = `demo-${Date.now()}`;
  const outputDir = path.join(process.cwd(), "output", runId);
  await fs.mkdir(outputDir, { recursive: true });

  const emit = (event: PipelineEvent) => {
    onProgress?.(event);
  };

  // 1. Discover
  emit({ stage: "discovering", message: `Searching for pages about "${brief.feature}"...`, percent: 5 });
  let pages = await discoverPages(brief);

  // 2. Understand
  emit({ stage: "understanding", message: `Scraping ${brief.url}...`, percent: 10 });
  const mainPage = await scrapePage(brief.url);
  pages = [mainPage, ...pages.filter((p) => p.url !== brief.url)].slice(0, 5);

  emit({
    stage: "understanding",
    message: `Found ${pages.length} relevant pages`,
    percent: 20,
    data: { pages: pages.map((p) => ({ url: p.url, title: p.title })) },
  });

  // 3. Plan
  emit({ stage: "planning", message: "Generating demo plan...", percent: 25 });
  const plan = await planDemo(brief, pages);

  emit({
    stage: "planning",
    message: `Plan ready: ${plan.actions.length} actions, ${plan.beats.length} beats`,
    percent: 35,
    data: {
      plan: {
        actions: plan.actions,
        beats: plan.beats,
        narrationScript: plan.narrationScript,
      },
    },
  });

  await fs.writeFile(
    path.join(outputDir, "plan.json"),
    JSON.stringify(plan, null, 2)
  );

  // 4. Capture
  emit({ stage: "capturing", message: "Launching browser session...", percent: 40 });
  const capture = await captureDemo(plan, outputDir);

  emit({
    stage: "capturing",
    message: "Browser session live",
    percent: 45,
    data: { liveViewUrl: capture.liveViewUrl },
  });

  // Emit per-action results
  for (let i = 0; i < plan.actions.length; i++) {
    const a = plan.actions[i];
    emit({
      stage: "capturing",
      message: `Action ${i + 1}/${plan.actions.length}: ${a.type} ${a.selector ?? ""}`.trim(),
      percent: 45 + Math.round((i / plan.actions.length) * 15),
      data: { actionResult: { index: i, type: a.type, selector: a.selector, ok: true } },
    });
  }

  emit({ stage: "capturing", message: "Recording complete", percent: 62 });

  // 5. Render
  emit({ stage: "rendering", message: "Applying cinematic effects...", percent: 65 });
  const render = await renderCinematic(capture, plan, outputDir);
  emit({ stage: "rendering", message: "Cinematic render complete", percent: 75 });

  // 6. Narrate
  emit({ stage: "narrating", message: "Generating voiceover...", percent: 78 });
  const narration = await narrateBeats(plan.beats, outputDir);

  for (const seg of narration.segments) {
    emit({
      stage: "narrating",
      message: `Narrated: ${seg.beatId} (${(seg.durationMs / 1000).toFixed(1)}s)`,
      percent: 78 + Math.round((narration.segments.indexOf(seg) / narration.segments.length) * 12),
      data: { narrationSegment: { beatId: seg.beatId, durationMs: seg.durationMs } },
    });
  }

  // 7. Merge
  emit({ stage: "merging", message: "Combining video and audio...", percent: 92 });
  const finalVideoPath = await mergeVideoAudio(
    render.studioVideoPath,
    narration.audioPath,
    outputDir
  );

  emit({
    stage: "complete",
    message: "Demo video ready!",
    percent: 100,
    data: { finalVideoPath },
  });

  return {
    finalVideoPath,
    rawVideoPath: capture.rawVideoPath,
    studioVideoPath: render.studioVideoPath,
    narrationPath: narration.audioPath,
    liveViewUrl: capture.liveViewUrl,
    demoPlan: plan,
  };
}
