# Task: Hero Redesign — Card-Based CTA with Dithering Shader

## Summary

Redesign `app/page.tsx` landing hero. Wrap the entire flow inside a large rounded card (`rounded-[48px]`) with an animated dithering shader background. Two-stage flow stays, but lives inside the card.

## Copy Direction

**Badge:** "AI-Powered Demos"
**Headline (serif, large):** "See what your agents shipped."
**Subtitle:** "Paste a URL. Get a narrated demo in seconds. No IDE required."

Psychology: Jobs to Be Done (visual verification of autonomous work), Activation Energy reduction (no IDE needed), Present Bias (immediate feedback).

## Design

### The Card Container
- Full-width with `max-w-7xl`, centered, `rounded-[48px]`, border + shadow
- Min height ~600px, flex column centered
- Dithering shader as absolute background layer (opacity 40%, mix-blend-multiply)
  - Uses `@paper-design/shaders-react` `Dithering` component
  - `colorFront` = `var(--color-accent)` (#d4a853) or experiment with orange (#EC4E02)
  - `shape="warp"`, `type="4x4"`, slow speed (0.2), faster on hover (0.6)
  - Transparent `colorBack`

### State 1: URL Input (initial)
Inside the card, vertically centered:
1. **Badge** — pulsing dot + "AI-Powered Demos" (pill with border, backdrop-blur)
2. **Headline** — serif font (`--font-display`), `text-5xl md:text-7xl lg:text-8xl`, "See what your agents shipped."
3. **Subtitle** — muted text, "Paste a URL. Get a narrated demo in seconds. No IDE required."
4. **URL input** — keep existing input style (globe icon, enter-to-submit arrow button)
5. **Hint** — "press enter to continue" fades in after 1.2s

### State 2: Brief Builder (after URL submit)
Inside the same card (shader still running):
1. Badge + headline **animate out** (fade up + scale down)
2. **URL chip** — centered pill showing the entered URL with X to reset
3. **Feature input** — "What feature do you want to demo?" + VoiceInput mic
4. **Tone pills** — professional/casual/tutorial/cinematic
5. **Generate button** — "Generate Demo" + arrow

### Transitions
- Use existing `EASE_OUT_EXPO` easing and `motion/react` (NOT framer-motion)
- Headline exit: `opacity: 0, y: -20, scale: 0.98`
- Brief builder entrance: staggered delays (0.05s → 0.24s) as existing
- Card hover triggers shader speed change (0.2 → 0.6)

## Files to Modify

| File | Change |
|------|--------|
| `app/page.tsx` | Restructure layout into card container, add shader, update copy |
| `app/globals.css` | May need grain overlay z-index adjustment for card context |

## New Dependencies

```bash
bun add @paper-design/shaders-react
```

## What to Keep
- All existing flow logic (FlowState, handlers, router push)
- VoiceInput component integration
- Tone selection
- Motion animations (adapt, don't rewrite)
- Dark theme, existing CSS variables

## What Changes
- Layout: fullscreen centered → card container with shader bg
- Copy: "Clips" + "Demo videos for any website" → new copy
- Visual: ambient glow behind → dithering shader inside card
- Badge: new "AI-Powered Demos" badge with pulsing dot
- The "by Pelian" tagline and "clps.ai" footer stay outside the card or get repositioned

## Decisions
- Shader accent color: **orange (#EC4E02)**
- Footer below card: **"by Pelian Labs"**
- "clps.ai" footer removed
