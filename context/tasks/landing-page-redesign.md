# Task: Landing Page Redesign — URL-First Conversational Flow

## Problem
Current landing page feels backwards. Two separate modes (Voice/Text) with different screens is clunky and not agent-native. The first thing a user should do is enter a URL, not choose an input mode.

## Desired Flow

### Step 1: URL Input (hero)
- Big centered input: "Enter a website URL"
- User pastes URL, hits enter
- Page transitions to step 2 (no page navigation — same page, smooth transition)

### Step 2: Conversational Brief Builder
- URL is locked in (shown as a chip/badge above)
- Single input area where user can describe what to demo
- Voice toggle inline (not a separate mode) — small mic button next to the text input
- Style/tone selector as pills or dropdown (not a separate field)
- As user types or speaks, the UI feels conversational — like chatting with Clippee
- When ready, hit "Generate" or Clippee auto-triggers when brief is clear enough

### Key Principles
- **One flow, not two screens** — voice and text are just input methods for the same conversation
- **URL first** — that's the most important piece of info
- **Streamlined** — minimize fields, maximize intelligence
- **Conversational** — should feel like talking to an assistant, not filling out a form

## Voice Component
Use the VoiceInput component (saved at components/voice-input.tsx) which has:
- Mic button that expands to show frequency animation + timer
- Clean motion animations
- Start/stop callbacks
- Wire to ElevenLabs agent for STT or use browser SpeechRecognition API

## Tech Considerations
- Consider Vercel AI SDK for streaming text responses if we want Clippee to respond in text too
- Single page state machine: `url-input` → `brief-builder` → `generating` (redirect to /generate)
- Keep it simple — this is the entry point, not the workspace

## Reference
- v0.dev: single input, conversational, streams response
- ChatGPT: URL first → follow-up questions
- Current VoiceInput component code provided by user (see components/voice-input.tsx)
