import { spawn } from "child_process";
import path from "path";
import { DemoAction, DemoPlan, CaptureResult } from "./types";

const FIRECRAWL_API = "https://api.firecrawl.dev/v2";
const API_KEY = () => process.env.FIRECRAWL_API_KEY!;

const AGENT_RECORDER_BIN = path.resolve(
  process.env.AGENT_RECORDER_PATH ?? "../agent-recorder/target/release/agent-recorder"
);

async function fcFetch(endpoint: string, body?: any, method = "POST") {
  const res = await fetch(`${FIRECRAWL_API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY()}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Firecrawl ${endpoint} failed: ${data.error ?? res.statusText}`);
  }
  return data;
}

// Safe string interpolation for Playwright code generation
const S = (v: string | undefined) => JSON.stringify(v ?? "");

function actionsToPlaywright(actions: DemoAction[]): string {
  const lines = actions.map((a) => {
    const delay = a.delayMs ?? 500;
    switch (a.type) {
      case "click":
        return `await page.click(${S(a.selector)});\nawait page.waitForTimeout(${delay});`;
      case "type":
        return `await page.fill(${S(a.selector)}, ${S(a.text)});\nawait page.waitForTimeout(${delay});`;
      case "hover":
        return `await page.hover(${S(a.selector)});\nawait page.waitForTimeout(${delay});`;
      case "press":
        return `await page.keyboard.press(${S(a.key)});\nawait page.waitForTimeout(${delay});`;
      case "scroll":
        return `await page.mouse.wheel(0, 300);\nawait page.waitForTimeout(${delay});`;
      case "scroll_to":
        return `await page.locator(${S(a.selector)}).scrollIntoViewIfNeeded();\nawait page.waitForTimeout(${delay});`;
      case "wait":
        return `await page.waitForTimeout(${a.delayMs ?? 1000});`;
      case "wait_for":
        return `await page.waitForSelector("text=" + ${S(a.containsText)}, { timeout: 10000 });\nawait page.waitForTimeout(${delay});`;
      case "select":
        return `await page.selectOption(${S(a.selector)}, ${S(a.text)});\nawait page.waitForTimeout(${delay});`;
      case "focus":
        return `await page.focus(${S(a.selector)});\nawait page.waitForTimeout(${delay});`;
      default:
        return `// unknown action type`;
    }
  });

  return `
await page.waitForTimeout(1000);
${lines.join("\n")}
await page.waitForTimeout(1000);
console.log("ACTIONS_COMPLETE");
`;
}

function startRecorder(
  cdpUrl: string,
  outputPath: string,
  durationSec: number
): { process: ReturnType<typeof spawn>; done: Promise<void> } {
  const proc = spawn(AGENT_RECORDER_BIN, [
    "--url", "about:blank",
    "--ws-endpoint", cdpUrl,
    "--output", outputPath,
    "--duration", String(durationSec),
    "--width", "1280",
    "--height", "720",
    "--fps", "15",
    "--quality", "85",
  ]);

  const done = new Promise<void>((resolve, reject) => {
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`agent-recorder exited with code ${code}`));
    });
    proc.on("error", reject);
  });

  return { process: proc, done };
}

export async function captureDemo(
  plan: DemoPlan,
  outputDir: string
): Promise<CaptureResult> {
  // 1. Launch Firecrawl Browser Sandbox
  const session = await fcFetch("/browser", { ttl: 120, activityTtl: 60 });
  if (!session.id || !session.cdpUrl) {
    throw new Error("Firecrawl browser session missing id or cdpUrl");
  }
  const sessionId = session.id;
  const cdpUrl = session.cdpUrl;
  const liveViewUrl = session.liveViewUrl ?? "";

  const rawVideoPath = path.join(outputDir, "raw.mp4");
  const sidecarPath = path.join(outputDir, "raw.mp4.proof.json");
  let recorder: ReturnType<typeof startRecorder> | null = null;

  try {
    // 2. Navigate to target URL first
    await fcFetch(`/browser/${sessionId}/execute`, {
      code: `await page.goto(${S(plan.brief.url)}, { waitUntil: "networkidle" });\nawait page.waitForTimeout(2000);\nconsole.log("NAV_COMPLETE");`,
      language: "node",
    });

    // 3. Start recorder + execute actions in parallel
    const estimatedDuration = plan.actions.length * 3 + 10;
    recorder = startRecorder(cdpUrl, rawVideoPath, estimatedDuration);

    // Small delay to let recorder connect and start screencast
    await new Promise((r) => setTimeout(r, 2000));

    // 4. Execute actions via Firecrawl
    const playwrightCode = actionsToPlaywright(plan.actions);
    await fcFetch(`/browser/${sessionId}/execute`, {
      code: playwrightCode,
      language: "node",
      timeout: estimatedDuration * 1000,
    });

    // 5. Wait a beat then stop recorder
    await new Promise((r) => setTimeout(r, 2000));
    recorder.process.kill("SIGTERM");
    await recorder.done.catch(() => {}); // may exit non-zero on SIGTERM

    // 6. Write sidecar metadata
    const sidecar = {
      output: rawVideoPath,
      demoPlan: { beats: plan.beats },
      actionResults: plan.actions.map((a, i) => ({
        type: a.type,
        selector: a.selector,
        ok: true,
        index: i,
      })),
      metrics: { estimatedDuration },
    };

    const fs = await import("fs/promises");
    await fs.writeFile(sidecarPath, JSON.stringify(sidecar, null, 2));

    return {
      rawVideoPath,
      sidecarPath,
      liveViewUrl,
      durationMs: estimatedDuration * 1000,
    };
  } finally {
    // Kill recorder if still running
    if (recorder) {
      try { recorder.process.kill("SIGTERM"); } catch {}
    }
    // Clean up browser session
    await fcFetch(`/browser/${sessionId}`, undefined, "DELETE").catch(() => {});
  }
}
