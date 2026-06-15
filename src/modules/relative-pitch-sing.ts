import type { AnswerResult, GenerationContext, StatsKey } from '../core/types'
import {
  RELATIVE_PITCH_DIFFICULTIES,
  RELATIVE_PITCH_DIRECTIONS,
  RELATIVE_PITCH_ORDERS,
  buildRelativePitchPatterns,
  evaluateRelativePitchAnswer,
  relativePitchPatternLabel,
  relativePitchPatternToNotes,
  type RelativePitchDifficulty,
  type RelativePitchDirection,
  type RelativePitchOrder,
  type RelativePitchPattern,
  type SungPitchEvent
} from '../core/relative-pitch'
import type { OctavePitch } from '../core/types'
import { randomItem } from '../core/random'

export type RelativePitchSingDifficulty = RelativePitchDifficulty
export type RelativePitchSingDirection = RelativePitchDirection
export type RelativePitchSingOrder = RelativePitchOrder

export type RelativePitchSingSettings = {
  difficulty: RelativePitchSingDifficulty
  direction: RelativePitchSingDirection
  order: RelativePitchSingOrder
}

export type RelativePitchSingQuestion = {
  id: string
  pattern: RelativePitchPattern
  label: string
  notes: OctavePitch[]
}

export type RelativePitchSingResult = AnswerResult & {
  detectedDegrees: number[]
}

export const RELATIVE_PITCH_SING_DIFFICULTIES = RELATIVE_PITCH_DIFFICULTIES
export const RELATIVE_PITCH_SING_DIRECTIONS = RELATIVE_PITCH_DIRECTIONS
export const RELATIVE_PITCH_SING_ORDERS = RELATIVE_PITCH_ORDERS

export const RELATIVE_PITCH_SING_DIFFICULTY_LABELS: Record<RelativePitchSingDifficulty, string> = {
  2: '两个音',
  3: '三个音',
  4: '四个音',
  5: '五个音',
  6: '六个音',
  7: '七个音'
}

export const RELATIVE_PITCH_SING_DIRECTION_LABELS: Record<RelativePitchSingDirection, string> = {
  up: '往上',
  down: '往下',
  mixed: '混合'
}

export const RELATIVE_PITCH_SING_ORDER_LABELS: Record<RelativePitchSingOrder, string> = {
  sequential: '按表顺序',
  random: '随机'
}

export function generateRelativePitchSingQuestion(
  settings: RelativePitchSingSettings,
  context: GenerationContext = {}
): RelativePitchSingQuestion {
  const patterns = buildRelativePitchPatterns(settings.difficulty, settings.direction)
  const pattern =
    settings.order === 'sequential'
      ? getNextSequentialPattern(patterns, context.previousQuestionKey)
      : randomItem(patterns)

  return {
    id: `${pattern.id}-${Math.random().toString(36).slice(2)}`,
    pattern,
    label: relativePitchPatternLabel(pattern),
    notes: relativePitchPatternToNotes(pattern)
  }
}

export function checkRelativePitchSingAnswer(
  question: RelativePitchSingQuestion,
  sungEvents: SungPitchEvent[]
): RelativePitchSingResult {
  const evaluation = evaluateRelativePitchAnswer(question.pattern, sungEvents)
  return {
    correct: evaluation.correct,
    correctAnswer: evaluation.expectedDegrees.join(''),
    userAnswer: evaluation.detectedDegrees.length > 0 ? evaluation.detectedDegrees.join('') : '未识别',
    explanation: evaluation.explanation,
    detectedDegrees: evaluation.detectedDegrees
  }
}

export function getRelativePitchSingStatsKey(
  difficulty: RelativePitchSingDifficulty,
  direction: RelativePitchSingDirection
): StatsKey {
  return `relative-pitch-sing:${difficulty}:${direction}`
}

function getNextSequentialPattern(
  patterns: RelativePitchPattern[],
  previousQuestionKey?: string
): RelativePitchPattern {
  if (!previousQuestionKey) return patterns[0]
  const currentIndex = patterns.findIndex((pattern) => pattern.id === previousQuestionKey)
  return patterns[(currentIndex + 1) % patterns.length]
}
