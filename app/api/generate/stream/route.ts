import { NextRequest } from "next/server";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { DemoBrief, PipelineEvent } from "@/lib/pipeline/types";
import { validateUrl } from "@/lib/pipeline/validate";

export const maxDuration = 300; // 5 min max for serverless

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.url || !body.feature) {
    return new Response(JSON.stringify({ error: "url and feature are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let validatedUrl: string;
  try {
    validatedUrl = validateUrl(body.url);
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const brief: DemoBrief = {
    url: validatedUrl,
    feature: body.feature,
    audience: body.audience ?? "general",
    tone: body.tone ?? "professional",
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: PipelineEvent) => {
        const data = JSON.stringify(event);
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        console.log(`[SSE] ${event.stage}: ${event.message}`);
      };

      try {
        send({ stage: "discovering", message: "Pipeline started...", percent: 1 });
        await runPipeline(brief, send);
      } catch (err: any) {
        console.error("[SSE] Pipeline error:", err);
        send({
          stage: "error",
          message: err.message ?? "Pipeline failed",
          percent: 0,
          data: { error: err.message },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
