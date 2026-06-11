import { buildChord, type BuiltChord, type ChordQuality } from './chords'
import { transposeNoteByInterval, type IntervalName } from './intervals'
import type { SpelledPitch } from './types'

export type MajorKey =
  | 'C'
  | 'G'
  | 'D'
  | 'A'
  | 'E'
  | 'B'
  | 'F#'
  | 'C#'
  | 'F'
  | 'Bb'
  | 'Eb'
  | 'Ab'
  | 'Db'
  | 'Gb'
  | 'Cb'

export type ScaleDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const MAJOR_KEYS: MajorKey[] = [
  'C',
  'G',
  'D',
  'A',
  'E',
  'B',
  'F#',
  'C#',
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Db',
  'Gb',
  'Cb'
]

export const NATURAL_MAJOR_KEYS: MajorKey[] = ['C']
export const SHARP_MAJOR_KEYS: MajorKey[] = ['G', 'D', 'A', 'E', 'B', 'F#', 'C#']
export const FLAT_MAJOR_KEYS: MajorKey[] = ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb']
export const SCALE_DEGREES: ScaleDegree[] = [1, 2, 3, 4, 5, 6, 7]

export const DEGREE_ROMANS: Record<ScaleDegree, string> = {
  1: 'I',
  2: 'ii',
  3: 'iii',
  4: 'IV',
  5: 'V',
  6: 'vi',
  7: 'vii°'
}

export const DEGREE_CHORD_QUALITIES: Record<ScaleDegree, ChordQuality> = {
  1: 'major',
  2: 'minor',
  3: 'minor',
  4: 'major',
  5: 'major',
  6: 'minor',
  7: 'diminished'
}

const MAJOR_SCALE_INTERVALS: IntervalName[] = ['P8', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7']

export type MajorScale = {
  key: MajorKey
  notes: [SpelledPitch, SpelledPitch, SpelledPitch, SpelledPitch, SpelledPitch, SpelledPitch, SpelledPitch]
}

export type DegreeChord = BuiltChord & {
  key: MajorKey
  degree: ScaleDegree
  roman: string
}

export function buildMajorScale(key: MajorKey): MajorScale {
  const notes = MAJOR_SCALE_INTERVALS.map((interval) =>
    interval === 'P8' ? key : transposeNoteByInterval(key, interval)
  ) as MajorScale['notes']

  return { key, notes }
}

export function buildDegreeChord(key: MajorKey, degree: ScaleDegree): DegreeChord {
  const scale = buildMajorScale(key)
  const root = scale.notes[degree - 1]
  const quality = DEGREE_CHORD_QUALITIES[degree]
  const chord = buildChord(root, quality)

  return {
    ...chord,
    key,
    degree,
    roman: DEGREE_ROMANS[degree]
  }
}

export function buildAllDegreeChords(): DegreeChord[] {
  return MAJOR_KEYS.flatMap((key) => SCALE_DEGREES.map((degree) => buildDegreeChord(key, degree)))
}

export function getMajorKeyGroups(): Array<{ label: string; keys: MajorKey[] }> {
  return [
    { label: '自然调', keys: NATURAL_MAJOR_KEYS },
    { label: '升号调', keys: SHARP_MAJOR_KEYS },
    { label: '降号调', keys: FLAT_MAJOR_KEYS }
  ]
}

export function findMajorKeysForTriad(notes: [SpelledPitch, SpelledPitch, SpelledPitch]): MajorKey[] {
  const normalized = notes.join(' ')
  return MAJOR_KEYS.filter((key) =>
    SCALE_DEGREES.some((degree) => buildDegreeChord(key, degree).notes.join(' ') === normalized)
  )
}

export function hasDoubleAccidental(note: SpelledPitch): boolean {
  return note.includes('bb') || note.includes('x')
}
