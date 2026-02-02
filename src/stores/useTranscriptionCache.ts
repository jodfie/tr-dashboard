import { create } from 'zustand'
import { getCallTranscription, getCallTransmissions } from '@/api/client'
import type { TranscriptionWord, Transmission } from '@/api/types'

type TranscriptionStatus = 'idle' | 'loading' | 'loaded' | 'none'

interface TranscriptionEntry {
  status: TranscriptionStatus
  text?: string
  words?: TranscriptionWord[]
  transmissions?: Transmission[]
}

interface TranscriptionCacheState {
  cache: Map<number | string, TranscriptionEntry>

  getEntry: (callId: number | string) => TranscriptionEntry | undefined
  fetchTranscription: (callId: number | string) => Promise<void>
}

export const useTranscriptionCache = create<TranscriptionCacheState>((set, get) => ({
  cache: new Map(),

  getEntry: (callId) => get().cache.get(callId),

  fetchTranscription: async (callId) => {
    const existing = get().cache.get(callId)
    if (existing && existing.status !== 'idle') {
      return
    }

    // Mark as loading
    set((state) => {
      const newCache = new Map(state.cache)
      newCache.set(callId, { status: 'loading' })
      return { cache: newCache }
    })

    try {
      // Fetch both transcription and transmissions in parallel
      const [transcription, transmissionsRes] = await Promise.all([
        getCallTranscription(callId),
        getCallTransmissions(callId).catch(() => ({ transmissions: [] })),
      ])
      set((state) => {
        const newCache = new Map(state.cache)
        newCache.set(callId, {
          status: 'loaded',
          text: transcription.text,
          words: transcription.words,
          transmissions: transmissionsRes.transmissions || [],
        })
        return { cache: newCache }
      })
    } catch {
      // No transcription available (404) or other error
      set((state) => {
        const newCache = new Map(state.cache)
        newCache.set(callId, { status: 'none' })
        return { cache: newCache }
      })
    }
  },
}))
