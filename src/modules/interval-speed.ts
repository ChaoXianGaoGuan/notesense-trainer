import {
  INTERVAL_LABELS,
  INTERVAL_OPTIONS,
  findRootsForTopAndInterval,
  intervalBetweenNotes,
  isSupportedSpelling,
  isValidIntervalPair,
  transposeNoteByInterval,
  type IntervalName
} from '../core/intervals'
import { SPELLING_OPTIONS } from '../core/notes'
import { randomItem } from '../core/random'
import type { AnswerResult, GenerationContext, SpelledPitch, StatsKey } from '../core/types'

export type IntervalTimeLimit = 5 | 10
export type IntervalMissingPart = 'root' | 'top' | 'interval'
export type IntervalMode = 'missing-top' | 'missing-root' | 'missing-interval' | 'mixed'

export type IntervalSettings = {
  timeLimit: IntervalTimeLimit
  mode: IntervalMode
}

export type IntervalQuestion = {
  id: string
  root: SpelledPitch
  top: SpelledPitch
  interval: IntervalName
  missing: IntervalMissingPart
  answerOptions: string[]
}

export const INTERVAL_TIME_LIMITS: IntervalTimeLimit[] = [5, 10]
export const INTERVAL_MODES: IntervalMode[] = ['missing-top', 'missing-root', 'missing-interval', 'mixed']
export const INTERVAL_SPEED_OPTIONS: IntervalName[] = INTERVAL_OPTIONS.filter(
  (interval) => !interval.endsWith('8')
)

const MISSING_BY_MODE: Record<Exclude<IntervalMode, 'mixed'>, IntervalMissingPart> = {
  'missing-top': 'top',
  'missing-root': 'root',
  'missing-interval': 'interval'
}

export function generateIntervalQuestion(mode: IntervalMode = 'mixed', context: GenerationContext = {}): IntervalQuestion {
  for (let attempt = 0; attempt < 2000; attempt += 1) {
    const missing = mode === 'mixed' ? randomItem<IntervalMissingPart>(['root', 'top', 'interval']) : MISSING_BY_MODE[mode]
    const root = randomItem(SPELLING_OPTIONS)
    const interval = randomItem(INTERVAL_SPEED_OPTIONS)

    let top: SpelledPitch
    try {
      top = transposeNoteByInterval(root, interval)
    } catch {
      continue
    }

    if (!isSupportedSpelling(top) || !isValidIntervalPair(root, top)) {
      continue
    }

    const verifiedInterval = intervalBetweenNotes(root, top)
    if (verifiedInterval !== interval) {
      continue
    }

    const answerOptions = buildAnswerOptions(missing, root, top, interval)
    if (answerOptions.length === 0) {
      continue
    }

    const questionKey = intervalQuestionKey({ root, top, interval, missing })
    if (questionKey === context.previousQuestionKey) {
      continue
    }

    return {
      id: crypto.randomUUID(),
      root,
      top,
      interval,
      missing,
      answerOptions
    }
  }

  throw new Error('Unable to generate a valid interval question')
}

export function checkIntervalAnswer(question: IntervalQuestion, answer: string): AnswerResult {
  const correctAnswer = getIntervalCorrectAnswer(question)
  return {
    correct: answer === correctAnswer,
    correctAnswer,
    userAnswer: answer,
    explanation: `${question.root} -> ${question.top} = ${INTERVAL_LABELS[question.interval]}`
  }
}

export function getIntervalCorrectAnswer(question: IntervalQuestion): string {
  if (question.missing === 'root') return question.root
  if (question.missing === 'top') return question.top
  return question.interval
}

export function getIntervalStatsKey(timeLimit: IntervalTimeLimit, mode: IntervalMode): StatsKey {
  return `interval-speed:${timeLimit}:${mode}`
}

export function intervalQuestionKey(
  question: Pick<IntervalQuestion, 'root' | 'top' | 'interval' | 'missing'>
): string {
  return `${question.missing}:${question.root}:${question.top}:${question.interval}`
}

function buildAnswerOptions(
  missing: IntervalMissingPart,
  root: SpelledPitch,
  top: SpelledPitch,
  interval: IntervalName
): string[] {
  if (missing === 'interval') {
    return INTERVAL_SPEED_OPTIONS
  }

  if (missing === 'top') {
    const correctTop = transposeNoteByInterval(root, interval)
    return correctTop === top ? SPELLING_OPTIONS : []
  }

  const roots = findRootsForTopAndInterval(top, interval)
  return roots.length === 1 && roots[0] === root ? SPELLING_OPTIONS : []
}
