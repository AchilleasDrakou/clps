import { spawn } from "child_process";
import fsPromises from "fs/promises";
import path from "path";
import { DemoAction, DemoPlan, CaptureResult, PipelineEvent } from "./types";

type EmitFn = (event: PipelineEvent) => void;

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
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok || data.error) {
    console.error(`[Firecrawl] ${endpoint} ${res.status}:`, JSON.stringify(data).slice(0, 500));
    throw new Error(`Firecrawl ${endpoint} failed: ${data.error ?? data.message ?? data.raw ?? res.statusText}`);
  }
  return data;
}

const S = (v: string | undefined) => JSON.stringify(v ?? "");

function actionToPlaywright(a: DemoAction): string {
  const delay = a.delayMs ?? 300; // reduced from 500
  switch (a.type) {
    case "click":
      return `await page.click(${S(a.selector)}, { timeout: 5000 });\nawait page.waitForTimeout(${delay});`;
    case "type":
      return `await page.fill(${S(a.selector)}, ${S(a.text)}, { timeout: 5000 });\nawait page.waitForTimeout(${delay});`;
    case "hover":
      return `await page.hover(${S(a.selector)}, { timeout: 5000 });\nawait page.waitForTimeout(${delay});`;
    case "press":
      return `await page.keyboard.press(${S(a.key)});\nawait page.waitForTimeout(${delay});`;
    case "scroll":
      return `await page.mouse.wheel(0, 300);\nawait page.waitForTimeout(${delay});`;
    case "scroll_to":
      return `await page.locator(${S(a.selector)}).scrollIntoViewIfNeeded({ timeout: 5000 });\nawait page.waitForTimeout(${delay});`;
    case "wait":
      return `await page.waitForTimeout(${Math.min(a.delayMs ?? 500, 2000)});`;
    case "wait_for":
      return `await page.waitForSelector("text=" + ${S(a.containsText)}, { timeout: 5000 }).catch(() => null);\nawait page.waitForTimeout(${delay});`;
    case "select":
      return `await page.selectOption(${S(a.selector)}, ${S(a.text)}, { timeout: 5000 });\nawait page.waitForTimeout(${delay});`;
    case "focus":
      return `await page.focus(${S(a.selector)}, { timeout: 5000 });\nawait page.waitForTimeout(${delay});`;
    default:
      return `// skip unknown action`;
  }
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
    "--jpeg-quality", "85",
  ]);

  let stderr = "";
  proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });
  proc.stdout?.on("data", (d: Buffer) => { console.log(`[recorder] ${d.toString().trim()}`); });

  const done = new Promise<void>((resolve, reject) => {
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`agent-recorder exited ${code}: ${stderr.slice(-300)}`));
    });
    proc.on("error", reject);
  });

  return { process: proc, done };
}

export async function captureDemo(
  plan: DemoPlan,
  outputDir: string,
  visualEmit?: EmitFn,
  signal?: AbortSignal
): Promise<CaptureResult> {
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
    // Navigate — use domcontentloaded instead of networkidle (much faster)
    await fcFetch(`/browser/${sessionId}/execute`, {
      code: `await page.goto(${S(plan.brief.url)}, { waitUntil: "domcontentloaded", timeout: 15000 });\nawait page.waitForTimeout(1000);`,
      language: "node",
      timeout: 30,
    });

    // Start recorder
    const estimatedDuration = Math.min(plan.actions.length * 2 + 8, 60);
    recorder = startRecorder(cdpUrl, rawVideoPath, estimatedDuration);
    await new Promise((r) => setTimeout(r, 1000)); // 1s instead of 2s

    // Screenshot directory for visual mode
    const screenshotDir = path.join(outputDir, "screenshots");
    if (visualEmit) await fsPromises.mkdir(screenshotDir, { recursive: true });

    // Execute actions one at a time — resilient to individual failures
    const actionResults = [];
    const runId = path.basename(outputDir);
    for (let i = 0; i < plan.actions.length; i++) {
      if (signal?.aborted) {
        console.log("[Capture] Aborted — stopping action execution");
        break;
      }
      const action = plan.actions[i];
      const code = actionToPlaywright(action);

      // Visual: emit currentAction BEFORE execution
      if (visualEmit) {
        visualEmit({ stage: "capturing", message: `${action.type} ${action.selector ?? ""}`.trim(), percent: 45 + Math.round((i / plan.actions.length) * 15), data: { currentAction: { index: i, total: plan.actions.length, type: action.type, selector: action.selector, text: action.text } } });
      }

      try {
        await fcFetch(`/browser/${sessionId}/execute`, {
          code,
          language: "node",
          timeout: 15,
        });
        actionResults.push({ type: action.type, selector: action.selector, ok: true, index: i });

        // Visual: capture screenshot after successful action (async, don't block on failure)
        if (visualEmit) {
          try {
            const screenshotResult = await fcFetch(`/browser/${sessionId}/execute`, {
              code: `const buf = await page.screenshot({ type: 'jpeg', quality: 60 });\nreturn buf.toString('base64');`,
              language: "node",
              timeout: 5,
            });
            if (screenshotResult.result) {
              const filename = `action-${i}.jpg`;
              await fsPromises.writeFile(path.join(screenshotDir, filename), Buffer.from(screenshotResult.result, "base64"));
              visualEmit({ stage: "capturing", message: `Screenshot ${i + 1}/${plan.actions.length}`, percent: 45 + Math.round((i / plan.actions.length) * 15), data: { screenshot: { url: `/api/artifacts/${runId}/screenshots/${filename}`, actionIndex: i } } });
            }
          } catch {
            // Screenshot failed — don't block pipeline
          }
        }
      } catch (err: any) {
        console.warn(`[Capture] Action ${i} failed: ${err.message}`);
        actionResults.push({ type: action.type, selector: action.selector, ok: false, index: i });
      }
    }

    // Brief pause then stop recorder
    await new Promise((r) => setTimeout(r, 1000));
    recorder.process.kill("SIGTERM");
    await recorder.done.catch(() => {});

    const sidecar = {
      output: rawVideoPath,
      demoPlan: { beats: plan.beats },
      actionResults,
      metrics: { estimatedDuration },
    };

    await fsPromises.writeFile(sidecarPath, JSON.stringify(sidecar, null, 2));

    return { rawVideoPath, sidecarPath, liveViewUrl, durationMs: estimatedDuration * 1000 };
  } finally {
    if (recorder) {
      try { recorder.process.kill("SIGTERM"); } catch {}
    }
    await fcFetch(`/browser/${sessionId}`, undefined, "DELETE").catch(() => {});
  }
}
