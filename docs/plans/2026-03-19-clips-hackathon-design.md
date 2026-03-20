# Clips (clps.ai) — ElevenHacks Hackathon Design

## Problem
Creating demo videos, tutorials, and product walkthroughs for SaaS products requires manual screen recording, editing, and narration. No tool lets you say "demo this feature on this website" and get a polished, narrated video back.

## Solution
Voice-driven demo video generator for any website. Speak to an AI agent, describe what you want demoed, get a cinematic narrated video.

## Architecture

```
ElevenAgent (Voice UI)
  → intake: { url, feature, audience, tone }
  → follow-up Q&A via voice
        │
        ▼
Firecrawl (ALL-IN-ONE)
  1. Search API → find relevant URLs
  2. Scrape API → markdown of pages
  3. Browser Sandbox → execute demo
     - agent-browser pre-installed
     - Live View for real-time stream
     - CDP for recording
        │
        ▼
Cinematic Post-Processing
  agent-recorder's Remotion pipeline
  (camera moves, beats, freezes, captions)
        │
        ▼
ElevenLabs TTS Narration
  Beat script → voice audio
  Merge audio + video → final.mp4
```

## Stack

| Layer | Tool | Why |
|-------|------|-----|
| Voice interface | ElevenAgent | Conversational intake + follow-ups |
| Discovery | Firecrawl Search | Find relevant pages from feature description |
| Understanding | Firecrawl Scrape | Clean markdown for LLM to plan demo steps |
| Browser automation | Firecrawl Browser Sandbox + agent-browser | Cloud browser, no infra, Live View |
| Recording | CDP from Firecrawl → FFmpeg | Raw capture from sandbox |
| Cinematic render | Agent-recorder Remotion pipeline | Proven quality |
| Narration | ElevenLabs TTS | Voice synced to beats |
| AI orchestration | Vercel AI SDK or Cloudflare AI | LLM plans demo from scraped content |
| Hosting | Vercel or Cloudflare | Ship fast |

## Flow

1. User speaks to ElevenAgent: "demo Coinbase's agent payments"
2. Firecrawl Search finds relevant pages
3. Firecrawl Scrape converts to markdown
4. LLM generates demo plan (actions + beats + narration script)
5. Firecrawl Browser Sandbox executes actions, CDP pipes frames
6. Remotion renders cinematic version
7. ElevenLabs TTS generates narration audio
8. FFmpeg merges → final.mp4

## Use Cases / Personas

- **SaaS founders/marketers** — demo video for landing page / Product Hunt
- **Sales teams** — personalized demo walkthroughs for prospects
- **DevRel / docs** — auto-generated tutorials on feature ship
- **Anyone** — paste URL, describe flow, get narrated video

## Hackathon Submission Strategy

**Video structure:**
1. Face-to-camera intro: "this is Clips"
2. Live screen recording of talking to voice agent
3. Cut to polished demo outputs the tool generated (the demo IS the product)
4. Closer: clps.ai + tags

**Social distribution (+50pts per platform):**
- X: short clip + build thread
- LinkedIn: "built this in a weekend" angle
- TikTok/IG Reels: best single demo, vertical crop

**Viral hooks:**
- Demo a competitor's product better than they demo themselves
- Generate a demo of a notoriously hard-to-use SaaS
- Before/after of a terrible UI

## Key Dependencies

- agent-recorder repo (Remotion pipeline): /Users/achilleasdrakou/Documents/GitHub/agent-recorder
- Firecrawl API key
- ElevenLabs API key
- Existing clps.ai domain

## Open Decisions

- Vercel AI SDK vs Cloudflare AI Gateway for orchestration
- Exact recording method: CDP screencast vs Firecrawl's own capture
- How to sync TTS timing to Remotion beats
