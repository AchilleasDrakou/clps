# Libra UI Patterns Research

**Status**: Research in progress - accessing full source code limited by GitHub API permissions
**Date**: 2026-03-20

## Overview

Libra AI is an open-source V0/Lovable alternative built for Cloudflare Workers. While I couldn't access all component source files directly, I've identified their core tech stack and architectural patterns for real-time visualization.

## Tech Stack for Real-Time UI

### Core Framework
- **Next.js 15** with React 19
- **TypeScript 5.8.3+**
- Hot Module Replacement (HMR) for real-time preview updates

### Component & Animation Libraries
- **shadcn/ui** (Radix UI primitives)
- **Tailwind CSS 4.1.11**
- **Motion 12.23.11** (modern animation engine - replaces Framer Motion)
- **Lucide React 0.486.0** (icons)
- **Lottie & Particles** (additional animation options)

### Real-Time State Management
- **TanStack Query** (for data fetching and state)
- **React Hook Form** (form state)
- **Cloudflare Durable Objects** (strong consistency storage)
- **tRPC** (end-to-end type-safe API)

### Streaming & Real-Time Updates
- **Cloudflare Queues** (async message processing)
- **Cloudflare Workflows** (durable execution with step tracking)
- **Server Sent Events (SSE)** implied via deployment queue system
- **AI SDK** with Anthropic, Azure, OpenAI providers for streaming responses

## Key Dependencies (From package.json)

```json
{
  "dependencies": {
    "next": "15.5.4",
    "react": "19.1.1",
    "motion": "12.23.11",
    "@tanstack/react-query": "^5.x",
    "@tanstack/react-table": "^8.x",
    "react-hook-form": "^7.x",
    "@ai-sdk/anthropic": "^2.0.18",
    "@libra/*": "[workspace packages]",
    "shiki": "[syntax highlighting]",
    "@git-diff-view": "[git diffs visualization]"
  }
}
```

## Architecture for Real-Time Visualization

### Service-Based Approach

**Deployment Service** (`apps/deploy`)
- Uses Cloudflare Queues for async processing
- Tracks deployment state in D1/PostgreSQL database
- Likely publishes status updates via polling or webhooks to frontend

**Screenshot Service** (`apps/screenshot`)
- Queue-based async image generation
- Enables live preview updates without blocking

**Main Web App** (`apps/web`)
- Real-time code editing interface
- Live preview rendering
- Deployment status monitoring

### State Flow Pattern

1. **Event Trigger** → User action (code change, deployment trigger)
2. **Queue Message** → Service receives async message
3. **Durable Steps** → Cloudflare Workflows track each step
4. **Database Update** → State persisted in D1
5. **Frontend Poll/WebSocket** → UI subscribes to status updates
6. **Animation** → Motion library animates progress/state changes

## UI Patterns for "Watching Co-Worker Work"

Based on Libra's architecture, here are the patterns you can adapt:

### 1. Step-Based Progress Visualization
```
- Each Cloudflare Workflow step represents a discrete task
- Timestamps tracked at step start/completion
- State transitions: queued → running → completed/errored
- Retry counts available for resilience display
```

### 2. Real-Time Animation Library
- **Motion 12** provides declarative animation primitives
- Smooth transitions between state changes
- Stagger effects for multi-step sequences
- Perfect for step-by-step execution visualization

### 3. Activity Feed Pattern
```
- Database stores step execution events
- Frontend polls or uses webhook for updates
- Timeline display of events with timestamps
- Icon + status badges for each step
```

### 4. Code & Diff Visualization
- **@git-diff-view** package for visual diffs
- **Shiki** for syntax-highlighted code changes
- Real-time display of generated code

### 5. Streaming Responses
```
- AI SDK supports streaming (Anthropic, Azure, OpenAI)
- Render token-by-token in UI with chunked updates
- Use React's Suspense + useTransition for async boundaries
```

## Recommended Pattern for Clips Demo

### Component Structure
```tsx
// 1. Progress Container (Motion + Tailwind)
<motion.div animate={containerVariants}>
  {steps.map((step, i) => (
    <StepCard
      step={step}
      isActive={activeStep === i}
      isComplete={completedSteps.includes(i)}
    />
  ))}
</motion.div>

// 2. Real-Time Status Updates
// Use TanStack Query for polling or WebSocket subscription
const { data: execution } = useQuery({
  queryKey: ['execution', executionId],
  queryFn: () => fetchExecutionStatus(executionId),
  refetchInterval: 1000 // Poll every second
})

// 3. Streaming Response Display
// Stream AI output token-by-token
<motion.div>
  {tokens.map((token, i) => (
    <motion.span key={i} animate={{opacity: 1}}>
      {token}
    </motion.span>
  ))}
</motion.div>
```

## Design System

Following Libra's approach:
- **shadcn/ui** base components for consistency
- **Tailwind CSS 4** for styling
- **Motion 12** for animations
- **Lucide React** for icons
- Custom **`@libra/ui`** wrapper package for shared components

## Known Limitations of Current Research

- Could not access full component implementations directly
- Exact real-time update mechanism (polling vs WebSocket vs Durable Objects) not confirmed
- Component-level implementation details unavailable
- Database schema for tracking execution state not visible

## Recommended Next Steps

1. **Clone the repository** and explore:
   - `apps/web/src/components/` for exact component implementations
   - `apps/deploy/` for queue/workflow integration patterns
   - `packages/ui/` for design system components

2. **Key files to review**:
   - Deployment status pages (likely in dashboard)
   - Real-time preview implementation
   - Streaming response handling

3. **Technologies to prototype**:
   - Motion 12 animations for step sequences
   - TanStack Query for polling execution status
   - Shiki for code syntax highlighting
   - @git-diff-view for visual code changes

## References

- [GitHub - nextify-limited/libra](https://github.com/nextify-limited/libra)
- [Cloudflare Workflows Docs](https://developers.cloudflare.com/workflows/)
- [Motion Animation Library](https://motion.dev/)
- [TanStack Query](https://tanstack.com/query)
- [shadcn/ui](https://ui.shadcn.com/)

---

**Next Action**: Clone libra repository locally to analyze actual component implementations and execution state management patterns.
