# Clips Architecture

## Overview
Voice-driven demo video generator for any SaaS website. No code access needed — just a URL and a description.

## Core Pipeline
ElevenAgent (voice) → Firecrawl (discover + scrape + browser) → LLM (plan) → agent-recorder (render) → ElevenLabs TTS (narrate) → final MP4

## External Dependencies
- **Firecrawl**: Search API, Scrape API, Browser Sandbox (agent-browser, CDP, Live View)
- **ElevenLabs**: Conversational Agents (voice input), TTS API (narration output)
- **agent-recorder**: Remotion cinematic pipeline (borrowed, not forked)

## Tech Stack
- Next.js (existing skeleton)
- Vercel AI SDK or Cloudflare AI for orchestration
- Prisma + Supabase (existing, for user/waitlist data)
- FFmpeg for audio/video merge

## Repo Structure
- `app/` — Next.js frontend
- `lib/` — core pipeline orchestration
- `context/` — project context and specs
- `docs/` — plans and solutions
