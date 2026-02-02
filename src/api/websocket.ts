import type {
  WebSocketMessage,
  WebSocketEventType,
  SubscriptionMessage,
  SubscribedData,
  CallStartData,
  CallEndData,
  CallActiveData,
  AudioAvailableData,
  UnitEventData,
  RateUpdateData,
  RecorderUpdateData,
} from './types'

type EventHandler<T> = (data: T, timestamp: number) => void
type WildcardHandler = (event: WebSocketEventType, data: unknown, timestamp: number) => void

interface EventHandlers {
  subscribed: EventHandler<SubscribedData>[]
  call_start: EventHandler<CallStartData>[]
  call_end: EventHandler<CallEndData>[]
  call_active: EventHandler<CallActiveData>[]
  audio_available: EventHandler<AudioAvailableData>[]
  unit_event: EventHandler<UnitEventData>[]
  rate_update: EventHandler<RateUpdateData>[]
  recorder_update: EventHandler<RecorderUpdateData>[]
  '*': WildcardHandler[]
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

type StatusChangeHandler = (status: ConnectionStatus) => void

export class WebSocketManager {
  private ws: WebSocket | null = null
  private url: string
  private handlers: EventHandlers = {
    subscribed: [],
    call_start: [],
    call_end: [],
    call_active: [],
    audio_available: [],
    unit_event: [],
    rate_update: [],
    recorder_update: [],
    '*': [],
  }
  private statusHandlers: StatusChangeHandler[] = []
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private baseReconnectDelay = 1000
  private maxReconnectDelay = 30000
  private lastMessage = 0
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null
  private pendingSubscription: SubscriptionMessage | null = null
  private _status: ConnectionStatus = 'disconnected'

  constructor(url?: string) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    this.url = url ?? `${wsProtocol}//${window.location.host}/api/ws`
  }

  get status(): ConnectionStatus {
    return this._status
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status
    this.statusHandlers.forEach((h) => h(status))
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return
    }

    this.setStatus('connecting')

    try {
      this.ws = new WebSocket(this.url)

      this.ws.onopen = () => {
        console.log('WebSocket connected to tr-engine')
        this.reconnectAttempts = 0
        this.setStatus('connected')
        this.startHealthCheck()

        if (this.pendingSubscription) {
          this.send(this.pendingSubscription)
        }
      }

      this.ws.onmessage = (event) => {
        this.lastMessage = Date.now()
        // Handle newline-delimited JSON (multiple messages in one frame)
        const lines = event.data.split('\n').filter((line: string) => line.trim())
        for (const line of lines) {
          try {
            const msg: WebSocketMessage = JSON.parse(line)
            this.dispatch(msg.event, msg.data, msg.timestamp)
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err)
          }
        }
      }

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        this.setStatus('disconnected')
        this.stopHealthCheck()
        this.scheduleReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.setStatus('error')
      }
    } catch (err) {
      console.error('Failed to create WebSocket:', err)
      this.setStatus('error')
      this.scheduleReconnect()
    }
  }

  disconnect(): void {
    this.cancelReconnect()
    this.stopHealthCheck()
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }
    this.setStatus('disconnected')
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached')
      this.setStatus('error')
      return
    }

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    )

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`)

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectAttempts++
      this.connect()
    }, delay)
  }

  private cancelReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }
  }

  private startHealthCheck(): void {
    this.lastMessage = Date.now()
    this.healthCheckInterval = setInterval(() => {
      if (Date.now() - this.lastMessage > 120000) {
        console.log('No messages for 2 minutes, reconnecting...')
        this.ws?.close()
      }
    }, 30000)
  }

  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  private send(message: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  subscribe(
    channels: string[],
    filters?: { systems?: string[]; talkgroups?: number[]; units?: number[] }
  ): void {
    const message: SubscriptionMessage = {
      action: 'subscribe',
      channels,
      ...filters,
    }

    this.pendingSubscription = message

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send(message)
    }
  }

  unsubscribe(channels: string[]): void {
    const message: SubscriptionMessage = {
      action: 'unsubscribe',
      channels,
    }
    this.send(message)
  }

  on<E extends WebSocketEventType>(
    event: E,
    handler: E extends '*'
      ? WildcardHandler
      : E extends 'subscribed'
        ? EventHandler<SubscribedData>
        : E extends 'call_start'
          ? EventHandler<CallStartData>
          : E extends 'call_end'
            ? EventHandler<CallEndData>
            : E extends 'call_active'
              ? EventHandler<CallActiveData>
              : E extends 'audio_available'
                ? EventHandler<AudioAvailableData>
                : E extends 'unit_event'
                  ? EventHandler<UnitEventData>
                  : E extends 'rate_update'
                    ? EventHandler<RateUpdateData>
                    : E extends 'recorder_update'
                      ? EventHandler<RecorderUpdateData>
                      : never
  ): () => void {
    const handlers = this.handlers[event] as unknown[]
    handlers.push(handler)

    return () => {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  onStatusChange(handler: StatusChangeHandler): () => void {
    this.statusHandlers.push(handler)
    return () => {
      const index = this.statusHandlers.indexOf(handler)
      if (index > -1) {
        this.statusHandlers.splice(index, 1)
      }
    }
  }

  private dispatch(event: WebSocketEventType, data: unknown, timestamp: number): void {
    const handlers = this.handlers[event]
    if (handlers) {
      handlers.forEach((h) => (h as EventHandler<unknown>)(data, timestamp))
    }

    const wildcardHandlers = this.handlers['*']
    wildcardHandlers.forEach((h) => h(event, data, timestamp))
  }
}

// Singleton instance
let wsManager: WebSocketManager | null = null

export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager()
  }
  return wsManager
}
