import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { DemoBrief } from "@/lib/pipeline/types";
import { validateUrl } from "@/lib/pipeline/validate";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.url || !body.feature) {
      return NextResponse.json(
        { error: "url and feature are required" },
        { status: 400 }
      );
    }

    let validatedUrl: string;
    try {
      validatedUrl = validateUrl(body.url);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const brief: DemoBrief = {
      url: validatedUrl,
      feature: body.feature,
      audience: body.audience ?? "general",
      tone: body.tone ?? "professional",
    };

    // Run pipeline (this takes a while — in production, use a queue)
    const result = await runPipeline(brief, (progress) => {
      // In a real app, push via SSE or WebSocket
      console.log(`[${progress.percent}%] ${progress.stage}: ${progress.message}`);
    });

    return NextResponse.json({
      success: true,
      videoPath: result.finalVideoPath,
      liveViewUrl: result.liveViewUrl,
      plan: {
        actions: result.demoPlan.actions.length,
        beats: result.demoPlan.beats.length,
      },
    });
  } catch (err: any) {
    console.error("Pipeline error:", err);
    return NextResponse.json(
      { error: err.message ?? "Pipeline failed" },
      { status: 500 }
    );
  }
}
