import type { AudioSettings, Stats } from '../core/types'
import type { ChordStage } from '../modules/chord-quality'
import type { IntervalMode, IntervalTimeLimit } from '../modules/interval-speed'
import type { MelodyLength, MelodyPlaybackMode } from '../modules/melody'
import type { ListenPlaybackMode, SingleNoteDifficulty } from '../modules/single-note'

export type ModuleId =
  | 'solfege'
  | 'single-note'
  | 'melody'
  | 'chord-quality'
  | 'interval-speed'
  | 'degree-chord'
  | 'triad-key-match'

export type AppPreferences = {
  activeModule: ModuleId
  audio: AudioSettings
  singleNote: {
    difficulty: SingleNoteDifficulty
    playbackMode: ListenPlaybackMode
    reviewEnabled: boolean
  }
  melody: {
    length: MelodyLength
    playbackMode: MelodyPlaybackMode
  }
  chord: {
    stage: ChordStage
  }
  interval: {
    timeLimit: IntervalTimeLimit
    mode: IntervalMode
  }
}

export const EMPTY_STATS: Stats = {
  answered: 0,
  correct: 0,
  streak: 0
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  activeModule: 'solfege',
  audio: {
    volume: 70,
    durationMs: 360,
    timbre: 'piano'
  },
  singleNote: {
    difficulty: 1,
    playbackMode: 'scale-do-target',
    reviewEnabled: false
  },
  melody: {
    length: 3,
    playbackMode: 'scale-do-melody'
  },
  chord: {
    stage: 1
  },
  interval: {
    timeLimit: 10,
    mode: 'missing-top'
  }
}

export function isSupportedTimbre(value: unknown): value is AudioSettings['timbre'] {
  return value === 'piano' || value === 'guitar'
}

export function normalizePreferences(preferences: AppPreferences): AppPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...preferences,
    audio: {
      ...DEFAULT_PREFERENCES.audio,
      ...preferences.audio,
      timbre: isSupportedTimbre(preferences.audio?.timbre) ? preferences.audio.timbre : 'piano'
    },
    singleNote: {
      ...DEFAULT_PREFERENCES.singleNote,
      ...preferences.singleNote
    },
    melody: {
      ...DEFAULT_PREFERENCES.melody,
      ...preferences.melody
    },
    chord: {
      ...DEFAULT_PREFERENCES.chord,
      ...preferences.chord
    },
    interval: {
      ...DEFAULT_PREFERENCES.interval,
      ...preferences.interval,
      mode: isSupportedIntervalMode(preferences.interval?.mode)
        ? preferences.interval.mode
        : DEFAULT_PREFERENCES.interval.mode
    }
  }
}

function isSupportedIntervalMode(value: unknown): value is IntervalMode {
  return value === 'missing-top' || value === 'missing-root' || value === 'missing-interval' || value === 'mixed'
}
