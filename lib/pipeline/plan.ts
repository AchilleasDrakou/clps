import { DemoBrief, DemoAction, DemoBeat, DemoPlan, DiscoveredPage } from "./types";

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";

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

export async function planDemo(
  brief: DemoBrief,
  pages: DiscoveredPage[]
): Promise<DemoPlan> {
  const model = process.env.PLANNER_MODEL ?? "google/gemini-2.5-flash";

  const pageContent = pages
    .map((p) => `## ${p.title}\nURL: ${p.url}\n\n${p.markdown.slice(0, 4000)}`)
    .join("\n\n---\n\n");

  const res = await fetch(OPENROUTER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://clps.ai",
      "X-Title": "Clips Demo Planner",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `## Brief
URL: ${brief.url}
Feature: ${brief.feature}
Audience: ${brief.audience}
Tone: ${brief.tone}

## Page Content
${pageContent}

Generate the demo plan as JSON.`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(`Planner API error: ${data.error?.message ?? JSON.stringify(data.error) ?? res.statusText}`);
  }

  const text = data.choices?.[0]?.message?.content ?? "";

  // Extract JSON from response (handle markdown fences)
  const cleaned = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from planner response");

  const plan = JSON.parse(jsonMatch[0]);

  return {
    brief,
    pages,
    actions: plan.actions as DemoAction[],
    beats: plan.beats as DemoBeat[],
    narrationScript: plan.narrationScript as string[],
  };
}
