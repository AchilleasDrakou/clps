import { execSync } from "child_process";
import path from "path";
import { CaptureResult, DemoPlan, RenderResult } from "./types";

// AGENT_RECORDER_PATH points to binary (e.g. .../agent-recorder/target/release/agent-recorder)
// We need the repo root where scripts/ lives
function resolveRecorderDir(): string {
  const envPath = process.env.AGENT_RECORDER_PATH;
  if (!envPath) return path.resolve("../agent-recorder");
  // Walk up from binary path until we find a directory containing scripts/
  let dir = path.dirname(envPath);
  for (let i = 0; i < 5; i++) {
    try {
      const fs = require("fs");
      if (fs.existsSync(path.join(dir, "scripts", "render-studio.mjs"))) return dir;
    } catch {}
    dir = path.dirname(dir);
  }
  return path.resolve("../agent-recorder");
}
const AGENT_RECORDER_DIR = resolveRecorderDir();

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
      `node "${renderScript}" --sidecar "${capture.sidecarPath}" --output "${studioVideoPath}"`,
      {
        cwd: AGENT_RECORDER_DIR,
        timeout: 300000, // 5 min max for Remotion render
        stdio: "pipe",
        env: {
          ...process.env,
          CHROME_BIN: process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        },
      }
    );
  } catch (err) {
    // If Remotion render fails, fall back to raw video if it exists
    console.warn("Remotion render failed:", err);
    const fs = await import("fs/promises");
    try {
      await fs.access(capture.rawVideoPath);
      await fs.copyFile(capture.rawVideoPath, studioVideoPath);
    } catch {
      // No raw video either — create empty placeholder so merge doesn't crash
      console.warn("No raw video found — capture likely failed");
      throw new Error("No video captured. Browser recording failed — check CDP connection.");
    }
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
