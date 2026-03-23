# Investigate Timeline — Design Spec

## Problem

When a user sees something in real life (sirens, incident, unusual activity) and wants to dig into radio transmissions around that time, the current workflow is fragmented: navigate to the Calls page, manually set URL params for time filtering, scroll through a flat list, and repeat for different talkgroups. There's no way to see "what happened across all talkgroups at 2:45 PM" as a unified picture.

## Solution

A new **Investigate** page (`/investigate`) with a horizontal timeline visualization. The user enters a time, gets a visual overview of all radio activity across talkgroups in that window, and can click any call block to play it inline.

## Entry Controls

Top bar with three inputs:

- **Time picker** — date + time input, defaults to "now". A "Now" button snaps back to current time.
- **Window selector** — preset buttons: `±5m`, `±15m` (default), `±30m`, `±1h`. Sets the visible time range around the target time.
- **Keyword filter** — optional text input. Filters talkgroup rows by matching against `alpha_tag`, `tag`, `group`, and transcription text. Debounced 300ms, updates as you type.

Below the controls, a summary label: *"Showing 14:30 – 15:00 · 47 calls across 12 talkgroups"*

URL params preserve state for sharing: `?t=2026-03-23T14:45:00Z&window=15&q=fire`

## Timeline Visualization

### Layout

- Horizontal time axis ruler at top with tick marks (interval adapts to zoom: every 1 min at ±5m, every 5 min at ±1h)
- One row per talkgroup that has calls in the window, sorted by call count descending (busiest at top)
- Left column: talkgroup name (linked to `/talkgroups/:key`), colored by user's color rules from `useTalkgroupColors` store (same resolution logic as `CallCard`/`CallList`)
- Right area: call blocks positioned on the time axis

### Implementation

CSS grid with absolute positioning. Each call block is a `<div>` positioned by `(start_time - window_start) / window_duration * 100%`, width proportional to call duration. Only talkgroup rows with calls in the window are rendered.

### Call Blocks

- Width = call duration proportional to time axis
- Color from `useTalkgroupColors.getCachedColor()` (default sky-400)
- Emergency calls: red border/glow
- Encrypted calls: reduced opacity
- Hover: tooltip showing time, duration, unit count
- Click: starts playback inline (block gets pulsing border "playing" indicator)
- Right-click or expand icon: opens detail panel
- Small icon or link to navigate to `/calls/:call_id`

### Now Marker

If the window includes the current time, a vertical dashed line marks "now" and live calls extend in real-time via SSE updates.

### Empty State

If keyword filter produces zero results: *"No calls matching [keyword] in this window"*

## Detail Panel

When a call is expanded, a panel slides open below that talkgroup row:

- **Call info**: start time, duration, frequency, unit count
- **Transcription**: full text if available (word-level timing highlights shown during playback if word data is present in the transcription; gracefully degrades to plain text if absent)
- **Units**: list of transmitting units (linked to `/units/:key`)
- **Link**: "Open full detail →" navigates to `/calls/:call_id`

Only one panel open at a time. Clicking another call closes the current panel. Escape closes it.

## Data Fetching

### Initial Load

Single bulk fetch: `getCalls({ start_time, end_time, limit: 500 })`. Results grouped client-side by `tgid`.

If keyword is set: also `searchTranscriptions(keyword, { start_time, end_time })` to get matching call IDs (extracted from each `TranscriptionSearchHit.call_id`), then intersect with call results to filter visible rows.

### Truncation Detection

After fetch, compare `response.total` against `response.calls.length`. If `total > calls.length`, display *"Showing {calls.length} of {total} calls — narrow your window for complete results"* warning banner.

### Window Changes

Re-fetch on zoom/pan, debounced 300ms. Pan shifts the center time `t` by 25% of the window width, triggering a new fetch. Cache previous windows briefly to make panning feel snappy.

### Live Updates

When the window includes "now":

- SSE `call_start`/`call_update`/`call_end` events from `useRealtimeStore` update the timeline
- Active calls appear as growing blocks
- New talkgroup rows appear automatically

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Left`/`Right` | Pan window by 25% |
| `+`/`-` | Zoom in/out (cycle window presets) |
| `Enter` | Play/pause selected call |
| `Escape` | Close detail panel |
| `N` | Jump to "now" |

Note: `Space` is not used here because it is globally bound to the audio player's play/pause. `Enter` is used instead for the page-level call selection. `N` is a page-local handler (not added to `KEYBOARD_SHORTCUTS` since it's scoped to this page).

## Navigation

- Route: `/investigate`
- Sidebar nav link
- Command palette: Ctrl+K → "Investigate"
- Go To menu: G then I

### Route Placement

Add `<Route path="/investigate" element={<Investigate />} />` inside the `RequireAuth`/`MainLayout` block in `App.tsx`, following the same pattern as all other authenticated pages.

### Go To Menu

Add `GO_TO_INVESTIGATE: 'g>i'` to `KEYBOARD_SHORTCUTS` in `src/lib/constants.ts` AND add `{ key: 'I', label: 'Investigate', path: '/investigate' }` to `NAVIGATION_OPTIONS` in `src/components/command/GoToMenu.tsx`.

## Files

| File | Purpose |
|------|---------|
| `src/pages/Investigate.tsx` | Page component: controls, layout, data fetching |
| `src/components/investigate/Timeline.tsx` | Timeline visualization: time axis, talkgroup rows, call blocks |
| `src/components/investigate/CallBlock.tsx` | Individual call block with hover/click/expand behavior |
| `src/components/investigate/DetailPanel.tsx` | Expandable call detail panel with transcription and units |
| `src/App.tsx` | Add route inside `RequireAuth`/`MainLayout` |
| `src/components/layout/Sidebar.tsx` | Add nav link |
| `src/components/command/CommandPalette.tsx` | Add command |
| `src/components/command/GoToMenu.tsx` | Add `{ key: 'I', label: 'Investigate', path: '/investigate' }` |
| `src/lib/constants.ts` | Add `GO_TO_INVESTIGATE: 'g>i'` shortcut |

## Non-Goals

- Geographic/area-based filtering (future work)
- Incident grouping across talkgroups (future work)
- Canvas-based rendering (optimize later if DOM performance is insufficient)
