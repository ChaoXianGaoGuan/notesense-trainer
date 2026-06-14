import type { RhythmBpm, RhythmGrid } from '../core/rhythm'
import { getSixteenthMs } from '../core/rhythm'

let context: AudioContext | null = null

function getAudioContext(): AudioContext {
  context ??= new AudioContext()
  return context
}

function scheduleClick(audioContext: AudioContext, startTime: number, strong: boolean): void {
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  oscillator.type = 'square'
  oscillator.frequency.value = strong ? 1500 : 950
  gain.gain.setValueAtTime(strong ? 0.16 : 0.1, startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.045)
  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + 0.05)
}

function scheduleTap(audioContext: AudioContext, startTime: number, variant: 'standard' | 'user' = 'standard'): void {
  const oscillator = audioContext.createOscillator()
  const gain = audioContext.createGain()
  oscillator.type = variant === 'user' ? 'sine' : 'triangle'
  oscillator.frequency.value = variant === 'user' ? 780 : 520
  gain.gain.setValueAtTime(variant === 'user' ? 0.2 : 0.22, startTime)
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08)
  oscillator.connect(gain)
  gain.connect(audioContext.destination)
  oscillator.start(startTime)
  oscillator.stop(startTime + 0.09)
}

export const metronome = {
  async playCountInAndBar(bpm: RhythmBpm): Promise<void> {
    const audioContext = getAudioContext()
    await audioContext.resume()
    const beatSeconds = getSixteenthMs(bpm) * 4 / 1000
    const startTime = audioContext.currentTime + 0.06
    for (let beat = 0; beat < 8; beat += 1) {
      scheduleClick(audioContext, startTime + beat * beatSeconds, beat % 4 === 0)
    }
  },

  async playCountInAndRhythm(cells: RhythmGrid, bpm: RhythmBpm): Promise<void> {
    const audioContext = getAudioContext()
    await audioContext.resume()
    const sixteenthSeconds = getSixteenthMs(bpm) / 1000
    const beatSeconds = sixteenthSeconds * 4
    const startTime = audioContext.currentTime + 0.06

    for (let beat = 0; beat < 8; beat += 1) {
      scheduleClick(audioContext, startTime + beat * beatSeconds, beat % 4 === 0)
    }

    const rhythmStart = startTime + beatSeconds * 4
    cells.forEach((cell, index) => {
      if (cell === 'attack') {
        scheduleTap(audioContext, rhythmStart + index * sixteenthSeconds, 'standard')
      }
    })
  },

  async playCountInAndUserHits(hitTimesMs: number[], bpm: RhythmBpm): Promise<void> {
    const audioContext = getAudioContext()
    await audioContext.resume()
    const sixteenthSeconds = getSixteenthMs(bpm) / 1000
    const beatSeconds = sixteenthSeconds * 4
    const startTime = audioContext.currentTime + 0.06

    for (let beat = 0; beat < 8; beat += 1) {
      scheduleClick(audioContext, startTime + beat * beatSeconds, beat % 4 === 0)
    }

    const rhythmStart = startTime + beatSeconds * 4
    hitTimesMs.forEach((timeMs) => {
      scheduleTap(audioContext, rhythmStart + timeMs / 1000, 'user')
    })
  },

  async playCountInAndComparison(cells: RhythmGrid, hitTimesMs: number[], bpm: RhythmBpm): Promise<void> {
    const audioContext = getAudioContext()
    await audioContext.resume()
    const sixteenthSeconds = getSixteenthMs(bpm) / 1000
    const beatSeconds = sixteenthSeconds * 4
    const startTime = audioContext.currentTime + 0.06

    for (let beat = 0; beat < 8; beat += 1) {
      scheduleClick(audioContext, startTime + beat * beatSeconds, beat % 4 === 0)
    }

    const rhythmStart = startTime + beatSeconds * 4
    cells.forEach((cell, index) => {
      if (cell === 'attack') {
        scheduleTap(audioContext, rhythmStart + index * sixteenthSeconds, 'standard')
      }
    })
    hitTimesMs.forEach((timeMs) => {
      scheduleTap(audioContext, rhythmStart + timeMs / 1000, 'user')
    })
  }
}
