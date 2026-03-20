import fs from "fs/promises";
import path from "path";
import { DemoBrief, DemoPlan, PipelineProgress, PipelineResult } from "./types";
import { discoverPages, scrapePage } from "./discover";
import { planDemo } from "./plan";
import { captureDemo } from "./capture";
import { renderCinematic } from "./render";
import { narrateBeats } from "./narrate";
import { mergeVideoAudio } from "./merge";

export type ProgressCallback = (progress: PipelineProgress) => void;

export async function runPipeline(
  brief: DemoBrief,
  onProgress?: ProgressCallback
): Promise<PipelineResult> {
  const runId = `demo-${Date.now()}`;
  const outputDir = path.join(process.cwd(), "output", runId);
  await fs.mkdir(outputDir, { recursive: true });

  const emit = (stage: PipelineProgress["stage"], message: string, percent: number) => {
    onProgress?.({ stage, message, percent });
  };

  // 1. Discover
  emit("discovering", `Searching for pages about "${brief.feature}"...`, 5);
  let pages = await discoverPages(brief);

  // 2. Understand — always scrape the main URL + any discovered pages
  emit("understanding", `Scraping ${brief.url}...`, 15);
  const mainPage = await scrapePage(brief.url);
  pages = [mainPage, ...pages.filter((p) => p.url !== brief.url)].slice(0, 5);

  // 3. Plan
  emit("planning", "Generating demo plan...", 30);
  const plan = await planDemo(brief, pages);

  // Save plan for debugging
  await fs.writeFile(
    path.join(outputDir, "plan.json"),
    JSON.stringify(plan, null, 2)
  );

  // 4. Capture
  emit("capturing", "Recording browser session...", 45);
  const capture = await captureDemo(plan, outputDir);

  // 5. Render
  emit("rendering", "Applying cinematic effects...", 65);
  const render = await renderCinematic(capture, plan, outputDir);

  // 6. Narrate
  emit("narrating", "Generating voiceover...", 80);
  const narration = await narrateBeats(plan.beats, outputDir);

  // 7. Merge
  emit("merging", "Combining video and audio...", 92);
  const finalVideoPath = await mergeVideoAudio(
    render.studioVideoPath,
    narration.audioPath,
    outputDir
  );

  emit("complete", "Demo video ready!", 100);

  return {
    finalVideoPath,
    rawVideoPath: capture.rawVideoPath,
    studioVideoPath: render.studioVideoPath,
    narrationPath: narration.audioPath,
    liveViewUrl: capture.liveViewUrl,
    demoPlan: plan,
  };
}
