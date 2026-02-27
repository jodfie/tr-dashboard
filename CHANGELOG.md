# Changelog

## 0.8.4 (2026-02-26)

### Bug Fixes

- **Audio retry backoff bypass:** Exponential backoff delays (500ms, 1s, 2s) were dead code — retries fired immediately. Fixed by deferring `retryCount` increment and `playbackState: 'loading'` to the timeout callback.
- **Render-phase store mutation:** `getCachedColor` called Zustand `set()` during React render on cache miss, causing extra render passes and warnings. Moved color cache to a module-level Map outside reactive state.
- **CallDetail race condition:** Navigating between calls while async fetches (transmissions, transcription) were in-flight could overwrite the new call's data with stale responses. Added cancellation guard.
- **TalkgroupDirectory infinite fetch loop:** `availableCategories.length` in the useEffect dependency array caused an extra fetch on every load, and an infinite loop when no categories existed. Replaced with a one-time ref flag.
- **TalkgroupDirectory debounce leak:** Debounce timeout was not cleared on unmount, firing `updateParam` on a dead route after navigation.
- **Calls talkgroup filter cross-system collision:** Filter used bare `tgid` instead of composite `system_id:tgid`, returning calls from all systems sharing that TGID. Now scopes to the correct system.
