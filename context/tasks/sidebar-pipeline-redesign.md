# Task: Sidebar Pipeline Redesign — Collapsible Row Pattern

## Summary

Redesign the right-panel pipeline sidebar on `app/generate/page.tsx`. Replace the current `StageCard` accordion with a collapsible row pattern inspired by the provided Plan component. Each pipeline stage becomes a compact expandable row with status icons, vertical connecting lines, and staggered subtask animations.

## Design

### Row Pattern (per stage)
Each stage is a single row:
- **Status icon** (left) — clickable area showing stage state:
  - `active` → `CircleDotDashed` (blue, spinning/pulsing)
  - `done` → `CheckCircle2` (green) with spring entrance
  - `error` → `CircleX` (red)
  - `upcoming` → `Circle` (muted)
  - Icon transitions use `AnimatePresence mode="wait"` with scale+rotate micro-animation
- **Stage label** — medium text, strikes through when done, muted when upcoming
- **Right side** — status badge pill (colored: green/blue/yellow/red/muted) + summary badge when done ("3 pages found")

### Vertical Connecting Lines
- Dashed vertical line connecting stage icons (like the provided Plan component)
- `border-l-2 border-dashed border-muted-foreground/30` aligned with icon center
- Color shifts: done segments could be solid emerald, active segment has animated gradient

### Expandable Sub-Processes
Click a stage row → expands to show sub-process detail:
- Uses existing detail components: `DiscoveringDetail`, `PlanningDetail`, `CapturingDetail`, etc.
- Subtasks indent under the stage with the connecting line pattern
- Expand/collapse uses `AnimatePresence` + height animation with custom easing `[0.2, 0.65, 0.3, 0.9]`
- Staggered children entrance (`staggerChildren: 0.05`)
- Auto-expand active stage, auto-collapse done stages after 2s (keep existing StageCard behavior)

### Sub-Process Items (within expanded stage)
Each sub-item (discovered page, planned beat, etc.) follows the subtask pattern:
- Small status icon (3.5 size) + label text
- Expandable description on click (for items that have detail)
- Tool/badge pills for metadata (e.g., "3 pages", "7 beats")

### LayoutGroup
Wrap entire pipeline list in `<LayoutGroup>` for smooth reflow when stages expand/collapse.

### Reduced Motion Support
Respect `prefers-reduced-motion`:
- Skip spring physics, use tween with short duration
- No stagger delays
- No scale/rotate micro-animations

## Animation Variants (from provided reference)

```typescript
// Stage row entrance
const stageVariants = {
  hidden: { opacity: 0, y: -5 },
  visible: {
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 500, damping: 30 }
  }
};

// Sub-process list expand
const subListVariants = {
  hidden: { opacity: 0, height: 0, overflow: "hidden" },
  visible: {
    height: "auto", opacity: 1, overflow: "visible",
    transition: { duration: 0.25, staggerChildren: 0.05, ease: [0.2, 0.65, 0.3, 0.9] }
  }
};

// Individual sub-item
const subItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1, x: 0,
    transition: { type: "spring", stiffness: 500, damping: 25 }
  }
};

// Status badge bounce on change
const badgeVariants = {
  initial: { scale: 1 },
  animate: { scale: [1, 1.08, 1], transition: { duration: 0.35 } }
};
```

## Files to Modify

| File | Change |
|------|--------|
| `app/generate/_components/stage-card.tsx` | Replace with new collapsible row component (or rename to `stage-row.tsx`) |
| `app/generate/_components/stage-timeline.tsx` | Update to match new visual language if still used in left panel |
| `app/generate/page.tsx` | Update imports, adapt pipeline section to new row component |
| `app/generate/_components/sub-process.tsx` | Keep detail components, may adjust padding/sizing for new container |

## What to Keep from Existing
- All 7 pipeline stages + their data flow (SSE events, state management)
- Sub-process detail components (DiscoveringDetail, PlanningDetail, etc.)
- Stage status logic (`getStageStatus`, `getStatus`)
- Auto-expand active / auto-collapse done behavior
- Summary badges ("3 pages found", "7 beats planned")
- Skeleton loaders for upcoming stages
- Error state handling + error card
- Complete card at bottom
- `motion/react` (NOT framer-motion — the provided example uses framer-motion, we use motion/react)

## What to Take from Provided Example
- Compact row layout (icon + label + badges on single line)
- Vertical dashed connecting lines between stages
- `LayoutGroup` wrapping for smooth reflow
- Staggered subtask entrance animations
- Status icon cycling with rotate+scale micro-animation
- Hover highlight on rows (`whileHover backgroundColor`)
- `AnimatePresence mode="wait"` for icon transitions
- Custom easing curve `[0.2, 0.65, 0.3, 0.9]`

## Key Differences from Provided Example
- Our stages are dynamic (status comes from SSE), not user-toggleable
- We use `motion/react` not `framer-motion`
- Our sub-processes are rich components (page lists, beat lists, progress bars), not simple text
- We need skeleton loaders for upcoming stages
- Dark theme (existing) not light theme (provided example)
- Status colors: stage-specific colors (blue, purple, amber, pink, green, indigo) not generic green/blue/yellow/red

## Open Questions
- Should the left-panel `StageTimeline` also adopt the new row pattern, or keep as-is?
- Dependency badges (from provided example) — relevant for our pipeline? Stages are sequential so maybe not needed
- Should completed stages show a one-line summary inline (like current) or only in expanded view?
