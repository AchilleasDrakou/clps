import { NextRequest, NextResponse } from "next/server";
import { scrapePage } from "@/lib/pipeline/discover";
import { validateUrl } from "@/lib/pipeline/validate";
import { setPrescrape } from "@/lib/prescrape-cache";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    const validated = validateUrl(url);
    const page = await scrapePage(validated);

    // Cache server-side — generate page will look it up by validated URL
    setPrescrape(validated, page);

    return NextResponse.json({ ok: true, url: validated, title: page.title });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
