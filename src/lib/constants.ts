export const KEYBOARD_SHORTCUTS = {
  // Audio controls
  PLAY_PAUSE: 'space',
  SKIP_NEXT: 'j',
  SKIP_PREVIOUS: 'k',
  MUTE: 'm',
  VOLUME_UP: 'up',
  VOLUME_DOWN: 'down',
  SEEK_FORWARD: 'l',
  SEEK_BACKWARD: 'h',
  REPLAY: 'r',
  // UI controls
  COMMAND_PALETTE: 'ctrl+k',
  TOGGLE_SIDEBAR: '[',
  ESCAPE: 'escape',
  HELP: 'shift+/',
  // Navigation (vim-style g+key sequences)
  GO_TO_DASHBOARD: 'g>d',
  GO_TO_CALLS: 'g>c',
  GO_TO_TALKGROUPS: 'g>t',
  GO_TO_UNITS: 'g>u',
  GO_TO_SETTINGS: 'g>s',
} as const

export const REFRESH_INTERVALS = {
  ACTIVE_CALLS: 5000,
  RECENT_CALLS: 10000,
  STATS: 30000,
  DECODE_RATES: 10000,
} as const

export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 200,
} as const

export const AUDIO = {
  DEFAULT_VOLUME: 0.8,
  SEEK_STEP: 5,
  VOLUME_STEP: 0.1,
} as const

export const SIDEBAR = {
  WIDTH_EXPANDED: 240,
  WIDTH_COLLAPSED: 64,
} as const

export const EVENT_COLORS = {
  on: 'bg-success/20 text-success',
  off: 'bg-muted text-muted-foreground',
  join: 'bg-info/20 text-info',
  call: 'bg-primary/20 text-primary',
  ackresp: 'bg-muted text-muted-foreground',
  end: 'bg-muted text-muted-foreground',
  leave: 'bg-warning/20 text-warning',
  data: 'bg-info/20 text-info',
  status_update: 'bg-muted text-muted-foreground',
} as const

export const RECORDER_STATE_NAMES: Record<number, string> = {
  0: 'Available',
  1: 'Recording',
  2: 'Idle',
}

export const RECORDER_STATE_COLORS: Record<number, string> = {
  0: 'text-muted-foreground',
  1: 'text-live',
  2: 'text-muted-foreground',
}
