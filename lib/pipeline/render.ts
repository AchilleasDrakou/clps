import { execSync } from "child_process";
import path from "path";
import { CaptureResult, DemoPlan, RenderResult } from "./types";

const AGENT_RECORDER_DIR = path.resolve(
  process.env.AGENT_RECORDER_PATH
    ? path.dirname(process.env.AGENT_RECORDER_PATH)
    : "../agent-recorder"
);

export async function renderCinematic(
  capture: CaptureResult,
  plan: DemoPlan,
  outputDir: string
): Promise<RenderResult> {
  const studioVideoPath = path.join(outputDir, "studio.mp4");

  // Call agent-recorder's render-studio.mjs
  // It reads the raw video + sidecar and produces a Remotion-rendered cinematic version
  const renderScript = path.join(AGENT_RECORDER_DIR, "scripts", "render-studio.mjs");

  try {
    execSync(
      `node "${renderScript}" --input "${capture.rawVideoPath}" --output "${studioVideoPath}" --sidecar "${capture.sidecarPath}"`,
      {
        cwd: AGENT_RECORDER_DIR,
        timeout: 300000, // 5 min max for Remotion render
        stdio: "pipe",
      }
    );
  } catch (err) {
    // If Remotion render fails, fall back to raw video
    console.warn("Remotion render failed, using raw video:", err);
    const fs = await import("fs/promises");
    await fs.copyFile(capture.rawVideoPath, studioVideoPath);
  }

  // Extract beat timings from plan
  let cumulativeMs = 0;
  const beatTimings = plan.beats.map((b) => {
    const start = cumulativeMs;
    cumulativeMs += b.holdMs;
    return { beatId: b.id, startMs: start, endMs: cumulativeMs };
  });

  return { studioVideoPath, beatTimings };
}
