import { NATURAL_NOTES, getNaturalNoteFromPitch } from '../core/notes'
import { randomItem, randomKeyAvoiding } from '../core/random'
import type { AnswerResult, GenerationContext, NaturalNote, OctavePitch, StatsKey } from '../core/types'

export type SingleNoteDifficulty = 1 | 2 | 3
export type ListenPlaybackMode = 'scale-do-target' | 'do-target'

export type SingleNoteSettings = {
  difficulty: SingleNoteDifficulty
  playbackMode: ListenPlaybackMode
  reviewEnabled: boolean
}

export type SingleNoteQuestion = {
  id: string
  target: OctavePitch
  source: 'random' | 'review'
}

export type SingleNoteReviewItem = {
  target: OctavePitch
  mistakenNote: NaturalNote
}

export const SINGLE_NOTE_SCALE_DURATION_MS = 160
export const SINGLE_NOTE_SCALE_GAP_MS = 50
export const SINGLE_NOTE_REFERENCE_GAP_MS = 50

export const singleNoteAnswerOptions = NATURAL_NOTES

export const SINGLE_NOTE_SCALE_NOTES: OctavePitch[] = [
  'C4',
  'D4',
  'E4',
  'F4',
  'G4',
  'A4',
  'B4',
  'C5'
]

export const SINGLE_NOTE_RANGES: Record<SingleNoteDifficulty, OctavePitch[]> = {
  1: ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'],
  2: ['D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5', 'D5', 'E5', 'F5', 'G5', 'A5', 'B5', 'C6'],
  3: [
    'D4',
    'E4',
    'F4',
    'G4',
    'A4',
    'B4',
    'C5',
    'D5',
    'E5',
    'F5',
    'G5',
    'A5',
    'B5',
    'C6',
    'D6',
    'E6',
    'F6',
    'G6',
    'A6',
    'B6',
    'C7'
  ]
}

export function generateListenQuestion(
  settings: SingleNoteSettings,
  context: GenerationContext = {},
  reviewQueue: SingleNoteReviewItem[] = []
): SingleNoteQuestion {
  const range = SINGLE_NOTE_RANGES[settings.difficulty]
  const legalReviewItems = reviewQueue.filter((item) => range.includes(item.target))
  const shouldUseReview = settings.reviewEnabled && legalReviewItems.length > 0 && Math.random() < 0.65

  if (shouldUseReview) {
    const target = randomKeyAvoiding(
      legalReviewItems.map((item) => item.target),
      (item) => item,
      context.previousQuestionKey
    )
    return {
      id: crypto.randomUUID(),
      target,
      source: 'review'
    }
  }

  return {
    id: crypto.randomUUID(),
    target: randomKeyAvoiding(range, (item) => item, context.previousQuestionKey),
    source: 'random'
  }
}

export function buildSingleNotePlayback(question: SingleNoteQuestion, mode: ListenPlaybackMode): OctavePitch[] {
  if (mode === 'scale-do-target') {
    return [...SINGLE_NOTE_SCALE_NOTES, 'C4', question.target]
  }

  return ['C4', question.target]
}

export function buildSingleNoteTimedPlayback(
  question: SingleNoteQuestion,
  mode: ListenPlaybackMode,
  referenceDurationMs: number
): Array<{ note: OctavePitch; durationMs: number; gapAfterMs: number }> {
  if (mode === 'do-target') {
    return [
      { note: 'C4', durationMs: referenceDurationMs, gapAfterMs: SINGLE_NOTE_REFERENCE_GAP_MS },
      { note: question.target, durationMs: referenceDurationMs, gapAfterMs: 0 }
    ]
  }

  return [
    ...SINGLE_NOTE_SCALE_NOTES.map((note) => ({
      note,
      durationMs: SINGLE_NOTE_SCALE_DURATION_MS,
      gapAfterMs: SINGLE_NOTE_SCALE_GAP_MS
    })),
    { note: 'C4', durationMs: referenceDurationMs, gapAfterMs: SINGLE_NOTE_REFERENCE_GAP_MS },
    { note: question.target, durationMs: referenceDurationMs, gapAfterMs: 0 }
  ]
}

export function checkSingleNoteAnswer(question: SingleNoteQuestion, answer: NaturalNote): AnswerResult {
  const correctAnswer = getNaturalNoteFromPitch(question.target)
  return {
    correct: answer === correctAnswer,
    correctAnswer,
    userAnswer: answer,
    explanation: `目标音：${question.target}`
  }
}

export function createSingleNoteReviewItems(
  question: SingleNoteQuestion,
  wrongAnswer: NaturalNote,
  difficulty: SingleNoteDifficulty
): SingleNoteReviewItem[] {
  const correctNote = getNaturalNoteFromPitch(question.target)
  const sameNameTargets = SINGLE_NOTE_RANGES[difficulty].filter(
    (pitch) => getNaturalNoteFromPitch(pitch) === wrongAnswer
  )

  return [
    { target: question.target, mistakenNote: wrongAnswer },
    {
      target: randomItem(sameNameTargets.length > 0 ? sameNameTargets : [question.target]),
      mistakenNote: correctNote
    }
  ]
}

export function getSingleNoteStatsKey(difficulty: SingleNoteDifficulty): StatsKey {
  return `single-note:${difficulty}`
}
