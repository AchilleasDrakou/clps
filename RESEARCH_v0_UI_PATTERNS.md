# v0 & Modern AI Tools: UI Pattern Research for Real-Time Generation

**Date:** 2026-03-20
**Context:** Building premium workspace UI for Clips (clps.ai) demo video generator
**Goal:** Extract UI patterns, animations, and micro-interactions from v0.dev, Cursor, Bolt.new, Lovable, and Replit Agent

---

## 1. Real-Time Generation Feedback Patterns

### 1.1 Progress Indicators (Hierarchical Status Display)

**Pattern: Task Status Categories**
- Group activities by stage: "In Progress" → "Ready for Review" → "Completed"
- Cursor example: Task cards show status with duration metrics ("10m", "14m 22s")
- Add substatus messages: "Fetching data", "Generating plan", "Compiling preview"

**Implementation for clps.ai:**
```
Activity Feed:
├─ Planning [⏳ in progress]
├─ Generating Script [⏳ in progress]
├─ Recording Demo [⏸️ pending]
└─ Finalizing [⏸️ pending]
```

Each stage shows:
- Icon + label + elapsed time
- Sub-action description ("Explored 12 files")
- Agent identity + model ("Claude Opus 4.6")
- Diff stats if applicable ("+45 lines of narration")

### 1.2 Agent Activity Narrative

**Pattern: Conversational Progress Messages**
Cursor displays progress as messages:
- "Explored 12 files, 4 searches"
- "Worked for 14m 22s"
- "On it. I'll build the dashboard..."
- "Done! Here's a walkthrough..."

**Why it works:** Creates a sense of the AI "thinking out loud" rather than a cold progress bar.

**For clps.ai:**
- "Analyzing script structure... found 5 scenes"
- "Recording scene 1 of 5 (35% complete)"
- "Generating narration for [beat name]"
- "Finalizing 4K export"

### 1.3 Streaming Content Stabilization

**Pattern: Prevent Layout Shift During Generation**
v0 uses:
- **Viewport-based boundaries** to segment UI into fixed zones
- **Metadata boundaries** to isolate streaming content areas
- **Suspension boundaries** via React Suspense for graceful transitions

**Why:** As code/content streams in, layout should *never* shift. This creates the perception of instant responsiveness.

**For clps.ai:**
- Lock the iframe height (or aspect ratio) before content loads
- Use skeleton/placeholder for demo plan beats
- Activity feed items have fixed height until populated
- Narration script section uses fixed-width editor pane

---

## 2. Layout Architecture for Polished UX

### 2.1 Split Pane Design (Code/Preview Pattern)

**Pattern: Synchronized Dual View**
v0 and Bolt.new both use side-by-side layouts:
- Left: Code/config (read-only in v0)
- Right: Live interactive preview
- Divider is draggable to adjust pane ratio

**For clps.ai Workspace:**
```
┌─────────────────────────────────┐
│          WORKSPACE              │
├──────────────┬──────────────────┤
│              │                  │
│  Activity    │   Live Preview   │
│   Feed       │   (Browser/      │
│             │    Iframe)       │
│              │                  │
├──────────────┼──────────────────┤
│   Demo Plan  │  Narration       │
│   (Checklist)│  Script Editor   │
│              │                  │
└──────────────┴──────────────────┘
```

**Key Features:**
- Resizable dividers (localStorage persistence for user preference)
- Fixed aspect ratio for preview iframe (16:9)
- Sticky headers for each section
- Smooth resize animations

### 2.2 Card-Based Organization

**Pattern: Consistent Spacing & Grouping**
All tools (v0, Bolt, Cursor) use card-based layouts:
- Consistent padding (16px / 24px / 32px rhythm)
- Subtle borders or shadows for depth
- Hover states for interactivity
- Icons + text hierarchy

**For activity feed cards:**
```
┌─ [icon] Stage Name              [10m 22s] ⟳
├─ Sub-action description...
├─ Agent: Claude Opus 4.6
└─ Metrics: +45 lines | 3 errors fixed
```

---

## 3. Animation & Micro-Interactions

### 3.1 Skeleton Loaders (Perceived Speed)

**Pattern: Show Structure Before Content**
v0 and Bolt show loading placeholders:
- Skeleton screens mimic final layout (low-fidelity wireframes)
- Shimmer effect (pulse animation) on skeleton
- When real content arrives, fade skeleton out smoothly

**Framer Motion Implementation:**
```javascript
// Skeleton + content animation
<motion.div
  initial={{ opacity: 0.6 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5 }}
>
  {isLoading ? <SkeletonLoader /> : <ActualContent />}
</motion.div>

// Shimmer effect for skeleton
const shimmerVariants = {
  initial: { backgroundPosition: "0% center" },
  animate: { backgroundPosition: "100% center" }
};

<motion.div
  variants={shimmerVariants}
  animate="animate"
  transition={{ duration: 1.5, repeat: Infinity }}
/>
```

### 3.2 Staggered Animations (Activity Feed)

**Pattern: Sequential Entrance Animations**
When new activity items appear:
- Animate in sequentially (stagger 100-150ms apart)
- Use spring physics for natural motion: `type: "spring", stiffness: 100, damping: 15`
- Combine: slide-in from left + fade-in

**For clps.ai:**
```javascript
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring", stiffness: 100, damping: 15 }
  }
};
```

### 3.3 Progress Indicators (Visual Metaphors)

**Pattern: Animated Progress Bars**
Instead of static progress bars:
- Indeterminate animation (pulsing width) while generating
- Smooth transition to deterministic fill when known
- Color change on completion (gray → green)

**Cursor example:** "Generating plan" shows animated progress with percentage.

### 3.4 Shared Element Transitions

**Pattern: Layout Shift Animations**
When dragging split pane dividers or expanding sections:
- Use `layoutId` in Framer Motion for element continuity
- Smooth transition between layout states
- Prevents jarring visual jumps

---

## 4. Visual Hierarchy & Typography

### 4.1 Consistent Text Scale

**Pattern: Predictable Font Sizing**
```
Hero Title:       32px / 40px bold
Section Header:   20px / 24px semibold
Body Text:        14px / 16px regular
Meta/Time:        12px / 14px light (secondary)
Code/Monospace:   13px monospace (for script preview)
```

**For clps.ai:**
- Activity feed titles: 14px bold
- Stage descriptions: 12px regular (gray-600)
- Timing badges: 11px bold (accent color)
- Script editor: 13px monospace (readable code)

### 4.2 Color-Coded Status

**Pattern: Semantic Colors**
- In Progress: Blue (#3B82F6)
- Completed: Green (#10B981)
- Error/Failed: Red (#EF4444)
- Pending: Gray (#9CA3AF)
- Warning: Amber (#F59E0B)

**Add subtle backgrounds:**
- Status badges with 10% opacity background
- Icon + color = instant recognition

### 4.3 Icon + Label Pairing

**Pattern: Visual + Text Redundancy**
- Never icon-only for critical status
- Always pair: [Icon] Label [Time/Metric]
- Use consistent icon set (Lucide, Heroicons)

**Icons for clps.ai:**
- ⏳ In Progress (hourglass)
- ✓ Completed (check)
- ⚠ Warning (alert)
- → Processing (arrow-right spinning)
- 📹 Recording (camera)
- 🎯 Planning (target)

---

## 5. Interaction Patterns

### 5.1 Hover States (Depth & Focus)

**Pattern: Progressive Disclosure**
On hover:
- Increase shadow (elevation change)
- Highlight background (10% opacity)
- Show hidden buttons/actions (copy, edit, delete)
- Underline links

```css
/* Activity card hover */
.activity-card {
  transition: all 0.2s ease-out;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.activity-card:hover {
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  background: rgba(0,0,0,0.02);
}
```

### 5.2 Draggable Split Panes

**Pattern: Persistent User Preference**
- Save pane ratios to localStorage
- Smooth drag animation (0.1s transition)
- Visual feedback: cursor changes, divider highlights on hover
- Double-click divider to reset to default

### 5.3 Click Feedback (Micro-Interactions)

**Pattern: Button Press Animation**
- Scale down 2-3% on click
- Haptic feedback (if on mobile)
- Tooltip on long-hover

**Framer Motion:**
```javascript
const buttonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05 },
  tap: { scale: 0.95 }
};

<motion.button
  variants={buttonVariants}
  initial="rest"
  whileHover="hover"
  whileTap="tap"
/>
```

---

## 6. Real-Time Preview Optimization

### 6.1 Iframe Performance

**Pattern: Efficient Live Updates**
v0 and Bolt both use iframes for live preview:
- Sandboxed environment prevents breaks
- Can reload without affecting parent
- Use `srcdoc` for small updates, full reload for large changes
- Add loading state while iframe rehydrates

### 6.2 Scroll Behavior

**Pattern: Smooth Scrolling + Sticky Headers**
- Activity feed: infinite scroll or virtual scroll (react-window)
- Sticky timestamp headers ("Now", "5m ago", "1h ago")
- Code editor: fixed height with internal scroll
- Smooth scroll on auto-scroll (new items appear at bottom)

---

## 7. Premium Details (Micro-Polish)

### 7.1 Spacing Rhythm (8px Grid)

**Pattern: Consistent Whitespace**
```
8px  = micro spacing (button text padding)
12px = small spacing (icon + text)
16px = default spacing (card padding, section gaps)
24px = medium spacing (section separators)
32px = large spacing (major section breaks)
```

**Never arbitrary:** All spacing should be multiples of 4.

### 7.2 Shadows & Elevation

**Pattern: Layered Depth**
```
No shadow:      Flat elements (text)
1px 3px 0 rgba: Ground level (cards, buttons at rest)
0 10px 25px:    Elevated (hover state, modals)
0 20px 60px:    Peak (floating actions, overlays)
```

**Use blur + spread sparingly:** 1-2 layers max per component.

### 7.3 Glassmorphism (Optional Modern Touch)

**Pattern: Frosted Glass Effect**
- Header: `backdrop-filter: blur(10px)` + `bg-white/80`
- Creates depth without clutter
- Works well for sticky headers over dynamic content

### 7.4 Smooth Scrollbars

**Pattern: Hidden by Default, Visible on Hover**
```css
/* Firefox */
scrollbar-width: thin;
scrollbar-color: rgba(0,0,0,0.2) transparent;

/* Webkit */
.scrollable::-webkit-scrollbar {
  width: 6px;
}

.scrollable::-webkit-scrollbar-track {
  background: transparent;
}

.scrollable::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.2);
  border-radius: 3px;
}
```

---

## 8. Component-Specific Patterns

### 8.1 Activity Feed Item (Reusable Card)

```
┌────────────────────────────────┐
│ [icon] Stage Name      [12:34] │
│ Sub-description of current     │
│ Agent: Claude Opus 4.6         │
│ [Progress bar if applicable]   │
│ [Metrics: +45 lines | 3 fixed] │
└────────────────────────────────┘
```

**Hover state:** Show "Expand", "Copy", "Details" buttons.

### 8.2 Demo Plan Item (Checklist)

```
☐ Scene 1: Introduction (4.2s)
  ├─ Beat 1.1: "Hook"
  ├─ Beat 1.2: "Value prop"
  └─ Beat 1.3: "CTA"
```

**Interactive:** Click checkbox to mark complete, hover to edit.

### 8.3 Narration Script Editor

**Pattern: Code Editor with Highlighting**
- Syntax highlighting (speaker cues, timecodes)
- Line numbers
- Word count badge
- Auto-save indicator (last saved 2m ago)
- Character limit warning (approaching max)

---

## 9. Animation Timing Guide

| Use Case | Duration | Easing |
|----------|----------|--------|
| Button feedback | 100-150ms | easeOut |
| Card entrance | 300-400ms | spring (stiffness: 100) |
| Modal open | 200-300ms | easeInOut |
| Progress update | 400-600ms | easeInOut |
| Scroll into view | 500-800ms | easeInOut |
| Page transition | 300-500ms | easeOut |

**Rule:** Faster animations feel snappier, slower feels more intentional. 200ms is the "sweet spot" for most interactions.

---

## 10. Tools & Libraries Recommended

### Animation
- **Framer Motion** (React first-class, springs, shared layouts)
- **Motion** (formerly Framer Motion, web-first)
- **Tailwind CSS** (animations + transitions)

### Layout
- **react-split-pane** or **react-resizable** (split panes)
- **react-window** (virtualization for long lists)
- **react-virtualized** (infinite scrolling)

### Code Editor
- **Monaco Editor** (lightweight, syntax highlighting)
- **Prism.js** (syntax highlighting + themes)

### Icons
- **Lucide React** (clean, consistent)
- **Heroicons** (TailwindCSS official)

---

## 11. Immediate Action Items for clps.ai

**High Impact (Do First):**
1. ✅ Add skeleton loaders to activity feed items
2. ✅ Implement staggered entrance animations for feed items
3. ✅ Add progress indicators with time/agent metadata
4. ✅ Resize split panes with localStorage persistence
5. ✅ Color-code status badges (in-progress, completed, error)

**Medium Impact (Polish):**
6. ✅ Hover states + depth shadows on cards
7. ✅ Smooth scrollbars (hidden by default)
8. ✅ Sticky headers in feed (timestamp groups)
9. ✅ Glassmorphic header with blur
10. ✅ Icon + label pairs (never icon-only)

**High Polish (Final Pass):**
11. ✅ Spring animations for interactive elements
12. ✅ Shared element transitions for layout changes
13. ✅ Narration script editor with line numbers + word count
14. ✅ Auto-scroll new items into view
15. ✅ Context menu on hover (expand, copy, details)

---

## 12. Visual Reference Checklist

**Before/After Comparison:**

**Before (Current):**
- Bare Tailwind, no animations
- Static layout, cramped spacing
- Text-only status (no icons)
- No visual hierarchy
- No loading states

**After (Target):**
- ✅ Smooth animations (stagger, spring, fade)
- ✅ Responsive split-pane layout (resizable)
- ✅ Color-coded icons + semantic status
- ✅ Clear typography hierarchy (3 levels)
- ✅ Skeleton loaders + progress indicators
- ✅ Hover states with depth
- ✅ Glassmorphic headers
- ✅ Micro-interactions on buttons
- ✅ Fixed aspect ratio iframe
- ✅ Sticky section headers

---

## Sources

- [v0 by Vercel - Build with AI](https://v0.app)
- [Cursor IDE - The Best Way to Code with AI](https://cursor.com/)
- [Bolt.new - AI Builder](https://bolt.new/)
- [Replit Agent - Build Apps with AI](https://replit.com/agent)
- [Activity Stream Design Patterns](https://ui-patterns.com/patterns/ActivityStream)
- [Activity Feed Design Guide](https://www.aubergine.co/insights/a-guide-to-designing-chronological-activity-feeds)
- [Framer Motion Documentation](https://motion.dev/)
- [Skeleton UI Pattern Guide](https://blog.logrocket.com/improve-react-ux-skeleton-ui/)
- [React Split Pane Tutorial](https://www.dhiwise.com/post/getting-started-with-react-split-pane-a-step-by-step-tutorial)
- [Progress Indicators UX Design](https://medium.muz.li/progress-indicators-and-trackers-d7a592940041)
