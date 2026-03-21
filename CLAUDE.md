# Clips (clps.ai)

Loom for agents. Paste a URL, describe the feature, get a demo video. Voice, text, or CLI.

## Hackathon

**ElevenHacks** — must use Firecrawl Search + ElevenAgents.

Scoring: social posts (+50pts/platform), placement (1st +400, 2nd +200, 3rd +150), most viral (+200), most popular (+200).

**Submission strategy:** intro face-to-cam → live screen recording talking to voice agent → cut to polished demo outputs → clps.ai. Individual clips per platform (X, LinkedIn, TikTok, IG). Tag @firecrawl @elevenlabs #ElevenHacks.

**The demo IS the product** — the submission video is made of videos the tool generates.

## Modes

| Mode | Audio | Use case |
|------|-------|----------|
| **Raw** | None | Clean screen recording |
| **Tutorial** | TTS narration | Step-by-step walkthrough |
| **Showreel** | Music bed (ElevenLabs Sound Effects) | Marketing/social/viral |

## Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 16, Bun 1.3.11, Tailwind v4, Motion 12 |
| Voice UI | ElevenAgent "Clippee" (conversational intake) |
| Discovery | Firecrawl Search API (returns markdown inline) |
| Page understanding | Firecrawl Scrape API (pre-scraped on URL entry) |
| Browser automation | Firecrawl Browser Sandbox → Playwright via connectOverCDP |
| Video capture | Playwright built-in recordVideo (not Rust recorder) |
| Demo planning | DeepSeek v3.2 via OpenRouter |
| Narration (tutorial) | ElevenLabs TTS per-beat with convertWithTimestamps |
| Music (showreel) | ElevenLabs Sound Effects API |
| Audio/video merge | FFmpeg |
| CLI (planned) | CrustJS — Bun-native CLI with agent skills |

## Pipeline

```
URL entry → pre-scrape main page (cached server-side)
  → User submits brief { url, feature, audience, mode }
  → Firecrawl Search (find relevant pages, markdown inline)
  → DeepSeek v3.2 (generate actions + beats + narration script)
  → Firecrawl Browser Sandbox + Playwright connectOverCDP
    → Live View iframe (user watches in real-time)
    → Playwright recordVideo (captures .webm)
    → Execute actions via local Playwright (not Firecrawl execute API)
  → FFmpeg convert .webm → .mp4
  → [tutorial] ElevenLabs TTS per-beat → merge audio
  → [showreel] ElevenLabs Sound Effects → merge audio
  → [raw] video is final output, no audio
```

## Key Files

- `lib/pipeline/orchestrator.ts` — wires all stages, conditional audio per mode
- `lib/pipeline/capture.ts` — Playwright connectOverCDP + recordVideo + action execution
- `lib/pipeline/plan.ts` — DeepSeek planner via OpenRouter
- `lib/pipeline/narrate.ts` — ElevenLabs per-beat TTS (tutorial mode)
- `lib/pipeline/music.ts` — ElevenLabs Sound Effects (showreel mode)
- `lib/pipeline/discover.ts` — Firecrawl Search + Scrape
- `lib/pipeline/validate.ts` — URL validation + SSRF protection
- `lib/prescrape-cache.ts` — server-side cache for pre-scraped pages
- `app/page.tsx` — URL-first landing page, two-step flow
- `app/generate/page.tsx` — live workspace with stage accordion
- `app/generate/_components/` — stage cards, timeline, skeletons, sub-process details
- `components/voice-agent.tsx` — ElevenAgent React component (Clippee)
- `components/voice-input.tsx` — mic button with frequency animation
- `docs/elevenlabs-agent-config.ts` — Clippee agent setup reference
- `scripts/ab-test-models.ts` — model benchmarking

## External Dependencies

- **Playwright** — installed as `playwright-core` (no bundled browsers — uses Firecrawl's)
- **FFmpeg** — must be installed system-wide
- **agent-recorder** — no longer needed for capture (Playwright replaced it). Remotion pipeline still available but not used.

## Env Vars

```
FIRECRAWL_API_KEY=         # Firecrawl API (search, scrape, browser)
ELEVENLABS_API_KEY=        # ElevenLabs (TTS, sound effects, agent)
OPENROUTER_API_KEY=        # LLM planner
PLANNER_MODEL=             # default: deepseek/deepseek-v3.2
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=  # Clippee agent ID (create in dashboard)
```

## Commands

```bash
bun run dev          # dev server
bun run build        # production build
bunx tsc --noEmit    # type-check
bunx tsx scripts/ab-test-models.ts  # benchmark planner models
```

## Security

- All user URLs validated (scheme + SSRF block) in `lib/pipeline/validate.ts`
- LLM-generated selectors escaped via `JSON.stringify()` before Playwright code
- Pre-scrape data cached server-side only (never from client)
- API keys in `.env.local` (gitignored), never committed
- `.env.example` has placeholders only

## Conventions

- TypeScript, Next.js App Router
- Bun as package manager and runtime
- Motion 12 for animations (not framer-motion)
- Lucide React for icons (not emoji)
- Dark theme: bg-[#09090b], CSS variables in globals.css
- Quality priority: output video quality > speed > agent-drivability > code elegance
- Hackathon pace: ship fast, iterate later
