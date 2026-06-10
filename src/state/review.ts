import type { StatsKey } from '../core/types'
import type { SingleNoteReviewItem } from '../modules/single-note'

export type ReviewQueues = Partial<Record<StatsKey, SingleNoteReviewItem[]>>

export function getReviewQueue(queues: ReviewQueues, key: StatsKey): SingleNoteReviewItem[] {
  return queues[key] ?? []
}

export function addReviewItems(
  queues: ReviewQueues,
  key: StatsKey,
  items: SingleNoteReviewItem[],
  maxLength = 24
): ReviewQueues {
  const current = getReviewQueue(queues, key)
  const merged = [...items, ...current]
  const deduped = merged.filter(
    (item, index, list) =>
      list.findIndex(
        (candidate) => candidate.target === item.target && candidate.mistakenNote === item.mistakenNote
      ) === index
  )

  return {
    ...queues,
    [key]: deduped.slice(0, maxLength)
  }
}
