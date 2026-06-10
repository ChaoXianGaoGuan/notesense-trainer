import type { Stats, StatsKey } from '../core/types'
import { EMPTY_STATS } from './defaults'

export type StatsState = Partial<Record<StatsKey, Stats>>

export function getStats(stats: StatsState, key: StatsKey): Stats {
  return stats[key] ?? EMPTY_STATS
}

export function recordAnswer(stats: StatsState, key: StatsKey, correct: boolean): StatsState {
  const current = getStats(stats, key)
  return {
    ...stats,
    [key]: {
      answered: current.answered + 1,
      correct: current.correct + (correct ? 1 : 0),
      streak: correct ? current.streak + 1 : 0
    }
  }
}

export function resetStats(stats: StatsState, key: StatsKey): StatsState {
  return {
    ...stats,
    [key]: EMPTY_STATS
  }
}

export function accuracy(stats: Stats): number {
  return stats.answered === 0 ? 0 : Math.round((stats.correct / stats.answered) * 100)
}
