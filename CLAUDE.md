# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**tr-dashboard** is a modern, responsive frontend for the tr-engine radio scanning backend. The application serves users monitoring trunk-recorder radio systems, providing both real-time monitoring and historical data analysis.

### Core Goals

1. **Real-time monitoring** - Live call activity, active talkgroups, unit events, system health
2. **Historical analysis** - Searchable call history, playback, filtering, and data exploration
3. **Beautiful UX** - Modern, responsive design that works across devices
4. **API feedback** - Identify gaps in tr-engine API during development

### Backend

tr-engine aggregates data from trunk-recorder radio systems. API documentation lives in `../tr-engine/docs/` (swagger at `/swagger/`, markdown in `docs/api/`).

## Tech Stack

- **React 18 + TypeScript** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component primitives (Radix-based)
- **Zustand** - State management
- **React Router v6** - Routing
- **react-hotkeys-hook + cmdk** - Keyboard shortcuts and command palette

## Design

Full design plan with UI mockups: `docs/DESIGN_PLAN.md`

Selected design: **Option C "Hybrid Scanner"** - Dense information display with modern aesthetics, collapsible sidebar, split-pane layout, transmission timeline in audio player.

## Repository Structure

```
docs/
└── DESIGN_PLAN.md  # UI designs and implementation plan
src/                # React application
```

## Radio System Domain Model

Understanding the P25 trunked radio hierarchy is essential for this codebase:

```
┌─────────────────────────────────────────────────────────────┐
│ P25 System (sysid)                                          │
│ Example: Ohio MARCS = sysid 348                             │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │ Site/Instance   │  │ Site/Instance   │  ...             │
│  │ butco (Butler)  │  │ warco (Warren)  │                  │
│  │ system_id=1     │  │ system_id=17    │                  │
│  └────────┬────────┘  └────────┬────────┘                  │
│           │                    │                            │
│           └────────┬───────────┘                            │
│                    ▼                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Shared Talkgroups & Units (statewide)               │   │
│  │ - Talkgroup 9178 "09-8L Main" exists once           │   │
│  │ - Unit 943001 "09 8COM1" can affiliate anywhere     │   │
│  │ - Composite key: sysid:tgid (e.g., "348:9178")      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Key Concepts:**
- **sysid** (e.g., "348") = The statewide P25 system identifier (Ohio MARCS)
- **wacn** (e.g., "BEE00") = Wide Area Communication Network ID (shared statewide)
- **nac** = Network Access Code - **unique per site** (340=butco, 34D=warco) - set by radio system admins
- **rfss** = RF Subsystem number (4=butco, 1=warco)
- **site_id** = Site identifier within the RFSS
- **short_name** (butco, warco) = User-defined name for the trunk-recorder instance
- **Talkgroups/Units** = Shared across all sites in the system; same radio IDs work statewide
- **Calls** = Tagged with which site captured them (`system_id`), but reference shared talkgroups (`tg_sysid:tgid`)

Sites only broadcast traffic relevant to radios currently affiliated at that site. A call on talkgroup 9178 may come from butco OR warco depending on where participating radios are located.

**Current Sites:**
| short_name | NAC | RFSS | site_id | system_id |
|------------|-----|------|---------|-----------|
| butco | 340 | 4 | 1 | 1 |
| warco | 34D | 1 | 13 | 17 |

## API Architecture (tr-engine v0.3.1-beta4)

**Dual API Pattern:**
- REST API (`/api/v1`) for CRUD operations and queries
- WebSocket API (`/api/ws`) for real-time event subscriptions

**Key Endpoints:**
- `GET /api/v1/p25-systems` - Returns P25 systems with nested sites (`{p25_systems: [{sysid, wacn, sites: [...]}]}`)
- `GET /api/v1/systems` - Returns recording sites (`{sites: [...], count}` - note: array key is `sites`, not `systems`)

**Core Data Model:**
- **System** - A trunk-recorder site/instance (butco, warco) within a P25 network
- **Talkgroup** - Virtual channel with composite key `(sysid, tgid)` - shared across sites
- **Unit** - Individual radio device with composite key `(sysid, unit_id)` - can affiliate at any site
- **Call** - Audio recording captured by a specific site, references shared talkgroup
- **Transcription** - Speech-to-text with word-level timestamps

**Key Conventions:**
- Frequencies stored in Hz (not MHz)
- Timestamps in ISO 8601 RFC3339 UTC format
- Pagination: `limit` (max 1000, default 50) + `offset`
- **Natural composite keys**: Talkgroups/Units use `sysid:id` format (e.g., `348:9178`)
- Plain ID lookups return 409 Conflict if ambiguous across systems
- Calls have `system_id` (which site captured) and `tg_sysid` (which P25 system the talkgroup belongs to)

## WebSocket Event Types

`call_start`, `call_end`, `call_active`, `audio_available`, `unit_event`, `rate_update`, `recorder_update`

Subscriptions filter by `systems`, `talkgroups`, and `units` arrays.

## When Building Frontend

Refer to `../tr-engine/docs/api/MODELS.md` for TypeScript interfaces. Key changes in v0.3.1:
- Talkgroups/Units no longer have database `id` fields - use `(sysid, tgid)` or `(sysid, unit_id)`
- Calls now include `tg_sysid`, `tgid`, `tg_alpha_tag`, and `audio_url` directly
- Transmissions now return wrapped `{transmissions: [...]}` format
- New transcription endpoints for speech-to-text with word timestamps

## Development Progress

### Completed Features

- **Core Layout**: MainLayout with collapsible sidebar, Header with status indicators
- **Real-time Dashboard**: Active calls display, decode rate indicators, WebSocket connection
- **Call History**: Browsable call list with filtering, CallCard components
- **Call Detail Page**: Full call view with transmissions, audio player, frequency info
- **Audio Player**: Global player with transmission timeline, keyboard shortcuts (J/K/Space/M)
- **Talkgroup Browser**: List view with search, detail pages
- **Unit Browser**: List view with activity history
- **Command Palette**: cmdk integration for quick navigation (Cmd+K)
- **Live Monitoring**: Auto-play calls from selected talkgroups with browser autoplay handling
- **Talkgroup Cache**: Warm cache on startup for instant alpha tag display

### Key Implementation Details

**Talkgroup Activity Sidebar**: Shows recent talkgroup activity with clickable links. Uses `useTalkgroupCache` store to display alpha tags immediately (cache warmed on app startup via `getTalkgroups({limit: 500})`).

**Monitor Store**: Tracks monitored talkgroups by `sysid:tgid` composite key. Auto-enables monitoring when adding a talkgroup. Persisted to localStorage.

**Browser Autoplay Handling**: `AudioPlayer` catches `NotAllowedError` and shows "Click to Enable Audio" prompt. Once unlocked, subsequent auto-plays work.

**API Notes (v0.3.1)**:
- Calls include `tgid`, `tg_alpha_tag`, `tg_sysid` directly (no separate fetch needed)
- Transmissions endpoint now returns `{transmissions: [...], count: N}`
- `rate_update` WebSocket events include `max_rate: 40`
- Signal/noise values of 999 are sentinel for "unknown" - display as "—"
- Decode rates are X/40 (P25 Phase 1 max is 40 control messages/sec)

### Stores

| Store | Purpose |
|-------|---------|
| `useRealtimeStore` | WebSocket data, active calls, recent calls, unit events |
| `useAudioStore` | Playback state, queue, transmissions, autoplay unlock |
| `useMonitorStore` | Monitored talkgroups, monitoring enabled state (persisted) |
| `useTalkgroupCache` | sysid:tgid → alpha_tag cache for instant display |
| `useFilterStore` | Search/filter state |
| `useTranscriptionCache` | Call transcription + transmission data cache |

### Migration Status (v0.3.1) - COMPLETE

All v0.3.1 migration work has been completed:
- ✅ Radio ID-based lookups via composite keys `sysid:tgid`
- ✅ Calls include `tgid`, `tg_alpha_tag`, `tg_sysid`
- ✅ Transmissions wrapped in response object
- ✅ WebSocket subscription confirmation
- ✅ `max_rate` in rate_update events
- ✅ Talkgroup cache keys by `sysid:tgid`
- ✅ Monitor store tracks `sysid:tgid` pairs
- ✅ Database ID references removed from talkgroup/unit types
- ✅ Transcription display on call detail page

**Remaining feature work:**
- Transcription search/browse UI (types exist, no page)
- Call groups browser UI (types exist, no page)

### Running Development

```bash
npm run dev  # Starts on 0.0.0.0:5173
```

Vite proxies `/api` to `localhost:8080` (tr-engine backend).
