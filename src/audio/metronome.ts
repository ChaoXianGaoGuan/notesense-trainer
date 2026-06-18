import type { RhythmBpm, RhythmGrid, RhythmMeter, RhythmMetronomeMode } from '../core/rhythm'
import { buildPracticeMetronomeEvents, getBeatsPerBar, getTickMs } from '../core/rhythm'

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
  async playCountInAndPractice(bpm: RhythmBpm, meter: RhythmMeter, mode: RhythmMetronomeMode): Promise<void> {
    const audioContext = getAudioContext()
    await audioContext.resume()
    const startTime = audioContext.currentTime + 0.06
    for (const event of buildPracticeMetronomeEvents(bpm, meter, mode)) {
      scheduleClick(audioContext, startTime + event.timeMs / 1000, event.strong)
    }
  },

  async playCountInAndRhythm(cells: RhythmGrid, bpm: RhythmBpm, meter: RhythmMeter): Promise<void> {
    const audioContext = getAudioContext()
    await audioContext.resume()
    const tickSeconds = getTickMs(bpm) / 1000
    const beatSeconds = tickSeconds * 12
    const startTime = audioContext.currentTime + 0.06

    for (let beat = 0; beat < getBeatsPerBar(meter); beat += 1) {
      scheduleClick(audioContext, startTime + beat * beatSeconds, beat === 0)
    }

    const rhythmStart = startTime + beatSeconds * getBeatsPerBar(meter)
    cells.forEach((cell, index) => {
      if (cell === 'attack') {
        scheduleTap(audioContext, rhythmStart + index * tickSeconds, 'standard')
      }
    })
  },

  async playCountInAndUserHits(hitTimesMs: number[], bpm: RhythmBpm, meter: RhythmMeter): Promise<void> {
    const audioContext = getAudioContext()
    await audioContext.resume()
    const tickSeconds = getTickMs(bpm) / 1000
    const beatSeconds = tickSeconds * 12
    const startTime = audioContext.currentTime + 0.06

    for (let beat = 0; beat < getBeatsPerBar(meter); beat += 1) {
      scheduleClick(audioContext, startTime + beat * beatSeconds, beat === 0)
    }

    const rhythmStart = startTime + beatSeconds * getBeatsPerBar(meter)
    hitTimesMs.forEach((timeMs) => {
      scheduleTap(audioContext, rhythmStart + timeMs / 1000, 'user')
    })
  },

  async playCountInAndComparison(cells: RhythmGrid, hitTimesMs: number[], bpm: RhythmBpm, meter: RhythmMeter): Promise<void> {
    const audioContext = getAudioContext()
    await audioContext.resume()
    const tickSeconds = getTickMs(bpm) / 1000
    const beatSeconds = tickSeconds * 12
    const startTime = audioContext.currentTime + 0.06

    for (let beat = 0; beat < getBeatsPerBar(meter); beat += 1) {
      scheduleClick(audioContext, startTime + beat * beatSeconds, beat === 0)
    }

    const rhythmStart = startTime + beatSeconds * getBeatsPerBar(meter)
    cells.forEach((cell, index) => {
      if (cell === 'attack') {
        scheduleTap(audioContext, rhythmStart + index * tickSeconds, 'standard')
      }
    })
    hitTimesMs.forEach((timeMs) => {
      scheduleTap(audioContext, rhythmStart + timeMs / 1000, 'user')
    })
  }
}
