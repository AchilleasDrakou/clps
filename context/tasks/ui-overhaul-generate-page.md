# Task: Generate Page UI Overhaul

## Problem
The generate page feels dead while the pipeline runs. User sees a flat list of text lines with spinners — no sense of what's actually happening, no visual hierarchy, no sub-process visibility. Feels like staring at logs, not watching a co-worker work.

## Reference: How v0 does it
- Shows edits happening across files/screens in real-time
- Uses skeleton loaders so you see structure before content
- Shows sub-processes within each stage (not just "Planning..." but the actual steps within planning)
- Compacts completed stages — only shows what's relevant NOW
- Easy to observe and follow along without reading every line

## Requirements

### 1. Stage-based accordion view (not flat list)
- Each pipeline stage is a collapsible card
- Current stage: expanded, showing sub-steps and live detail
- Completed stages: collapsed to one-line summary (e.g. "Found 3 pages" not the full list)
- Upcoming stages: skeleton placeholder showing what's coming

### 2. Sub-process visibility within stages
- **Discovering**: show search query, results appearing one by one
- **Understanding**: show each page being scraped with title + token count
- **Planning**: show beats appearing one by one as LLM generates them (not all at once)
- **Capturing**: live browser + action checklist ticking off
- **Rendering**: progress indicator for Remotion render
- **Narrating**: each beat's narration appearing with audio waveform/duration
- **Merging**: simple progress bar

### 3. Skeleton loaders for upcoming stages
- Before planning completes: show skeleton beat cards
- Before capture: show skeleton browser frame
- Before narration: show skeleton script lines
- Gives user a sense of what's coming without empty space

### 4. Smart compaction
- Completed stages auto-collapse after 2 seconds
- Show summary badge: "3 pages found", "7 beats planned", "14.2s recorded"
- Current stage stays expanded with full detail
- User can click to re-expand any completed stage

### 5. Left panel improvements
- Before capture: show a visual of the pipeline stages as a vertical timeline (not empty browser placeholder)
- During capture: live browser iframe
- After capture: thumbnail of the recording
- After complete: video player with the final output

### 6. Micro-interactions
- Stage transitions: smooth slide/fade between stages
- New items: slide in from left with spring physics
- Completion: checkmark morphs from spinner
- Progress bar: gradient that shifts color per stage

## Technical Notes
- SSE events already carry rich data payloads — the backend is ready
- Need to restructure the activity feed from flat list → grouped stage cards
- Consider streaming the plan beats incrementally (currently sent all at once after planning completes)
- Motion 12 already installed for animations

## Priority
High — this is the hackathon demo. The generate page IS what judges see.
