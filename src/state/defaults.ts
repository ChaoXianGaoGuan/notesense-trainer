import type { AudioSettings, Stats } from '../core/types'
import type { ChordStage } from '../modules/chord-quality'
import type { IntervalMode, IntervalTimeLimit } from '../modules/interval-speed'
import type { MelodyLength, MelodyPlaybackMode } from '../modules/melody'
import type { ListenPlaybackMode, SingleNoteDifficulty } from '../modules/single-note'
import type { SyncopationBpm, SyncopationDifficulty, SyncopationNotation } from '../modules/syncopation'

export type ModuleId =
  | 'solfege'
  | 'single-note'
  | 'melody'
  | 'chord-quality'
  | 'interval-speed'
  | 'syncopation'
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
  syncopation: {
    difficulty: SyncopationDifficulty
    bpm: SyncopationBpm
    notation: SyncopationNotation
    inputCalibrationMs: number
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
  },
  syncopation: {
    difficulty: 1,
    bpm: 60,
    notation: 'jianpu',
    inputCalibrationMs: -140
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
    },
    syncopation: {
      ...DEFAULT_PREFERENCES.syncopation,
      ...preferences.syncopation,
      difficulty: isSupportedSyncopationDifficulty(preferences.syncopation?.difficulty)
        ? preferences.syncopation.difficulty
        : DEFAULT_PREFERENCES.syncopation.difficulty,
      bpm: isSupportedSyncopationBpm(preferences.syncopation?.bpm)
        ? preferences.syncopation.bpm
        : DEFAULT_PREFERENCES.syncopation.bpm,
      notation: isSupportedSyncopationNotation(preferences.syncopation?.notation)
        ? preferences.syncopation.notation
        : DEFAULT_PREFERENCES.syncopation.notation,
      inputCalibrationMs: isSupportedSyncopationCalibration(preferences.syncopation?.inputCalibrationMs)
        ? preferences.syncopation.inputCalibrationMs
        : DEFAULT_PREFERENCES.syncopation.inputCalibrationMs
    }
  }
}

function isSupportedIntervalMode(value: unknown): value is IntervalMode {
  return value === 'missing-top' || value === 'missing-root' || value === 'missing-interval' || value === 'mixed'
}

function isSupportedSyncopationDifficulty(value: unknown): value is SyncopationDifficulty {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5
}

function isSupportedSyncopationBpm(value: unknown): value is SyncopationBpm {
  return value === 60 || value === 80 || value === 100
}

function isSupportedSyncopationNotation(value: unknown): value is SyncopationNotation {
  return value === 'jianpu' || value === 'staff'
}

function isSupportedSyncopationCalibration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -200 && value <= 200
}
