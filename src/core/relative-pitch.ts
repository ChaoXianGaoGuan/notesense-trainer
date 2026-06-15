import type { OctavePitch } from './types'

export type RelativePitchDifficulty = 2 | 3 | 4 | 5 | 6 | 7
export type RelativePitchDirection = 'up' | 'down' | 'mixed'
export type RelativePitchOrder = 'sequential' | 'random'

export type SungPitchEvent = {
  midi: number
  cents: number
  durationMs: number
}

export type RelativePitchPattern = {
  id: string
  difficulty: RelativePitchDifficulty
  direction: Exclude<RelativePitchDirection, 'mixed'>
  degrees: number[]
}

export type RelativePitchEvaluation = {
  correct: boolean
  expectedDegrees: number[]
  detectedDegrees: number[]
  explanation: string
}

const C_MAJOR_UP: Record<number, OctavePitch> = {
  1: 'C4',
  2: 'D4',
  3: 'E4',
  4: 'F4',
  5: 'G4',
  6: 'A4',
  7: 'B4',
  8: 'C5'
}

const C_MAJOR_DOWN: Record<number, OctavePitch> = {
  1: 'C5',
  2: 'D4',
  3: 'E4',
  4: 'F4',
  5: 'G4',
  6: 'A4',
  7: 'B4',
  8: 'C4'
}

const DEGREE_TO_MIDI_UP: Record<number, number> = {
  1: 60,
  2: 62,
  3: 64,
  4: 65,
  5: 67,
  6: 69,
  7: 71,
  8: 72
}

const DEGREE_TO_MIDI_DOWN: Record<number, number> = {
  1: 72,
  2: 62,
  3: 64,
  4: 65,
  5: 67,
  6: 69,
  7: 71,
  8: 60
}

export const RELATIVE_PITCH_DIFFICULTIES: RelativePitchDifficulty[] = [2, 3, 4, 5, 6, 7]
export const RELATIVE_PITCH_DIRECTIONS: RelativePitchDirection[] = ['up', 'down', 'mixed']
export const RELATIVE_PITCH_ORDERS: RelativePitchOrder[] = ['sequential', 'random']

export function buildRelativePitchPatterns(
  difficulty: RelativePitchDifficulty,
  direction: RelativePitchDirection
): RelativePitchPattern[] {
  const directions = direction === 'mixed' ? (['up', 'down'] as const) : ([direction] as const)
  return directions.flatMap((patternDirection) =>
    buildDegreeSeries(difficulty, patternDirection).map((degrees) => ({
      id: `${patternDirection}-${degrees.join('')}`,
      difficulty,
      direction: patternDirection,
      degrees
    }))
  )
}

export function relativePitchPatternToNotes(pattern: RelativePitchPattern): OctavePitch[] {
  const pitchMap = pattern.direction === 'up' ? C_MAJOR_UP : C_MAJOR_DOWN
  return pattern.degrees.map((degree) => pitchMap[degree])
}

export function relativePitchPatternLabel(pattern: RelativePitchPattern): string {
  return pattern.degrees.map((degree) => (degree === 8 ? '1' : String(degree))).join('')
}

export function evaluateRelativePitchAnswer(
  pattern: RelativePitchPattern,
  sungEvents: SungPitchEvent[],
  centsTolerance = 50
): RelativePitchEvaluation {
  const expectedDegrees = pattern.degrees.map((degree) => (degree === 8 ? 1 : degree))
  const detectedDegrees = sungEvents
    .map((event) => pitchEventToDegree(event, pattern.direction, centsTolerance))
    .filter((degree): degree is number => degree !== null)

  const correct =
    detectedDegrees.length === expectedDegrees.length &&
    detectedDegrees.every((degree, index) => degree === expectedDegrees[index])

  return {
    correct,
    expectedDegrees,
    detectedDegrees,
    explanation: formatRelativePitchExplanation(expectedDegrees, detectedDegrees)
  }
}

export function pitchEventToDegree(
  event: SungPitchEvent,
  direction: Exclude<RelativePitchDirection, 'mixed'>,
  centsTolerance = 50
): number | null {
  if (Math.abs(event.cents) > centsTolerance) return null
  const degreeMap = direction === 'up' ? DEGREE_TO_MIDI_UP : DEGREE_TO_MIDI_DOWN
  const degree = Object.entries(degreeMap).find(([, midi]) => midi === event.midi)?.[0]
  if (!degree) return null
  return Number(degree) === 8 ? 1 : Number(degree)
}

function buildDegreeSeries(
  difficulty: RelativePitchDifficulty,
  direction: Exclude<RelativePitchDirection, 'mixed'>
): number[][] {
  const orderedDegrees = direction === 'up' ? [2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2]
  const series = combinations(orderedDegrees, difficulty - 1).map((degrees) => mirrorDegrees(degrees))
  if (difficulty === 2) {
    series.push([1, 8, 1])
  }
  return series
}

function mirrorDegrees(middleDegrees: number[]): number[] {
  return [1, ...middleDegrees, ...middleDegrees.slice(0, -1).reverse(), 1]
}

function combinations(values: number[], size: number): number[][] {
  if (size === 0) return [[]]
  if (values.length < size) return []
  const [first, ...rest] = values
  return [
    ...combinations(rest, size - 1).map((combination) => [first, ...combination]),
    ...combinations(rest, size)
  ]
}

function formatRelativePitchExplanation(expectedDegrees: number[], detectedDegrees: number[]): string {
  if (detectedDegrees.length === 0) {
    return `未识别到稳定音高；正确序列：${expectedDegrees.join('')}`
  }
  if (detectedDegrees.length !== expectedDegrees.length) {
    return `识别到：${detectedDegrees.join('')}；正确序列：${expectedDegrees.join('')}`
  }
  const firstWrongIndex = detectedDegrees.findIndex((degree, index) => degree !== expectedDegrees[index])
  if (firstWrongIndex === -1) {
    return `识别到：${detectedDegrees.join('')}；音高顺序正确`
  }
  return `第 ${firstWrongIndex + 1} 个音应为 ${expectedDegrees[firstWrongIndex]}，识别为 ${detectedDegrees[firstWrongIndex]}`
}
