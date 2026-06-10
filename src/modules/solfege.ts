import {
  NATURAL_NOTES,
  SOLFEGE_OPTIONS,
  noteToSolfege,
  naturalNoteToOctavePitch
} from '../core/notes'
import { randomItemAvoiding } from '../core/random'
import type { AnswerResult, GenerationContext, NaturalNote, OctavePitch, Solfege, StatsKey } from '../core/types'

export type SolfegeQuestion = {
  id: string
  note: NaturalNote
  playbackNote: OctavePitch
}

export const solfegeOptions = SOLFEGE_OPTIONS

export function generateSolfegeQuestion(context: GenerationContext = {}): SolfegeQuestion {
  const previousNote = context.previousQuestionKey as NaturalNote | undefined
  const note = randomItemAvoiding(NATURAL_NOTES, previousNote)
  return {
    id: crypto.randomUUID(),
    note,
    playbackNote: naturalNoteToOctavePitch(note, 4)
  }
}

export function checkSolfegeAnswer(question: SolfegeQuestion, answer: Solfege): AnswerResult {
  const correctAnswer = noteToSolfege(question.note)
  return {
    correct: answer === correctAnswer,
    correctAnswer,
    userAnswer: answer
  }
}

export function getSolfegeStatsKey(): StatsKey {
  return 'solfege'
}
