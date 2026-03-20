# Clips Build Learnings — 2026-03-19

## Model Selection
- A/B tested 8 models for demo planning via OpenRouter
- **DeepSeek v3.2** won on value: 0.5s latency, $0.72/1K calls, 6 actions + 8 beats
- Gemini 2.5 Flash cheapest but too terse (2 actions)
- GPT-5.4 richest output (8+9) but 33x more expensive
- All models produced valid JSON — structured output is a solved problem in 2026

## Firecrawl Integration
- Browser Sandbox SDK methods (`browser()`, `browserExecute()`, `deleteBrowser()`) not yet in `@mendable/firecrawl-js` types — use raw fetch against `/v2/browser` endpoints
- CDP WebSocket from Firecrawl sandbox is standard — agent-recorder's `--ws-endpoint` connects directly
- Parallel recording (CDP screencast) + action execution (Playwright via execute API) works on same session
- Always kill the recorder process in a finally block — easy resource leak

## Security — Code Generation from LLM Output
- LLM-generated CSS selectors interpolated into Playwright code = injection vector
- Fix: `JSON.stringify()` all values before embedding in code strings
- Same applies to user-provided URLs in `page.goto()`
- URL validation (scheme + SSRF block) needed at the API boundary

## ElevenLabs
- `@elevenlabs/react` v0.14.x requires `connectionType: "websocket"` in `startSession()`
- `elevenlabs` npm package renamed to `@elevenlabs/elevenlabs-js` (deprecated warning)
- Client tools are the right pattern for triggering pipeline from voice agent
- Per-beat TTS with `convertWithTimestamps` gives character-level timing for subtitle sync

## Project Structure
- Barrel files (`index.ts`) are premature abstraction for hackathons — delete
- Merge closely-related API wrappers into one file (discover + scrape)
- Don't add deps you're not importing (zod, ai SDK, fluent-ffmpeg were all unused)
