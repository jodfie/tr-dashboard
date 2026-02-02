# tr-dashboard

Modern, responsive frontend for [tr-engine](https://github.com/LumenPrima/tr-engine) radio scanning backend.

## Features

- **Real-time monitoring** - Live call activity, active talkgroups, unit events, system health
- **Historical analysis** - Searchable call history, playback, filtering, and data exploration
- **Audio player** - Global player with transmission timeline and keyboard shortcuts
- **Command palette** - Quick navigation with Cmd+K
- **Live monitoring** - Auto-play calls from selected talkgroups

## Tech Stack

- React 18 + TypeScript
- Vite
- Tailwind CSS
- shadcn/ui (Radix-based components)
- Zustand (state management)
- React Router v6

## Development

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173` with API proxy to `localhost:8080` (tr-engine backend).

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd+K` | Command palette |
| `Space` | Play/pause |
| `J` | Previous transmission |
| `K` | Next transmission |
| `M` | Mute/unmute |

## License

MIT
