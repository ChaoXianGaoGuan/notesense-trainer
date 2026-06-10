import * as Tone from 'tone'
import type { AudioSettings, OctavePitch, Timbre } from '../core/types'

export interface AudioEngine {
  playNote(note: OctavePitch, options?: Partial<AudioSettings>): Promise<void>
  playSequence(notes: OctavePitch[], gapMs: number, options?: Partial<AudioSettings>): Promise<void>
  playTimedSequence(events: TimedNoteEvent[], options?: Partial<AudioSettings>): Promise<void>
  playChord(notes: OctavePitch[], options?: Partial<AudioSettings>): Promise<void>
  playArpeggioThenChord(notes: OctavePitch[], options?: Partial<AudioSettings>): Promise<void>
}

export type TimedNoteEvent = {
  note: OctavePitch
  durationMs: number
  gapAfterMs: number
}

type SampleConfig = {
  baseUrl: string
  urls: Record<string, string>
  filterFrequency: number
  reverbDecay: number
  reverbWet: number
  release: number
}

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  volume: 70,
  durationMs: 360,
  timbre: 'piano'
}

const APP_BASE_URL = import.meta.env.BASE_URL

function withBaseUrl(path: string): string {
  return `${APP_BASE_URL}${path.replace(/^\/+/, '')}`
}

export const SAMPLE_CONFIGS: Record<Timbre, SampleConfig> = {
  piano: {
    baseUrl: withBaseUrl('/samples/piano/'),
    urls: {
      C3: 'C3.mp3',
      E3: 'E3.mp3',
      G3: 'G3.mp3',
      C4: 'C4.mp3',
      E4: 'E4.mp3',
      G4: 'G4.mp3',
      C5: 'C5.mp3',
      E5: 'E5.mp3',
      G5: 'G5.mp3',
      C6: 'C6.mp3'
    },
    filterFrequency: 7200,
    reverbDecay: 1.15,
    reverbWet: 0.08,
    release: 0.45
  },
  guitar: {
    baseUrl: withBaseUrl('/samples/guitar/'),
    urls: {
      E2: 'E2.mp3',
      A2: 'A2.mp3',
      D3: 'D3.mp3',
      G3: 'G3.mp3',
      B3: 'B3.mp3',
      E4: 'E4.mp3',
      A4: 'A4.mp3',
      D5: 'D5.mp3'
    },
    filterFrequency: 5200,
    reverbDecay: 0.95,
    reverbWet: 0.06,
    release: 0.28
  }
}

let samplers: Partial<Record<Timbre, Tone.Sampler>> = {}
let loadPromises: Partial<Record<Timbre, Promise<Tone.Sampler>>> = {}

export const audioEngine: AudioEngine = {
  async playNote(note, options) {
    const settings = resolveSettings(options)
    const sampler = await ensureAudio(settings.timbre, settings.volume)
    sampler.triggerAttackRelease(note, settings.durationMs / 1000)
    await wait(settings.durationMs)
  },

  async playSequence(notes, gapMs, options) {
    const settings = resolveSettings(options)
    const sampler = await ensureAudio(settings.timbre, settings.volume)
    const now = Tone.now()
    const durationSeconds = settings.durationMs / 1000
    const stepSeconds = (settings.durationMs + gapMs) / 1000

    notes.forEach((note, index) => {
      sampler.triggerAttackRelease(note, durationSeconds, now + index * stepSeconds)
    })
    await wait(notes.length * (settings.durationMs + gapMs))
  },

  async playTimedSequence(events, options) {
    const settings = resolveSettings(options)
    const sampler = await ensureAudio(settings.timbre, settings.volume)
    const now = Tone.now()
    let offsetMs = 0

    events.forEach((event) => {
      sampler.triggerAttackRelease(event.note, event.durationMs / 1000, now + offsetMs / 1000)
      offsetMs += event.durationMs + event.gapAfterMs
    })

    await wait(offsetMs)
  },

  async playChord(notes, options) {
    const settings = resolveSettings(options)
    const sampler = await ensureAudio(settings.timbre, settings.volume)
    sampler.triggerAttackRelease(notes, settings.durationMs / 1000)
    await wait(settings.durationMs)
  },

  async playArpeggioThenChord(notes, options) {
    const settings = resolveSettings(options)
    const sampler = await ensureAudio(settings.timbre, settings.volume)
    const now = Tone.now()
    const durationSeconds = settings.durationMs / 1000
    const stepSeconds = Math.max(0.12, durationSeconds * 0.55)
    const chordAt = now + notes.length * stepSeconds + 0.18

    notes.forEach((note, index) => {
      sampler.triggerAttackRelease(note, durationSeconds, now + index * stepSeconds)
    })
    sampler.triggerAttackRelease(notes, durationSeconds, chordAt)

    await wait((notes.length * stepSeconds + 0.18 + durationSeconds) * 1000)
  }
}

export function resetAudioEngineForTests(): void {
  Object.values(samplers).forEach((sampler) => sampler.dispose())
  samplers = {}
  loadPromises = {}
}

function resolveSettings(options?: Partial<AudioSettings>): AudioSettings {
  return {
    ...DEFAULT_AUDIO_SETTINGS,
    ...options,
    timbre: normalizeTimbre(options?.timbre),
    volume: clamp(options?.volume ?? DEFAULT_AUDIO_SETTINGS.volume, 0, 100),
    durationMs: clamp(options?.durationMs ?? DEFAULT_AUDIO_SETTINGS.durationMs, 80, 800)
  }
}

async function ensureAudio(timbre: Timbre, volume: number): Promise<Tone.Sampler> {
  await Tone.start()
  const sampler = await loadSampler(timbre)
  sampler.volume.value = volume <= 0 ? -80 : Tone.gainToDb(volume / 100)
  return sampler
}

function loadSampler(timbre: Timbre): Promise<Tone.Sampler> {
  if (samplers[timbre]?.loaded) {
    return Promise.resolve(samplers[timbre])
  }

  if (loadPromises[timbre]) {
    return loadPromises[timbre]
  }

  const config = SAMPLE_CONFIGS[timbre]
  loadPromises[timbre] = new Promise<Tone.Sampler>((resolve) => {
    const filter = new Tone.Filter(config.filterFrequency, 'lowpass')
    const reverb = new Tone.Reverb({ decay: config.reverbDecay, wet: config.reverbWet })
    const sampler = new Tone.Sampler({
      urls: config.urls,
      baseUrl: config.baseUrl,
      release: config.release,
      onload: () => {
        samplers[timbre] = sampler
        resolve(sampler)
      }
    }).chain(filter, reverb, Tone.Destination)
  })

  return loadPromises[timbre]
}

function normalizeTimbre(timbre: unknown): Timbre {
  return timbre === 'guitar' || timbre === 'piano' ? timbre : DEFAULT_AUDIO_SETTINGS.timbre
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}
