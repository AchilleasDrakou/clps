# Clips (clps.ai)

Voice-driven demo video generator for any website. Enter a URL, describe the feature, get a cinematic narrated video.

## Hackathon

**ElevenHacks** — must use Firecrawl Search + ElevenAgents.

Scoring: social posts (+50pts/platform), placement (1st +400, 2nd +200, 3rd +150), most viral (+200), most popular (+200).

**Submission strategy:** intro face-to-cam → live screen recording talking to voice agent → cut to polished demo outputs → clps.ai. Individual clips per platform (X, LinkedIn, TikTok, IG). Tag @firecrawl @elevenlabs #ElevenHacks.

**The demo IS the product** — the submission video is made of videos the tool generates.

## Stack

| Layer | Tool |
|-------|------|
| Framework | Next.js 16, Bun 1.3.11, Tailwind v4 |
| Voice UI | ElevenAgent "Clippee" (conversational intake) |
| Discovery | Firecrawl Search API |
| Page understanding | Firecrawl Scrape API |
| Browser automation | Firecrawl Browser Sandbox (agent-browser, CDP) |
| Demo planning | DeepSeek v3.2 via OpenRouter (won A/B test: 0.5s, $0.72/1K calls) |
| Video capture | agent-recorder Rust binary via --ws-endpoint (CDP screencast) |
| Cinematic render | agent-recorder Remotion pipeline |
| Narration | ElevenLabs TTS per-beat with convertWithTimestamps |
| Audio/video merge | FFmpeg |
| CLI (planned) | CrustJS — Bun-native CLI framework with agent skills |

## Pipeline

```
Voice/Text/CLI input → { url, feature, audience, tone }
  → Firecrawl Search (find relevant pages)
  → Firecrawl Scrape (markdown for LLM)
  → DeepSeek v3.2 (generate actions + beats + narration script)
  → Firecrawl Browser Sandbox (execute actions) + CDP recording (parallel)
  → Remotion cinematic render (camera moves, beats, freezes)
  → ElevenLabs TTS (per-beat narration with word timestamps)
  → FFmpeg merge → final.mp4
```

## Key Files

- `lib/pipeline/orchestrator.ts` — wires all stages
- `lib/pipeline/capture.ts` — Firecrawl Browser + CDP bridge (most critical)
- `lib/pipeline/plan.ts` — DeepSeek planner via OpenRouter
- `lib/pipeline/narrate.ts` — ElevenLabs per-beat TTS
- `components/voice-agent.tsx` — ElevenAgent React component
- `app/page.tsx` — landing page (voice + text modes)
- `scripts/ab-test-models.ts` — model benchmarking
- `docs/elevenlabs-agent-config.ts` — Clippee agent setup reference

## External Dependencies

- **agent-recorder** repo at `../agent-recorder` — Rust CDP recorder + Remotion cinematic pipeline. Binary path set via `AGENT_RECORDER_PATH` env var.
- **FFmpeg** — must be installed system-wide

## Env Vars

```
FIRECRAWL_API_KEY=         # Firecrawl API
ELEVENLABS_API_KEY=        # ElevenLabs TTS
OPENROUTER_API_KEY=        # LLM planner
PLANNER_MODEL=             # default: deepseek/deepseek-v3.2
AGENT_RECORDER_PATH=       # path to agent-recorder binary
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=  # ElevenLabs agent (create in dashboard)
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
- LLM-generated selectors escaped via `JSON.stringify()` before Playwright code generation
- API keys in `.env.local` (gitignored), never committed
- `.env.example` has placeholders only

## Conventions

- TypeScript, Next.js App Router
- Bun as package manager and runtime
- Quality priority: output video quality > token efficiency > agent-drivability > code elegance
- Hackathon pace: ship fast, iterate later
