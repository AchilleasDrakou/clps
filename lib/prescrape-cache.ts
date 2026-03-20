import { DiscoveredPage } from "./pipeline/types";

// Simple in-memory cache for pre-scraped pages. Entries expire after 5 minutes.
const cache = new Map<string, { data: DiscoveredPage; expires: number }>();
const TTL = 5 * 60 * 1000;

export function setPrescrape(url: string, data: DiscoveredPage) {
  cache.set(url, { data, expires: Date.now() + TTL });
}

export function getPrescrape(url: string): DiscoveredPage | undefined {
  const entry = cache.get(url);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) {
    cache.delete(url);
    return undefined;
  }
  return entry.data;
}
