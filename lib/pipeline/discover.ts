import Firecrawl from "@mendable/firecrawl-js";
import { DemoBrief, DiscoveredPage } from "./types";

const fc = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY! });

export async function discoverPages(
  brief: DemoBrief,
  limit = 3
): Promise<DiscoveredPage[]> {
  // URL is already validated by the route handler
  const hostname = new URL(brief.url).hostname;
  const query = `${brief.feature} site:${hostname}`;

  const results = await fc.search(query, {
    limit,
    scrapeOptions: { formats: ["markdown", "links"] },
  });

  if (!results.success || !results.data) {
    return [];
  }

  return (results.data as any[]).map((r: any) => ({
    url: r.url,
    title: r.title ?? "",
    description: r.description ?? "",
    markdown: r.markdown ?? "",
  }));
}

export async function scrapePage(url: string): Promise<DiscoveredPage> {
  const result = await fc.scrapeUrl(url, {
    formats: ["markdown"],
  });

  if (!result.success) {
    throw new Error(`Failed to scrape ${url}: ${result.error}`);
  }

  return {
    url,
    title: result.metadata?.title ?? "",
    description: result.metadata?.description ?? "",
    markdown: result.markdown ?? "",
  };
}
