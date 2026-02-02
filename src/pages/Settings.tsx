import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useRealtimeStore } from '@/stores/useRealtimeStore'
import { useFilterStore } from '@/stores/useFilterStore'
import { useAudioStore } from '@/stores/useAudioStore'
import { getWebSocketManager } from '@/api/websocket'

export default function Settings() {
  const connectionStatus = useRealtimeStore((s) => s.connectionStatus)
  const favoriteTalkgroups = useFilterStore((s) => s.favoriteTalkgroups)
  const setFavoriteTalkgroups = useFilterStore((s) => s.setFavoriteTalkgroups)
  const showEncrypted = useFilterStore((s) => s.showEncrypted)
  const setShowEncrypted = useFilterStore((s) => s.setShowEncrypted)
  const autoPlay = useAudioStore((s) => s.autoPlay)
  const setAutoPlay = useAudioStore((s) => s.setAutoPlay)
  const volume = useAudioStore((s) => s.volume)
  const setVolume = useAudioStore((s) => s.setVolume)

  const handleReconnect = () => {
    const ws = getWebSocketManager()
    ws.disconnect()
    ws.connect()
    ws.subscribe(['calls', 'units', 'rates', 'recorders'])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your dashboard preferences</p>
      </div>

      {/* Connection status */}
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
          <CardDescription>WebSocket connection to tr-engine backend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-3 w-3 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-success'
                    : connectionStatus === 'connecting'
                      ? 'bg-warning animate-pulse'
                      : 'bg-destructive'
                }`}
              />
              <span className="capitalize">{connectionStatus}</span>
            </div>
            <Button variant="outline" onClick={handleReconnect}>
              Reconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audio settings */}
      <Card>
        <CardHeader>
          <CardTitle>Audio</CardTitle>
          <CardDescription>Playback preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto-play next call</p>
              <p className="text-sm text-muted-foreground">
                Automatically play the next call in queue when current ends
              </p>
            </div>
            <Button
              variant={autoPlay ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAutoPlay(!autoPlay)}
            >
              {autoPlay ? 'On' : 'Off'}
            </Button>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Default volume</p>
              <p className="text-sm text-muted-foreground">
                Current: {Math.round(volume * 100)}%
              </p>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="w-32"
            />
          </div>
        </CardContent>
      </Card>

      {/* Display settings */}
      <Card>
        <CardHeader>
          <CardTitle>Display</CardTitle>
          <CardDescription>What to show in the interface</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Show encrypted calls</p>
              <p className="text-sm text-muted-foreground">
                Display calls that are encrypted (no audio available)
              </p>
            </div>
            <Button
              variant={showEncrypted ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowEncrypted(!showEncrypted)}
            >
              {showEncrypted ? 'Shown' : 'Hidden'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Favorites */}
      <Card>
        <CardHeader>
          <CardTitle>Favorite Talkgroups</CardTitle>
          <CardDescription>
            Quick access talkgroups shown in the sidebar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {favoriteTalkgroups.length === 0 ? (
            <p className="text-muted-foreground">
              No favorite talkgroups. Star talkgroups from the Talkgroups page to add them here.
            </p>
          ) : (
            <div className="space-y-2">
              {favoriteTalkgroups.map((tgid) => (
                <div
                  key={tgid}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="font-mono">TG {tgid}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFavoriteTalkgroups(favoriteTalkgroups.filter((t) => t !== tgid))
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Keyboard shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle>Keyboard Shortcuts</CardTitle>
          <CardDescription>Quick navigation and playback controls</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <ShortcutItem label="Command Palette" keys={['⌘', 'K']} />
            <ShortcutItem label="Toggle Sidebar" keys={['[']} />
            <ShortcutItem label="Play/Pause" keys={['Space']} />
            <ShortcutItem label="Skip Next" keys={['J']} />
            <ShortcutItem label="Skip Previous" keys={['K']} />
            <ShortcutItem label="Mute/Unmute" keys={['M']} />
            <ShortcutItem label="Volume Up" keys={['↑']} />
            <ShortcutItem label="Volume Down" keys={['↓']} />
            <ShortcutItem label="Go to Dashboard" keys={['G', 'D']} />
            <ShortcutItem label="Go to Calls" keys={['G', 'C']} />
            <ShortcutItem label="Go to Talkgroups" keys={['G', 'T']} />
            <ShortcutItem label="Go to Units" keys={['G', 'U']} />
            <ShortcutItem label="Go to Settings" keys={['G', 'S']} />
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            tr-dashboard is a modern frontend for the tr-engine radio scanning backend.
            It provides real-time monitoring and historical analysis of trunk-recorder radio systems.
          </p>
          <div className="mt-4 flex gap-2">
            <Badge variant="outline">React 18</Badge>
            <Badge variant="outline">TypeScript</Badge>
            <Badge variant="outline">Tailwind CSS</Badge>
            <Badge variant="outline">Zustand</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ShortcutItem({ label, keys }: { label: string; keys: string[] }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="rounded border bg-muted px-2 py-1 font-mono text-xs"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  )
}
