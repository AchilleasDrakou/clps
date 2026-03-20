/**
 * A/B test different LLM models for demo planning.
 * Compares: quality of JSON output, speed, token usage, cost.
 *
 * Usage: npx tsx scripts/ab-test-models.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

// Latest models as of March 2026
const MODELS: { id: string; inputPer1M: number; outputPer1M: number }[] = [
  { id: "google/gemini-3.1-flash-lite-preview", inputPer1M: 0.169, outputPer1M: 1.50 },
  { id: "google/gemini-3.1-pro-preview", inputPer1M: 1.38, outputPer1M: 12.12 },
  { id: "deepseek/deepseek-v3.2", inputPer1M: 0.197, outputPer1M: 0.449 },
  { id: "openai/gpt-5.4", inputPer1M: 0.758, outputPer1M: 15.08 },
  { id: "xiaomi/mimo-v2-pro", inputPer1M: 0.307, outputPer1M: 3.25 },
  { id: "z-ai/glm-5", inputPer1M: 0.429, outputPer1M: 3.01 },
  // Keep previous winners for comparison
  { id: "google/gemini-2.5-flash", inputPer1M: 0.15, outputPer1M: 0.60 },
  { id: "anthropic/claude-sonnet-4", inputPer1M: 1.32, outputPer1M: 15.07 },
];

const SYSTEM_PROMPT = `You are a demo video planner. Given a website's content (as markdown) and a user's brief, you generate a structured demo plan.

Output JSON with this exact structure:
{
  "actions": [
    { "type": "click|type|scroll|wait|wait_for|hover|press", "selector": "CSS selector", "text": "for type actions", "containsText": "for wait_for", "delayMs": 500 }
  ],
  "beats": [
    { "id": "beat-1", "kind": "establish|click|reveal|type|press|overview|outro", "label": "short label", "caption": "what viewer sees", "narrationText": "what narrator says", "holdMs": 1500, "actionIndex": 0, "camera": { "mode": "overview|focus", "emphasis": "wide|subtle|detail|hero" } }
  ],
  "narrationScript": ["Full narration text for each beat in order"]
}

Guidelines:
- Start with an "establish" beat (overview of the page)
- Each user interaction = one action + one beat
- After important clicks, add a "reveal" beat showing the result
- End with an "outro" beat summarizing what was shown
- narrationText should be conversational and match the requested tone
- holdMs: establish=2000, click=800, reveal=1800, type=1200, outro=2500
- Use specific CSS selectors from the page content
- Keep demos 15-30 seconds (5-10 beats)
- Output ONLY valid JSON, no markdown fences or explanation`;

const TEST_BRIEF = `## Brief
URL: https://stripe.com/payments
Feature: Accept online payments with Stripe Checkout
Audience: buyers
Tone: professional

## Page Content
## Stripe Payments
URL: https://stripe.com/payments

# Online payments
Accept payments online, in person, or through your platform.

## Stripe Checkout
Stripe Checkout is a prebuilt payment page that lets you collect payments quickly. It works across devices and is designed to increase your conversion.

### How it works
1. Create a Checkout Session on your server
2. Redirect your customer to the Checkout page
3. Customer enters payment details
4. Payment is processed and customer is redirected back

### Features
- Supports 135+ currencies
- Built-in fraud prevention with Radar
- Mobile-optimized responsive design
- Apple Pay and Google Pay support
- 3D Secure authentication
- Customizable branding

### Getting started
Visit the Dashboard to create your account, then integrate Checkout with a few lines of code.

### Navigation elements on page:
- [Products] nav link
- [Solutions] nav link
- [Developers] nav link
- [Get Started] button (primary CTA, selector: a[href="/get-started"])
- [Contact Sales] button (secondary, selector: a[href="/contact/sales"])
- [Documentation] link (selector: a[href="/docs"])
- [Sign in] link (selector: a[href="/login"])

Generate the demo plan as JSON.`;

interface ModelConfig {
  id: string;
  inputPer1M: number;
  outputPer1M: number;
}

interface ModelResult {
  model: string;
  latencyMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  validJson: boolean;
  actionCount: number;
  beatCount: number;
  hasEstablish: boolean;
  hasOutro: boolean;
  narrationQuality: string;
  avgNarrationLen: number;
  error?: string;
}

async function testModel(mc: ModelConfig): Promise<ModelResult> {
  const start = Date.now();

  try {
    const res = await fetch(OPENROUTER_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://clps.ai",
        "X-Title": "Clips A/B Test",
      },
      body: JSON.stringify({
        model: mc.id,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: TEST_BRIEF },
        ],
        temperature: 0.3,
        max_tokens: 4096,
      }),
    });

    const latencyMs = Date.now() - start;
    const data = await res.json();

    if (data.error) {
      return {
        model: mc.id, latencyMs, promptTokens: 0, completionTokens: 0, totalTokens: 0,
        costUsd: 0, validJson: false, actionCount: 0, beatCount: 0,
        hasEstablish: false, hasOutro: false, narrationQuality: "N/A", avgNarrationLen: 0,
        error: data.error.message ?? JSON.stringify(data.error),
      };
    }

    const text = data.choices?.[0]?.message?.content ?? "";
    const usage = data.usage ?? {};
    const promptTokens = usage.prompt_tokens ?? 0;
    const completionTokens = usage.completion_tokens ?? 0;
    const totalTokens = promptTokens + completionTokens;

    // Calculate cost from known pricing
    const costUsd = (promptTokens / 1_000_000) * mc.inputPer1M +
      (completionTokens / 1_000_000) * mc.outputPer1M;

    // Try parse JSON
    const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return {
        model: mc.id, latencyMs, promptTokens, completionTokens, totalTokens,
        costUsd, validJson: false, actionCount: 0, beatCount: 0,
        hasEstablish: false, hasOutro: false, narrationQuality: "N/A", avgNarrationLen: 0,
        error: "No JSON found",
      };
    }

    let plan: any;
    try {
      plan = JSON.parse(jsonMatch[0]);
    } catch {
      return {
        model: mc.id, latencyMs, promptTokens, completionTokens, totalTokens,
        costUsd, validJson: false, actionCount: 0, beatCount: 0,
        hasEstablish: false, hasOutro: false, narrationQuality: "N/A", avgNarrationLen: 0,
        error: "Invalid JSON",
      };
    }

    const actions = plan.actions ?? [];
    const beats = plan.beats ?? [];
    const narration = plan.narrationScript ?? [];

    const hasEstablish = beats.some((b: any) => b.kind === "establish");
    const hasOutro = beats.some((b: any) => b.kind === "outro");

    const avgNarrationLen = narration.length > 0
      ? narration.reduce((s: number, t: string) => s + (t?.length ?? 0), 0) / narration.length
      : 0;
    const narrationQuality = avgNarrationLen > 40 ? "detailed" :
      avgNarrationLen > 15 ? "adequate" : "sparse";

    return {
      model: mc.id, latencyMs, promptTokens, completionTokens, totalTokens,
      costUsd, validJson: true, actionCount: actions.length,
      beatCount: beats.length, hasEstablish, hasOutro, narrationQuality, avgNarrationLen,
    };
  } catch (err: any) {
    return {
      model: mc.id, latencyMs: Date.now() - start, promptTokens: 0, completionTokens: 0,
      totalTokens: 0, costUsd: 0, validJson: false, actionCount: 0, beatCount: 0,
      hasEstablish: false, hasOutro: false, narrationQuality: "N/A", avgNarrationLen: 0,
      error: err.message,
    };
  }
}

async function main() {
  console.log("=== Clips Planner A/B Test (Latest Models) ===\n");
  console.log(`Testing ${MODELS.length} models in parallel...\n`);

  const results = await Promise.all(MODELS.map(testModel));
  results.sort((a, b) => a.latencyMs - b.latencyMs);

  // Print results
  const col = {
    model: 36, lat: 8, pTok: 6, cTok: 6, cost: 9, valid: 5, acts: 4, beats: 5, struct: 8, narr: 8,
  };

  console.log("┌" + "─".repeat(col.model + 2) + "┬" + "─".repeat(col.lat + 2) + "┬" + "─".repeat(col.pTok + 2) + "┬" + "─".repeat(col.cTok + 2) + "┬" + "─".repeat(col.cost + 2) + "┬" + "─".repeat(col.valid + 2) + "┬" + "─".repeat(col.acts + 2) + "┬" + "─".repeat(col.beats + 2) + "┬" + "─".repeat(col.struct + 2) + "┬" + "─".repeat(col.narr + 2) + "┐");
  console.log("│ " + "Model".padEnd(col.model) + " │ " + "Latency".padEnd(col.lat) + " │ " + "In Tok".padEnd(col.pTok) + " │ " + "OutTok".padEnd(col.cTok) + " │ " + "Cost".padEnd(col.cost) + " │ " + "JSON".padEnd(col.valid) + " │ " + "Acts".padEnd(col.acts) + " │ " + "Beats".padEnd(col.beats) + " │ " + "Struct".padEnd(col.struct) + " │ " + "Narr".padEnd(col.narr) + " │");
  console.log("├" + "─".repeat(col.model + 2) + "┼" + "─".repeat(col.lat + 2) + "┼" + "─".repeat(col.pTok + 2) + "┼" + "─".repeat(col.cTok + 2) + "┼" + "─".repeat(col.cost + 2) + "┼" + "─".repeat(col.valid + 2) + "┼" + "─".repeat(col.acts + 2) + "┼" + "─".repeat(col.beats + 2) + "┼" + "─".repeat(col.struct + 2) + "┼" + "─".repeat(col.narr + 2) + "┤");

  for (const r of results) {
    const name = r.model.length > col.model ? r.model.slice(-col.model) : r.model.padEnd(col.model);
    const lat = `${(r.latencyMs / 1000).toFixed(1)}s`.padStart(col.lat);
    const pTok = String(r.promptTokens).padStart(col.pTok);
    const cTok = String(r.completionTokens).padStart(col.cTok);
    const cost = r.costUsd > 0 ? `$${(r.costUsd * 1000).toFixed(2)}¢`.padStart(col.cost) : "N/A".padStart(col.cost);
    const valid = (r.validJson ? "YES" : "NO").padStart(col.valid);
    const acts = String(r.actionCount).padStart(col.acts);
    const beats = String(r.beatCount).padStart(col.beats);
    const struct = ((r.hasEstablish && r.hasOutro) ? "FULL" : r.hasEstablish ? "PARTIAL" : "NONE").padStart(col.struct);
    const narr = r.narrationQuality.padStart(col.narr);

    console.log(`│ ${name} │ ${lat} │ ${pTok} │ ${cTok} │ ${cost} │ ${valid} │ ${acts} │ ${beats} │ ${struct} │ ${narr} │`);

    if (r.error) {
      console.log(`│  ERR: ${r.error.slice(0, 100)}`.padEnd(col.model + col.lat + col.pTok + col.cTok + col.cost + col.valid + col.acts + col.beats + col.struct + col.narr + 20) + "│");
    }
  }

  console.log("└" + "─".repeat(col.model + 2) + "┴" + "─".repeat(col.lat + 2) + "┴" + "─".repeat(col.pTok + 2) + "┴" + "─".repeat(col.cTok + 2) + "┴" + "─".repeat(col.cost + 2) + "┴" + "─".repeat(col.valid + 2) + "┴" + "─".repeat(col.acts + 2) + "┴" + "─".repeat(col.beats + 2) + "┴" + "─".repeat(col.struct + 2) + "┴" + "─".repeat(col.narr + 2) + "┘");

  // Cost note
  console.log("\n(Cost shown per 1000 calls at this token usage)\n");

  // Recommendations
  console.log("=== Recommendations ===");
  const valid = results.filter(r => r.validJson);
  if (valid.length === 0) {
    console.log("No valid results!");
    return;
  }

  const fastest = valid[0];
  const bestQuality = [...valid]
    .filter(r => r.hasEstablish && r.hasOutro && r.narrationQuality === "detailed")
    .sort((a, b) => a.beatCount !== b.beatCount ? b.beatCount - a.beatCount : a.latencyMs - b.latencyMs)[0];
  const cheapest = [...valid].sort((a, b) => a.costUsd - b.costUsd)[0];
  const bestValue = [...valid]
    .filter(r => r.hasEstablish && r.hasOutro)
    .sort((a, b) => {
      // Score: (actions + beats) / (cost * latency) — higher is better
      const scoreA = (a.actionCount + a.beatCount) / (Math.max(a.costUsd, 0.0001) * a.latencyMs);
      const scoreB = (b.actionCount + b.beatCount) / (Math.max(b.costUsd, 0.0001) * b.latencyMs);
      return scoreB - scoreA;
    })[0];

  console.log(`Fastest:     ${fastest.model} (${(fastest.latencyMs / 1000).toFixed(1)}s)`);
  if (bestQuality) console.log(`Best quality: ${bestQuality.model} (${bestQuality.actionCount} actions, ${bestQuality.beatCount} beats)`);
  console.log(`Cheapest:    ${cheapest.model} ($${cheapest.costUsd.toFixed(6)}/call)`);
  if (bestValue) console.log(`Best value:  ${bestValue.model} (quality/cost/speed balance)`);
}

main().catch(console.error);
