# tr-dashboard

Modern, responsive frontend for [tr-engine](https://github.com/LumenPrima/tr-engine) radio scanning backend.

## Features

- **Real-time monitoring** - Live call activity, active talkgroups, unit events, system health
- **Historical analysis** - Searchable call history, playback, filtering, and data exploration
- **Audio player** - Global player with transmission timeline and keyboard shortcuts
- **Command palette** - Quick navigation with Ctrl+K
- **Go To menu** - Press `G` for quick navigation with search
- **Live monitoring** - Auto-play calls from selected talkgroups
- **Talkgroup customization** - Configurable color rules with hide/highlight modes and wildcard matching
- **Transcription display** - View call transcriptions with word-level timing

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui (Radix-based components)
- Zustand (state management)
- React Router v7
- OpenAPI TypeScript (auto-generated API types)

## Development

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173` with API proxy to tr-engine backend.

### Regenerate API Types

Types are auto-generated from the backend OpenAPI spec:

```bash
npm run api:generate
```

## Keyboard Shortcuts

### Navigation

| Key | Action |
|-----|--------|
| `Ctrl+K` | Command palette |
| `G` | Open Go To menu |
| `G` then `D` | Go to Dashboard |
| `G` then `C` | Go to Calls |
| `G` then `T` | Go to Talkgroups |
| `G` then `U` | Go to Units |
| `G` then `S` | Go to Settings |
| `[` | Toggle sidebar |

### Audio Player

| Key | Action |
|-----|--------|
| `Space` | Play/pause |
| `J` | Next call |
| `K` | Previous call |
| `L` | Seek forward 5s |
| `H` | Seek backward 5s |
| `R` | Replay current call |
| `M` | Mute/unmute |

## License

MIT
