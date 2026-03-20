---
title: Pre-scrape + eliminate double-scraping + parallel UI stages
type: improve
status: in-progress
created: 2026-03-20
---

# Pre-scrape + Dedup + Parallel UI

## Problem
Pipeline wastes time re-scraping pages that Firecrawl Search already returned with markdown. Main URL scrape doesn't start until generate page loads. UI only shows one active stage but capture + narration run in parallel.

## Acceptance Criteria
- [ ] Pre-scrape: landing page calls /api/prescrape on URL submit, caches result in sessionStorage
- [ ] Pre-scrape: generate page reads cached scrape, passes to pipeline via SSE body
- [ ] Dedup: orchestrator skips scrapePage if pre-scraped data provided
- [ ] Dedup: discoverPages results already have markdown — don't re-scrape them
- [ ] Parallel UI: generate page shows capture + narration as both active simultaneously
- [ ] Parallel UI: getStageStatus supports multiple active stages

## Technical Approach

### 1. Pre-scrape API route
`app/api/prescrape/route.ts` — POST with `{ url }`, returns `{ title, markdown }`. Called from landing page on URL submit.

### 2. Landing page changes
On `handleUrlSubmit`: fire-and-forget fetch to `/api/prescrape`, store result in sessionStorage under key `prescrape:<url>`. On `handleGenerate`: pass cached data as query param or in sessionStorage for generate page to read.

### 3. SSE endpoint changes
Accept optional `prescrapeData` in POST body. Pass to `runPipeline`.

### 4. Orchestrator changes
Accept optional `cachedMainPage: DiscoveredPage` param. If provided, skip `scrapePage(brief.url)`. Search results already have markdown — don't re-scrape.

### 5. UI parallel stages
Track which stages are currently active via a Set instead of single string. When both capturing and narrating events arrive, both show as active in the stage accordion.
