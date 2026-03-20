import { chromium } from "playwright-core";
import { execSync } from "child_process";
import fsPromises from "fs/promises";
import path from "path";
import { DemoAction, DemoPlan, CaptureResult, PipelineEvent } from "./types";

type EmitFn = (event: PipelineEvent) => void;

const FIRECRAWL_API = "https://api.firecrawl.dev/v2";
const API_KEY = () => process.env.FIRECRAWL_API_KEY!;

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

async function executeAction(page: any, action: DemoAction): Promise<boolean> {
  const delay = action.delayMs ?? 300;
  try {
    switch (action.type) {
      case "click":
        await page.click(action.selector!, { timeout: 5000 });
        break;
      case "type":
        await page.fill(action.selector!, action.text ?? "", { timeout: 5000 });
        break;
      case "hover":
        await page.hover(action.selector!, { timeout: 5000 });
        break;
      case "press":
        await page.keyboard.press(action.key!);
        break;
      case "scroll":
        await page.mouse.wheel(0, 300);
        break;
      case "scroll_to":
        await page.locator(action.selector!).scrollIntoViewIfNeeded({ timeout: 5000 });
        break;
      case "wait":
        await page.waitForTimeout(Math.min(action.delayMs ?? 500, 2000));
        return true; // no additional delay needed
      case "wait_for":
        await page.waitForSelector(`text=${action.containsText}`, { timeout: 5000 }).catch(() => null);
        break;
      case "select":
        await page.selectOption(action.selector!, action.text ?? "", { timeout: 5000 });
        break;
      case "focus":
        await page.focus(action.selector!, { timeout: 5000 });
        break;
    }
    await page.waitForTimeout(delay);
    return true;
  } catch (err: any) {
    console.warn(`[Capture] Action ${action.type} ${action.selector ?? ""} failed: ${err.message}`);
    return false;
  }
}

export async function captureDemo(
  plan: DemoPlan,
  outputDir: string,
  visualEmit?: EmitFn,
  signal?: AbortSignal
): Promise<CaptureResult> {
  // 1. Launch Firecrawl Browser Sandbox
  const session = await fcFetch("/browser", { ttl: 180, activityTtl: 120 });
  if (!session.id || !session.cdpUrl) {
    throw new Error("Firecrawl browser session missing id or cdpUrl");
  }
  const sessionId = session.id;
  const cdpUrl = session.cdpUrl;
  const liveViewUrl = session.liveViewUrl ?? "";

  const videoDir = path.join(outputDir, "video");
  await fsPromises.mkdir(videoDir, { recursive: true });

  const rawVideoPath = path.join(outputDir, "raw.mp4");
  const sidecarPath = path.join(outputDir, "raw.mp4.proof.json");

  // Screenshot directory for visual mode
  const screenshotDir = path.join(outputDir, "screenshots");
  if (visualEmit) await fsPromises.mkdir(screenshotDir, { recursive: true });

  let browser: any = null;

  try {
    // 2. Connect local Playwright to Firecrawl's browser via CDP
    console.log("[Capture] Connecting Playwright to Firecrawl CDP...");
    browser = await chromium.connectOverCDP(cdpUrl);

    // 3. Get the existing context and create a new page with video recording
    const context = browser.contexts()[0] ?? await browser.newContext({
      recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
    });

    // If context already exists (from Firecrawl), create page with video in a new context
    const recordingContext = await browser.newContext({
      recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
    });
    const page = await recordingContext.newPage();

    // 4. Navigate to target URL
    console.log(`[Capture] Navigating to ${plan.brief.url}...`);
    await page.goto(plan.brief.url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1000);

    // 5. Execute actions — Playwright directly, not via Firecrawl execute API
    const actionResults = [];
    const runId = path.basename(outputDir);
    for (let i = 0; i < plan.actions.length; i++) {
      if (signal?.aborted) {
        console.log("[Capture] Aborted — stopping action execution");
        break;
      }
      const action = plan.actions[i];

      // Visual: emit currentAction BEFORE execution
      if (visualEmit) {
        const pct = 45 + Math.round((i / plan.actions.length) * 15);
        visualEmit({
          stage: "capturing",
          message: `${action.type} ${action.selector ?? ""}`.trim(),
          percent: pct,
          data: {
            currentAction: {
              index: i,
              total: plan.actions.length,
              type: action.type,
              selector: action.selector,
              text: action.text,
            },
          },
        });
      }

      console.log(`[Capture] Action ${i + 1}/${plan.actions.length}: ${action.type} ${action.selector ?? ""}`);
      const ok = await executeAction(page, action);
      actionResults.push({ type: action.type, selector: action.selector, ok, index: i });

      // Visual: capture screenshot after successful action
      if (visualEmit && ok) {
        try {
          const screenshotBuf = await page.screenshot({ type: "jpeg", quality: 60 });
          const filename = `action-${i}.jpg`;
          await fsPromises.writeFile(path.join(screenshotDir, filename), screenshotBuf);
          visualEmit({
            stage: "capturing",
            message: `Screenshot ${i + 1}/${plan.actions.length}`,
            percent: 45 + Math.round((i / plan.actions.length) * 15),
            data: { screenshot: { url: `/api/artifacts/${runId}/screenshots/${filename}`, actionIndex: i } },
          });
        } catch {
          // Screenshot failed — don't block pipeline
        }
      }
    }

    // 6. Brief pause for final state
    await page.waitForTimeout(1500);

    // 7. Close page to finalize video recording
    await page.close();
    const videoPath = await page.video()?.path();
    await recordingContext.close();

    // 8. Convert .webm to .mp4 if video was captured
    if (videoPath) {
      console.log(`[Capture] Converting ${videoPath} → ${rawVideoPath}`);
      try {
        execSync(
          `ffmpeg -y -i "${videoPath}" -c:v libx264 -preset fast -crf 23 -c:a aac "${rawVideoPath}"`,
          { timeout: 60000, stdio: "pipe" }
        );
      } catch (err: any) {
        console.warn("[Capture] FFmpeg conversion failed, copying raw webm");
        await fsPromises.copyFile(videoPath, rawVideoPath);
      }
    } else {
      console.warn("[Capture] No video path returned from Playwright");
    }

    // 9. Write sidecar metadata
    const sidecar = {
      output: rawVideoPath,
      demoPlan: { beats: plan.beats },
      actionResults,
      metrics: { actionsTotal: plan.actions.length, actionsSucceeded: actionResults.filter(a => a.ok).length },
    };
    await fsPromises.writeFile(sidecarPath, JSON.stringify(sidecar, null, 2));

    const durationMs = plan.actions.reduce((sum, a) => sum + (a.delayMs ?? 300), 0) + 3000;

    return { rawVideoPath, sidecarPath, liveViewUrl, durationMs };
  } finally {
    // Disconnect Playwright (doesn't close the browser — Firecrawl owns it)
    if (browser) {
      try { await browser.close(); } catch {}
    }
    // Clean up Firecrawl session
    await fcFetch(`/browser/${sessionId}`, undefined, "DELETE").catch(() => {});
  }
}
