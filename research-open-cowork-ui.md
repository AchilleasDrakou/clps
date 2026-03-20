# OpenCowork UI Patterns Research

**Date**: 2026-03-20
**Source**: https://github.com/OpenCoworkAI/open-cowork
**Purpose**: Real-time agent/pipeline visualization patterns for Clips generate page

---

## Executive Summary

OpenCowork uses a **streamed message architecture** with three-part flexbox layout, Zustand state management, and Tailwind CSS. Their approach separates partial/thinking content into independent buffers, uses collapsible blocks for thinking/tool details, and provides real-time visual feedback through status icons and duration timers.

---

## 1. Real-Time Agent Activity Visualization

### How They Render Live Agent Progress

**Streaming Pattern** (in `ChatView.tsx`):
- Messages merge persistent array with active streaming message at insertion point
- Streaming message has ID `partial-${activeSessionId}` containing partial text + thinking blocks
- Three independent content streams tracked:
  - `partialMessage`: incremental text buffer
  - `partialThinking`: reasoning buffer
  - `activeTurn`: current conversation turn reference

**Detection**: `const hasStreamingContent = partialMessage || partialThinking`

### Agent Activity Indicators

**Processing States**:
1. **Active turn without content**: Animated spinner + "processing" label
2. **Execution timer**: Clock icon with elapsed time, updates every 100ms
3. **Stop button**: Appears when `isSessionRunning || hasActiveTurn || pendingCount > 0`

**Visual Feedback**:
- Streaming cursor: `span className="inline-block w-2 h-4 bg-accent ml-1 animate-pulse"`
- Pulsing block indicates active content delivery

---

## 2. Layout Patterns for Split-Panel Workspace

### Three-Part Chat Layout

```
Container: flex-1 flex flex-col overflow-hidden bg-background

┌─────────────────────────────────────────┐
│ Header (fixed height)                   │
│ - Left: branding "Open Cowork"          │
│ - Center: session title (truncated)     │
│ - Right: active MCP connectors          │
├─────────────────────────────────────────┤
│ Messages Area (scrollable flex-1)       │
│ - max-w-[920px] mx-auto                │
│ - py-8 px-5 lg:px-8 space-y-5         │
│ - Individual MessageCard components     │
├─────────────────────────────────────────┤
│ Input Area (sticky bottom)              │
│ - Image preview grid (2-5 cols)        │
│ - File attachment list                  │
│ - Message textarea                      │
│ - Send/stop controls                    │
└─────────────────────────────────────────┘
```

**Key Alignment**:
- Content max-width: `920px` (centered)
- Responsive padding: `px-4 lg:px-8` (mobile/desktop)
- Header with backdrop blur: `"px-4 lg:px-8"`
- Messages grouped with consistent spacing: `space-y-5`

---

## 3. Real-Time Streaming Update Handling

### State Management (Zustand)

**Per-session state structure**:
```typescript
SessionState {
  messages: Message[]
  partialMessage: string      // Streaming text buffer
  partialThinking: string     // Streaming reasoning buffer
  pendingTurns: string[]      // Queued message IDs
  activeTurn: { stepId, userMessageId }
  executionClock: { startAt, endAt }
  traceSteps: TraceStep[]
  contextWindow: number
}
```

**Streaming Actions**:
- `setPartialMessage()`: Append deltas `ss.partialMessage + partial`
- `clearPartialMessage()`: Reset on complete response
- Both thinking and text stream independently

**Turn Activation Flow**:
1. User message → `pendingTurns` queue
2. `activateNextTurn()` → dequeue and set `activeTurn`
3. `updateActiveTurnStep()` → advance step ID
4. `clearActiveTurn()` → conclude turn

**Trace Step Updates**:
- `addTraceStep()`: Append execution steps
- `updateTraceStep()`: Mutate by ID for real-time visibility

### Scroll Management

**RAF-based debounced scroll** (prevents conflicts):
- Request queuing with ~16ms timeout delays
- Flag-based scroll state: `isScrollingRef.current`
- Auto-scroll only when at bottom (≤80px threshold)
- Distinction: new message scrolls (smooth) vs streaming ticks (auto)

**ResizeObserver**: Detects content height changes, triggers scroll adjustments

---

## 4. "Watching a Co-Worker Work" - Animations & Visual Patterns

### Thinking Block Component

**Collapsible Design** (`ThinkingBlock.tsx`):
- Brain icon + preview text (first 80 chars)
- Chevron indicating expansion state
- Click to toggle expansion
- Fade-in animation on expand: `"animate-fade-in"`
- Markdown processing with bold text support
- Fallback to `whitespace-pre-wrap` on error

**Styling**:
- `"border-border-subtle"` with semi-transparent background
- Hover state: `"hover:bg-surface-hover/50"`
- Lazy-loaded `MessageMarkdown` inside error boundary

### Tool Execution Visualization

**Dynamic Status Indicators** (`ToolUseBlock.tsx`):
```
Running   → Animated spinner + accent color
Error     → Red X icon + error styling
Success   → Green checkmark + success color
```

**Always-Visible Header**:
- Status icon updates as execution progresses
- Tool name + label
- Duration timer (elapsed milliseconds/seconds)

**Expandable Details**:
- Collapsed: Summary + duration (first 80 lines or error truncated to 60 chars)
- Expanded: Input (JSON formatted) + Output (scrollable, max-height 300px) + Base64 images
- MCP tools show server name badge

**Card Coloring**: Transitions based on state, providing continuous visual feedback

### Message Streaming

**Markdown Rendering** (`MessageMarkdown.tsx`):
- Uses `remarkMath`, `rehypeKatex` for LaTeX
- `remarkGfm` for GitHub-flavored markdown
- `rehypeSanitize` for security
- Wrapper classes: `"prose-chat max-w-none text-text-primary"`

**Streaming Indicator**: Pulsing cursor block appears during active content delivery

---

## 5. Design System & Component Library

### Tech Stack

**Frontend Framework**: React + Tailwind CSS
**Build Tool**: Vite
**State Management**: Zustand
**Markdown Rendering**: `react-markdown` with plugins

### Tailwind Configuration

Uses design tokens through Tailwind:
- **Colors**: `bg-background`, `bg-surface-hover`, `text-text-primary`, `border-border-subtle`
- **Accent color**: `bg-accent` (used for loading/active states)
- **Animations**:
  - `animate-pulse` (streaming cursor)
  - `animate-fade-in` (thinking block expansion)

### Component Hierarchy

**Top-level panels**:
- `Sidebar`: Navigation for threads/sessions
- `ChatView`: Main message interface
- `Titlebar`: Window controls
- `ErrorBoundary` + `PanelErrorBoundary`: Error handling

**Message rendering**:
- `MessageCard`: Container for user/assistant messages
- `ContentBlockView`: Dispatcher for different block types
- `MessageMarkdown`: Text rendering with plugins
- `ThinkingBlock`: Collapsible reasoning display
- `ToolUseBlock`: Tool execution visualization
- `ToolResultBlock`: Tool output display
- `CodeBlock`: Syntax-highlighted code
- `AskUserQuestionBlock`: User prompts
- `TodoWriteBlock`: Task/todo rendering

**Notifications**:
- `GlobalNoticeToast`: System-wide notifications
- `SandboxSyncToast`: Sandbox events
- `RemoteControlPanel`: Remote execution status

---

## 6. Interesting Patterns for Plans/Steps/Progress

### Message Content Block Architecture

Messages store arrays of `ContentBlock` objects:
```typescript
type ContentBlock =
  | { type: 'text', text: string }
  | { type: 'thinking', thinking: string }
  | { type: 'tool_use', ... }
  | { type: 'tool_result', ... }
```

**Smart Rendering**:
- `ContentBlockView` dispatches to specialized components
- Flexible input: if not array, wraps as text block
- Tool results merged with tool_use by ID to prevent duplication

### Trace Step Management

**For step-by-step progress**:
```typescript
traceSteps: TraceStep[]
```

- `addTraceStep()`: Append execution step
- `updateTraceStep(id, delta)`: Real-time mutation
- Enables live step visualization without re-rendering entire trace

### Message Status Indicators

**Per-message statuses** (`MessageCard.tsx`):
```
Queued   → Clock icon + reduced opacity
Cancelled → X icon + reduced opacity
```

Local status prop: `localStatus` drives visual indicators

---

## 7. Key Takeaways for Clips Generate Page

### Applicable Patterns

1. **Streaming Architecture**: Independent partial buffers for thinking vs execution
2. **Scroll Management**: RAF-debounced with bottom-threshold detection
3. **Collapsible Details**: Thinking/tool blocks with fade-in animations
4. **Real-Time Timers**: 100ms interval updates for elapsed time
5. **Status Icons**: Spinner → checkmark/error progression
6. **Centered Content**: `max-w-[920px] mx-auto` with responsive padding
7. **Zustand State**: Per-session structure with immutable updates
8. **Design Tokens**: Semantic color classes (`bg-accent`, `border-subtle`, etc.)

### Not Applicable

- Desktop-specific features (Electron API, sandbox management)
- Remote control/pairing system
- Session switching/chat history
- File attachment handling

### Recommended Adaptations

1. **Progress Timeline**: Use `traceSteps` pattern for plan execution stages
2. **Step Visibility**: Expandable step cards with input/output similar to tool blocks
3. **Thinking Display**: Collapsible reasoning blocks during generation
4. **Status Transitions**: Animated state changes (queued → running → complete)
5. **Incremental Content**: Stream plan/step details as they're generated
6. **Action Controls**: Stop/resume buttons while processing

---

## Files Referenced

- `src/renderer/components/ChatView.tsx` - Main layout and scroll management
- `src/renderer/store/index.ts` - State management patterns
- `src/renderer/components/message/ThinkingBlock.tsx` - Collapsible content pattern
- `src/renderer/components/message/ToolUseBlock.tsx` - Status visualization
- `src/renderer/components/MessageCard.tsx` - Message rendering
- `src/renderer/components/MessageMarkdown.tsx` - Markdown + streaming

