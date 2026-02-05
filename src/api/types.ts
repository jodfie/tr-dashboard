/**
 * API Types
 *
 * This file re-exports generated types from the OpenAPI spec and defines
 * WebSocket event types that aren't part of the REST API.
 *
 * To regenerate: npm run api:generate
 */

import type { components } from './generated'

// =============================================================================
// Core Models
// =============================================================================

// Call unit info (unit that participated in a call)
export interface CallUnit {
  unit_rid: number
  alpha_tag: string
}

// A recorded radio call
export interface Call {
  // Identifiers
  call_id: string                    // Composite format: "sysid:tgid:timestamp"
  id?: number                        // Legacy database ID (may not be present)
  tr_call_id?: string               // Trunk-recorder call ID
  call_group_id?: number
  call_num?: number
  // Timing
  start_time: string
  stop_time?: string
  duration: number
  // Status
  call_state?: number
  mon_state?: number
  encrypted: boolean
  emergency: boolean
  // Technical details
  phase2_tdma?: boolean
  tdma_slot?: number
  conventional?: boolean
  analog?: boolean
  audio_type?: string
  freq: number
  freq_error?: number
  // Quality metrics
  error_count?: number
  spike_count?: number
  signal_db?: number
  noise_db?: number
  // Audio
  audio_path?: string
  audio_url?: string
  audio_size?: number
  // Talkgroup info (joined fields)
  tg_sysid?: string
  tgid?: number
  tg_alpha_tag?: string
  // Transcription
  has_transcription?: boolean
  transcription_text?: string
  transcription_word_count?: number
  // Units
  units?: CallUnit[]
  patched_tgids?: number[]
  metadata_json?: Record<string, unknown>
}

// A talkgroup on a radio system
export interface Talkgroup {
  sysid: string
  tgid: number
  alpha_tag?: string
  description?: string
  group?: string
  tag?: string
  priority: number
  mode?: string
  first_seen?: string
  last_seen?: string
  // Stats
  call_count?: number
  calls_1h?: number
  calls_24h?: number
  unit_count?: number
}

// A radio unit (mobile/portable radio)
export interface Unit {
  sysid: string
  unit_id: number
  alpha_tag?: string
  alpha_tag_source?: string
  first_seen?: string
  last_seen?: string
  last_event_type?: string
  last_event_tgid?: number
  last_event_tg_tag?: string
  last_event_time?: string
}

// A unit event (registration, affiliation, call activity)
export interface UnitEvent {
  id: number
  instance_id?: number
  system_id?: number
  unit_sysid?: string
  unit_rid: number
  event_type: string
  tg_sysid?: string
  tgid: number
  time: string
  metadata_json?: Record<string, unknown>
}

// Transcription word with timing
export interface TranscriptionWord {
  word: string
  start: number
  end: number
}

// Call transcription
export interface Transcription {
  id?: number
  call_id?: number
  text?: string
  words?: TranscriptionWord[]
  word_count?: number
  confidence?: number
  language?: string
  model?: string
  provider?: string
  duration_ms?: number
  call_duration?: number
  created_at?: string
}

// Use generated types for these (they're simple enough)
export type Site = components['schemas']['rest.Site']
export type RecorderInfo = components['schemas']['ingest.RecorderInfo']
export type TranscriptionQueueStats = components['schemas']['database.TranscriptionQueueStats']

// =============================================================================
// Response Types (from OpenAPI spec)
// =============================================================================

// Response types - use generated types but override array types for better DX
export interface CallListResponse {
  calls: Call[]
  count: number
  limit: number
  offset: number
}

export interface TalkgroupListResponse {
  talkgroups: Talkgroup[]
  count?: number
  limit: number
  offset: number
}

export interface UnitListResponse {
  units: Unit[]
  count: number
  limit: number
  offset: number
  window?: number
}

export interface UnitEventListResponse {
  events: UnitEvent[]
  count: number
  limit: number
  offset: number
}

export interface SiteListResponse {
  sites: Site[]
  count: number
}

export type RecorderListResponse = components['schemas']['rest.RecorderListResponse']
export type ActivityResponse = components['schemas']['rest.ActivityResponse']
export type RatesResponse = components['schemas']['rest.RatesResponse']
export type CallGroupListResponse = components['schemas']['rest.CallGroupListResponse']
export type CallGroupDetailResponse = components['schemas']['rest.CallGroupDetailResponse']

export interface ActiveUnitListResponse {
  units: Unit[]
  count: number
  limit: number
  offset: number
  window?: number
}

export type ErrorResponse = components['schemas']['rest.ErrorResponse']

// =============================================================================
// Legacy Aliases (for backwards compatibility)
// =============================================================================

/** @deprecated Use Site instead */
export type System = Site
/** @deprecated Use SiteListResponse instead */
export type SystemListResponse = SiteListResponse

// =============================================================================
// Frontend-specific Types (not in OpenAPI spec)
// =============================================================================

// P25 System grouping (frontend aggregation)
export interface P25System {
  sysid: string
  wacn: string
  sites: P25Site[]
}

export interface P25Site {
  short_name: string
  nac: string
  rfss: number
  site_id: number
  system_id: number
}

export interface P25SystemListResponse {
  p25_systems: P25System[]
  count: number
}

// Call frequency info
export interface CallFrequency {
  id: number
  call_id: number
  freq: number
  time: string
  position?: number | null
  duration?: number | null
  error_count?: number
  spike_count?: number
}

export interface FrequencyListResponse {
  frequencies: CallFrequency[]
  count: number
}

// Transmission info
export interface Transmission {
  id: number
  call_id: number
  unit_sysid?: string
  unit_rid: number
  start_time: string
  stop_time?: string
  duration?: number | null
  position?: number | null
  emergency: boolean
  error_count?: number
  spike_count?: number
}

export interface TransmissionListResponse {
  transmissions: Transmission[]
  count: number
}

// Recent calls extended format
export interface RecentCallInfo {
  id?: number | null
  call_id?: string
  call_group_id?: number
  tr_call_id?: string
  call_num: number
  start_time: string
  stop_time?: string
  duration: number
  system: string
  sysid?: string
  tgid: number
  tg_alpha_tag?: string
  freq: number
  encrypted: boolean
  emergency: boolean
  audio_path?: string
  audio_url?: string
  has_audio: boolean
  units: Array<{
    unit_id: number
    unit_tag: string
  }>
}

export interface RecentCallsResponse {
  calls: RecentCallInfo[]
  count: number
}

// Call groups
export interface CallGroup {
  id: number
  system_id: number
  tg_sysid?: string
  tgid: number
  start_time: string
  end_time?: string
  primary_call_id?: number
  call_count: number
  encrypted: boolean
  emergency: boolean
}

// Stats
export interface StatsResponse {
  total_systems: number
  total_talkgroups: number
  total_units: number
  total_calls: number
  active_calls: number
  calls_last_hour: number
  calls_last_24h: number
  audio_files: number
  audio_bytes: number
}

export interface EncryptionStatsResponse {
  stats: Record<string, { encrypted: number; clear: number }>
  hours: number
}

// Transcription search
export interface TranscriptionSearchResult {
  transcription: Transcription
  call: Call
}

export interface TranscriptionSearchResponse {
  results: TranscriptionSearchResult[]
  count: number
  limit: number
  offset: number
}

// Health check
export interface HealthResponse {
  status: string
  version: string
}

// =============================================================================
// WebSocket Types (not in REST API spec)
// =============================================================================

export type WebSocketEventType =
  | 'subscribed'
  | 'call_start'
  | 'call_end'
  | 'call_active'
  | 'audio_available'
  | 'unit_event'
  | 'rate_update'
  | 'recorder_update'

export interface WebSocketMessage<T = unknown> {
  event: WebSocketEventType
  timestamp: number
  data: T
}

export interface SubscriptionMessage {
  action: 'subscribe' | 'unsubscribe'
  channels: string[]
  systems?: string[]
  talkgroups?: number[]
  units?: number[]
}

export interface SubscribedData {
  action: string
  channels: string[]
  systems: string[]
  talkgroups: number[]
  units: number[]
}

export interface CallStartData {
  system: string
  sysid: string
  call_id: number
  tr_call_id?: string
  talkgroup: number
  talkgroup_alpha_tag?: string
  unit: number
  unit_alpha_tag?: string
  freq: number
  encrypted: boolean
  emergency: boolean
}

export interface CallEndData {
  system: string
  sysid: string
  call_id: number
  tr_call_id?: string
  talkgroup: number
  talkgroup_alpha_tag?: string
  unit: number
  unit_alpha_tag?: string
  duration: number
  encrypted: boolean
  emergency: boolean
  error_count?: number
  spike_count?: number
}

export interface CallActiveData {
  system: string
  sysid: string
  system_id: number
  talkgroup: number
  tg_alpha_tag?: string
  unit: number
  freq: number
  elapsed: number
  encrypted: boolean
  emergency: boolean
}

export interface AudioAvailableData {
  system: string
  sysid: string
  call_id: string
  tr_call_id?: string
  talkgroup: number
  talkgroup_alpha_tag?: string
  audio_size: number
  duration: number
  transmissions: number
  frequencies: number
}

export interface UnitEventData {
  system: string
  sysid: string
  unit: number
  unit_tag?: string
  event_type: string
  talkgroup: number
}

export interface RateUpdateData {
  system: string
  sysid: string
  system_id: number
  decode_rate: number
  max_rate: number
  control_channel: number
}

export interface RecorderUpdateData {
  system: string
  rec_num: number
  state: number
  state_name: string
  freq: number
  talkgroup: number
  tg_alpha_tag?: string
  unit: number
  unit_alpha_tag?: string
}

// Event type enum (for type narrowing)
export type EventType =
  | 'on'
  | 'off'
  | 'join'
  | 'call'
  | 'ackresp'
  | 'end'
  | 'leave'
  | 'data'
  | 'status_update'
