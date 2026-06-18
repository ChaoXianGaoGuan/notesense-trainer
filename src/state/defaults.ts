import type { AudioSettings, Stats } from '../core/types'
import type { ChordStage } from '../modules/chord-quality'
import type { IntervalMode, IntervalTimeLimit } from '../modules/interval-speed'
import type { MelodyLength, MelodyPlaybackMode } from '../modules/melody'
import type { RelativePitchSingDifficulty, RelativePitchSingDirection, RelativePitchSingOrder } from '../modules/relative-pitch-sing'
import type { ListenPlaybackMode, SingleNoteDifficulty } from '../modules/single-note'
import type { SyncopationBpm, SyncopationDifficulty, SyncopationMeter, SyncopationMetronomeMode, SyncopationNotation } from '../modules/syncopation'

export type ModuleId =
  | 'solfege'
  | 'single-note'
  | 'melody'
  | 'chord-quality'
  | 'interval-speed'
  | 'syncopation'
  | 'relative-pitch-sing'
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
    meter: SyncopationMeter
    notation: SyncopationNotation
    metronomeMode: SyncopationMetronomeMode
    inputCalibrationMs: number
  }
  relativePitchSing: {
    difficulty: RelativePitchSingDifficulty
    direction: RelativePitchSingDirection
    order: RelativePitchSingOrder
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
    meter: '4/4',
    notation: 'jianpu',
    metronomeMode: 'full',
    inputCalibrationMs: -140
  },
  relativePitchSing: {
    difficulty: 2,
    direction: 'up',
    order: 'sequential'
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
      meter: isSupportedSyncopationMeter(preferences.syncopation?.meter)
        ? preferences.syncopation.meter
        : DEFAULT_PREFERENCES.syncopation.meter,
      notation: isSupportedSyncopationNotation(preferences.syncopation?.notation)
        ? preferences.syncopation.notation
        : DEFAULT_PREFERENCES.syncopation.notation,
      metronomeMode: isSupportedSyncopationMetronomeMode(preferences.syncopation?.metronomeMode)
        ? preferences.syncopation.metronomeMode
        : DEFAULT_PREFERENCES.syncopation.metronomeMode,
      inputCalibrationMs: isSupportedSyncopationCalibration(preferences.syncopation?.inputCalibrationMs)
        ? preferences.syncopation.inputCalibrationMs
        : DEFAULT_PREFERENCES.syncopation.inputCalibrationMs
    },
    relativePitchSing: {
      ...DEFAULT_PREFERENCES.relativePitchSing,
      ...preferences.relativePitchSing,
      difficulty: isSupportedRelativePitchSingDifficulty(preferences.relativePitchSing?.difficulty)
        ? preferences.relativePitchSing.difficulty
        : DEFAULT_PREFERENCES.relativePitchSing.difficulty,
      direction: isSupportedRelativePitchSingDirection(preferences.relativePitchSing?.direction)
        ? preferences.relativePitchSing.direction
        : DEFAULT_PREFERENCES.relativePitchSing.direction,
      order: isSupportedRelativePitchSingOrder(preferences.relativePitchSing?.order)
        ? preferences.relativePitchSing.order
        : DEFAULT_PREFERENCES.relativePitchSing.order
    }
  }
}

function isSupportedIntervalMode(value: unknown): value is IntervalMode {
  return value === 'missing-top' || value === 'missing-root' || value === 'missing-interval' || value === 'mixed'
}

function isSupportedSyncopationDifficulty(value: unknown): value is SyncopationDifficulty {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5 || value === 6 || value === 7 || value === 8 || value === 9
}

function isSupportedSyncopationBpm(value: unknown): value is SyncopationBpm {
  return value === 60 || value === 80 || value === 100
}

function isSupportedSyncopationMeter(value: unknown): value is SyncopationMeter {
  return value === '2/4' || value === '3/4' || value === '4/4'
}

function isSupportedSyncopationNotation(value: unknown): value is SyncopationNotation {
  return value === 'jianpu' || value === 'staff'
}

function isSupportedSyncopationMetronomeMode(value: unknown): value is SyncopationMetronomeMode {
  return value === 'full' || value === 'count-in'
}

function isSupportedSyncopationCalibration(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= -200 && value <= 200
}

function isSupportedRelativePitchSingDifficulty(value: unknown): value is RelativePitchSingDifficulty {
  return value === 2 || value === 3 || value === 4 || value === 5 || value === 6 || value === 7
}

function isSupportedRelativePitchSingDirection(value: unknown): value is RelativePitchSingDirection {
  return value === 'up' || value === 'down' || value === 'mixed'
}

function isSupportedRelativePitchSingOrder(value: unknown): value is RelativePitchSingOrder {
  return value === 'sequential' || value === 'random'
}
