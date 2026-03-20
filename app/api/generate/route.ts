import { NextRequest, NextResponse } from "next/server";
import { runPipeline } from "@/lib/pipeline/orchestrator";
import { DemoBrief } from "@/lib/pipeline/types";
import { validateUrl } from "@/lib/pipeline/validate";

// NOTE: in-memory, local dev only — won't survive Vercel cold starts
const JOB_TTL_MS = 10 * 60 * 1000; // 10 min
const jobs = new Map<string, { status: string; result?: any; error?: string }>();

export { jobs };

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

    const jobId = crypto.randomUUID();
    jobs.set(jobId, { status: "running" });

    // Fire and forget — always update job status on completion or failure
    Promise.resolve()
      .then(() => runPipeline(brief, { mode: "headless" }))
      .then((result) => {
        jobs.set(jobId, { status: "complete", result });
      })
      .catch((err) => {
        jobs.set(jobId, { status: "error", error: err.message ?? "Pipeline failed" });
      })
      .finally(() => {
        // Evict job after TTL to prevent memory leak
        setTimeout(() => jobs.delete(jobId), JOB_TTL_MS);
      });

    return NextResponse.json({ jobId, status: "running" });
  } catch (err: any) {
    console.error("Pipeline error:", err);
    return NextResponse.json(
      { error: err.message ?? "Pipeline failed" },
      { status: 500 }
    );
  }
}
