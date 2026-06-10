import { NATURAL_NOTES, naturalNoteToOctavePitch } from '../core/notes'
import { randomItem, randomKeyAvoiding } from '../core/random'
import type { AnswerResult, GenerationContext, NaturalNote, OctavePitch, StatsKey } from '../core/types'
import {
  SINGLE_NOTE_REFERENCE_GAP_MS,
  SINGLE_NOTE_SCALE_DURATION_MS,
  SINGLE_NOTE_SCALE_GAP_MS,
  SINGLE_NOTE_SCALE_NOTES
} from './single-note'

export type MelodyLength = 2 | 3 | 4 | 5
export type MelodyPlaybackMode = 'scale-do-melody' | 'do-melody'

export type MelodySettings = {
  length: MelodyLength
  playbackMode: MelodyPlaybackMode
}

export type MelodyQuestion = {
  id: string
  notes: NaturalNote[]
  playbackNotes: OctavePitch[]
}

export const melodyAnswerOptions = NATURAL_NOTES
export const MELODY_LENGTHS: MelodyLength[] = [2, 3, 4, 5]

export function generateMelodyQuestion(
  length: MelodyLength,
  context: GenerationContext = {}
): MelodyQuestion {
  const candidates = Array.from({ length: 64 }, () =>
    Array.from({ length }, () => randomItem(NATURAL_NOTES))
  )
  const notes = randomKeyAvoiding(candidates, (candidate) => candidate.join(''), context.previousQuestionKey)

  return {
    id: crypto.randomUUID(),
    notes,
    playbackNotes: notes.map((note) => naturalNoteToOctavePitch(note, 4))
  }
}

export function buildMelodyPlayback(question: MelodyQuestion, mode: MelodyPlaybackMode): OctavePitch[] {
  if (mode === 'scale-do-melody') {
    return [...SINGLE_NOTE_SCALE_NOTES, 'C4', ...question.playbackNotes]
  }

  return ['C4', ...question.playbackNotes]
}

export function buildMelodyTimedPlayback(
  question: MelodyQuestion,
  mode: MelodyPlaybackMode,
  melodyDurationMs: number
): Array<{ note: OctavePitch; durationMs: number; gapAfterMs: number }> {
  const melodyEvents = [
    { note: 'C4' as OctavePitch, durationMs: melodyDurationMs, gapAfterMs: SINGLE_NOTE_REFERENCE_GAP_MS },
    ...question.playbackNotes.map((note, index) => ({
      note,
      durationMs: melodyDurationMs,
      gapAfterMs: index === question.playbackNotes.length - 1 ? 0 : SINGLE_NOTE_REFERENCE_GAP_MS
    }))
  ]

  if (mode === 'do-melody') {
    return melodyEvents
  }

  return [
    ...SINGLE_NOTE_SCALE_NOTES.map((note) => ({
      note,
      durationMs: SINGLE_NOTE_SCALE_DURATION_MS,
      gapAfterMs: SINGLE_NOTE_SCALE_GAP_MS
    })),
    ...melodyEvents
  ]
}

export function checkMelodyAnswer(question: MelodyQuestion, answer: NaturalNote[]): AnswerResult {
  const correct = question.notes.length === answer.length && question.notes.every((note, index) => note === answer[index])
  return {
    correct,
    correctAnswer: question.notes,
    userAnswer: answer
  }
}

export function getMelodyStatsKey(length: MelodyLength): StatsKey {
  return `melody:${length}`
}
