import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SignalThresholds {
  // Signal: higher is better (dB, typically -40 to -120)
  signalGood: number
  signalPoor: number
  // Noise: lower is better (dB, typically -80 to -120)
  noiseGood: number
  noisePoor: number
  // Errors: lower is better (count)
  errorsGood: number
  errorsPoor: number
  // Spikes: lower is better (count)
  spikesGood: number
  spikesPoor: number
}

const DEFAULT_THRESHOLDS: SignalThresholds = {
  signalGood: -70,
  signalPoor: -100,
  noiseGood: -110,
  noisePoor: -80,
  errorsGood: 5,
  errorsPoor: 50,
  spikesGood: 3,
  spikesPoor: 20,
}

interface SignalThresholdsState extends SignalThresholds {
  setThreshold: (key: keyof SignalThresholds, value: number) => void
  resetToDefaults: () => void
}

export const useSignalThresholds = create<SignalThresholdsState>()(
  persist(
    (set) => ({
      ...DEFAULT_THRESHOLDS,
      setThreshold: (key, value) => set({ [key]: value }),
      resetToDefaults: () => set(DEFAULT_THRESHOLDS),
    }),
    { name: 'tr-dashboard-signal-thresholds' }
  )
)

/**
 * Returns a Tailwind text color class based on where value falls relative to thresholds.
 * @param value - the metric value
 * @param good - threshold for "good" (green)
 * @param poor - threshold for "poor" (red)
 * @param higherIsBetter - true for signal (higher = better), false for noise/errors/spikes
 */
export function getSignalColor(
  value: number | null | undefined,
  good: number,
  poor: number,
  higherIsBetter: boolean
): string {
  if (value == null || value >= 900) return '' // sentinel or missing
  if (higherIsBetter) {
    if (value >= good) return 'text-green-400'
    if (value <= poor) return 'text-red-400'
    return 'text-yellow-400'
  } else {
    if (value <= good) return 'text-green-400'
    if (value >= poor) return 'text-red-400'
    return 'text-yellow-400'
  }
}
