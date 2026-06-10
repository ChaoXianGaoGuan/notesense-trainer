import {
  NATURAL_NOTES,
  SPELLING_OPTIONS,
  accidentalOffset,
  formatSpelledPitch,
  naturalLetterDistance,
  naturalSemitoneDistance,
  parseSpelledPitch,
  pitchClass
} from './notes'
import type { NaturalNote, SpelledPitch } from './types'

export type IntervalNumber = 2 | 3 | 4 | 5 | 6 | 7 | 8
export type IntervalQuality = 'd' | 'm' | 'M' | 'P' | 'A'
export type IntervalName =
  | 'd2'
  | 'm2'
  | 'M2'
  | 'A2'
  | 'd3'
  | 'm3'
  | 'M3'
  | 'A3'
  | 'd4'
  | 'P4'
  | 'A4'
  | 'd5'
  | 'P5'
  | 'A5'
  | 'd6'
  | 'm6'
  | 'M6'
  | 'A6'
  | 'd7'
  | 'm7'
  | 'M7'
  | 'A7'
  | 'd8'
  | 'P8'
  | 'A8'

export const INTERVAL_OPTIONS: IntervalName[] = [
  'd2',
  'm2',
  'M2',
  'A2',
  'd3',
  'm3',
  'M3',
  'A3',
  'd4',
  'P4',
  'A4',
  'd5',
  'P5',
  'A5',
  'd6',
  'm6',
  'M6',
  'A6',
  'd7',
  'm7',
  'M7',
  'A7',
  'd8',
  'P8',
  'A8'
]

export const INTERVAL_LABELS: Record<IntervalName, string> = {
  d2: 'd2 减二度',
  m2: 'm2 小二度',
  M2: 'M2 大二度',
  A2: 'A2 增二度',
  d3: 'd3 减三度',
  m3: 'm3 小三度',
  M3: 'M3 大三度',
  A3: 'A3 增三度',
  d4: 'd4 减四度',
  P4: 'P4 纯四度',
  A4: 'A4 增四度',
  d5: 'd5 减五度',
  P5: 'P5 纯五度',
  A5: 'A5 增五度',
  d6: 'd6 减六度',
  m6: 'm6 小六度',
  M6: 'M6 大六度',
  A6: 'A6 增六度',
  d7: 'd7 减七度',
  m7: 'm7 小七度',
  M7: 'M7 大七度',
  A7: 'A7 增七度',
  d8: 'd8 减八度',
  P8: 'P8 纯八度',
  A8: 'A8 增八度'
}

const PERFECT_NUMBERS = new Set<IntervalNumber>([4, 5, 8])
const MAJOR_BASE_SEMITONES: Record<2 | 3 | 6 | 7, number> = {
  2: 2,
  3: 4,
  6: 9,
  7: 11
}
const PERFECT_BASE_SEMITONES: Record<4 | 5 | 8, number> = {
  4: 5,
  5: 7,
  8: 12
}

export function parseInterval(interval: IntervalName): {
  quality: IntervalQuality
  number: IntervalNumber
} {
  const match = /^([dmMPA])([2-8])$/.exec(interval)
  if (!match) {
    throw new Error(`Invalid interval: ${interval}`)
  }

  const quality = match[1] as IntervalQuality
  const number = Number(match[2]) as IntervalNumber

  if (PERFECT_NUMBERS.has(number)) {
    if (!['d', 'P', 'A'].includes(quality)) {
      throw new Error(`Invalid perfect-family interval: ${interval}`)
    }
  } else if (!['d', 'm', 'M', 'A'].includes(quality)) {
    throw new Error(`Invalid major-family interval: ${interval}`)
  }

  return { quality, number }
}

export function intervalToSemitones(interval: IntervalName): number {
  const { quality, number } = parseInterval(interval)

  if (PERFECT_NUMBERS.has(number)) {
    const base = PERFECT_BASE_SEMITONES[number as 4 | 5 | 8]
    if (quality === 'd') return base - 1
    if (quality === 'P') return base
    if (quality === 'A') return base + 1
  } else {
    const base = MAJOR_BASE_SEMITONES[number as 2 | 3 | 6 | 7]
    if (quality === 'd') return base - 2
    if (quality === 'm') return base - 1
    if (quality === 'M') return base
    if (quality === 'A') return base + 1
  }

  throw new Error(`Unsupported interval quality: ${interval}`)
}

export function transposeNoteByInterval(root: SpelledPitch, interval: IntervalName): SpelledPitch {
  const { letter: rootLetter, accidental: rootAccidental } = parseSpelledPitch(root)
  const { number } = parseInterval(interval)
  const targetLetter = transposeLetter(rootLetter, number)
  const naturalDistance = naturalSemitoneDistance(rootLetter, targetLetter)
  const requiredOffset =
    accidentalOffset(rootAccidental) + intervalToSemitones(interval) - naturalDistance

  return formatSpelledPitch(targetLetter, requiredOffset)
}

export function intervalBetweenNotes(root: SpelledPitch, top: SpelledPitch): IntervalName {
  const rootParsed = parseSpelledPitch(root)
  const topParsed = parseSpelledPitch(top)
  const number = naturalLetterDistance(rootParsed.letter, topParsed.letter)
  const naturalDistance = naturalSemitoneDistance(rootParsed.letter, topParsed.letter)
  const semitones =
    naturalDistance + accidentalOffset(topParsed.accidental) - accidentalOffset(rootParsed.accidental)

  return intervalFromNumberAndSemitones(number as IntervalNumber, semitones)
}

export function intervalFromNumberAndSemitones(
  number: IntervalNumber,
  semitones: number
): IntervalName {
  if (PERFECT_NUMBERS.has(number)) {
    const base = PERFECT_BASE_SEMITONES[number as 4 | 5 | 8]
    const delta = semitones - base
    const quality = delta === -1 ? 'd' : delta === 0 ? 'P' : delta === 1 ? 'A' : undefined
    if (quality) return `${quality}${number}` as IntervalName
  } else {
    const base = MAJOR_BASE_SEMITONES[number as 2 | 3 | 6 | 7]
    const delta = semitones - base
    const quality =
      delta === -2 ? 'd' : delta === -1 ? 'm' : delta === 0 ? 'M' : delta === 1 ? 'A' : undefined
    if (quality) return `${quality}${number}` as IntervalName
  }

  throw new Error(`No supported interval for ${number} spanning ${semitones} semitones`)
}

export function findRootsForTopAndInterval(top: SpelledPitch, interval: IntervalName): SpelledPitch[] {
  return SPELLING_OPTIONS.filter((root) => {
    try {
      return transposeNoteByInterval(root, interval) === top
    } catch {
      return false
    }
  })
}

export function isValidIntervalPair(root: SpelledPitch, top: SpelledPitch): boolean {
  try {
    intervalBetweenNotes(root, top)
    return true
  } catch {
    return false
  }
}

export function isSupportedSpelling(note: SpelledPitch): boolean {
  return SPELLING_OPTIONS.includes(note)
}

export function enharmonicPitchClass(note: SpelledPitch): number {
  return pitchClass(note)
}

function transposeLetter(root: NaturalNote, number: IntervalNumber): NaturalNote {
  const rootIndex = NATURAL_NOTES.indexOf(root)
  return NATURAL_NOTES[(rootIndex + number - 1) % NATURAL_NOTES.length]
}
