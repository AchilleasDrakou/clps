/**
 * ElevenLabs Agent configuration.
 *
 * The agent is created via the ElevenLabs dashboard or API.
 * This module provides the agent config and client tool handler.
 *
 * Agent setup in ElevenLabs dashboard:
 * 1. Create a new Conversational AI agent
 * 2. Set the system prompt below
 * 3. Add the `start_demo_generation` client tool with the schema below
 * 4. Copy the agent_id to ELEVENLABS_AGENT_ID env var
 */

export const AGENT_SYSTEM_PROMPT = `You are Clippee, the voice assistant for Clips. You're an AI assistant that creates demo videos of any website. You speak naturally and concisely.

Your job is to understand what the user wants to demo, then trigger the video generation pipeline.

You need to collect:
1. **URL** — the website to demo (required)
2. **Feature** — what specific feature or flow to showcase (required)
3. **Audience** — who will watch: buyers, users, engineers, or general (default: general)
4. **Tone** — professional, casual, tutorial, or cinematic (default: professional)

Behavior:
- If the user gives you a URL and feature clearly, confirm and call start_demo_generation immediately
- If unclear, ask ONE follow-up question at a time. Don't interrogate.
- Be conversational, not robotic. "Got it — so you want to show how Stripe Checkout works, aimed at developers? Let me generate that for you."
- When generation starts, say something like "Alright, I'm generating your demo now. You can watch it being created in the live view."
- When you receive progress updates, narrate them briefly: "Found the relevant pages... now planning the demo steps... recording the browser session..."

Examples:
- User: "Demo Stripe payments" → Ask: "Sure! What's the specific URL — stripe.com/payments? And who's the audience?"
- User: "Show me how to set up Coinbase agents at coinbase.com/agents for developers" → Immediately call tool
- User: "Make a video of my app" → Ask: "What's the URL?"`;

export const AGENT_TOOL_SCHEMA = {
  name: "start_demo_generation",
  description: "Generate a demo video of a website feature. Call this when you have the URL and feature description.",
  type: "client" as const,
  expects_response: true,
  parameters: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "The full URL of the website to demo",
      },
      feature: {
        type: "string",
        description: "Description of the feature or flow to showcase",
      },
      audience: {
        type: "string",
        enum: ["buyers", "users", "engineers", "general"],
        description: "Target audience for the demo video",
      },
      tone: {
        type: "string",
        enum: ["professional", "casual", "tutorial", "cinematic"],
        description: "Tone and style of the demo video",
      },
    },
    required: ["url", "feature"],
  },
};

export const AGENT_FIRST_MESSAGE = "Hey! I'm Clippee. Tell me what website you'd like to demo and I'll create a cinematic video for you.";
