import type { Accidental, NaturalNote, OctavePitch, Solfege, SpelledPitch } from './types'

export const NATURAL_NOTES: NaturalNote[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
export const NATURAL_NOTE_SET = new Set<string>(NATURAL_NOTES)

export const SOLFEGE_OPTIONS: Solfege[] = ['do', 're', 'mi', 'fa', 'sol', 'la', 'si']

export const SOLFEGE_BY_NOTE: Record<NaturalNote, Solfege> = {
  C: 'do',
  D: 're',
  E: 'mi',
  F: 'fa',
  G: 'sol',
  A: 'la',
  B: 'si'
}

export const NOTE_BY_SOLFEGE: Record<Solfege, NaturalNote> = {
  do: 'C',
  re: 'D',
  mi: 'E',
  fa: 'F',
  sol: 'G',
  la: 'A',
  si: 'B'
}

export const SPELLING_OPTIONS: SpelledPitch[] = [
  'Cb',
  'C',
  'C#',
  'Db',
  'D',
  'D#',
  'Eb',
  'E',
  'E#',
  'Fb',
  'F',
  'F#',
  'Gb',
  'G',
  'G#',
  'Ab',
  'A',
  'A#',
  'Bb',
  'B',
  'B#'
]

export const NATURAL_TO_SEMITONE: Record<NaturalNote, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11
}

const ACCIDENTAL_TO_OFFSET: Record<Accidental, number> = {
  bb: -2,
  b: -1,
  '': 0,
  '#': 1,
  x: 2
}

const OFFSET_TO_ACCIDENTAL = new Map<number, Accidental>([
  [-2, 'bb'],
  [-1, 'b'],
  [0, ''],
  [1, '#'],
  [2, 'x']
])

export function noteToSolfege(note: NaturalNote): Solfege {
  return SOLFEGE_BY_NOTE[note]
}

export function naturalNoteToOctavePitch(note: NaturalNote, octave = 4): OctavePitch {
  return `${note}${octave}` as OctavePitch
}

export function solfegeToOctavePitch(solfege: Solfege, octave = 4): OctavePitch {
  return naturalNoteToOctavePitch(NOTE_BY_SOLFEGE[solfege], octave)
}

export function parseSpelledPitch(note: SpelledPitch): { letter: NaturalNote; accidental: Accidental } {
  const match = /^([A-G])(bb|b|#|x)?$/.exec(note)
  if (!match) {
    throw new Error(`Invalid spelled pitch: ${note}`)
  }

  return {
    letter: match[1] as NaturalNote,
    accidental: (match[2] ?? '') as Accidental
  }
}

export function parseOctavePitch(note: OctavePitch): {
  pitch: SpelledPitch
  letter: NaturalNote
  accidental: Accidental
  octave: number
} {
  const match = /^([A-G](?:bb|b|#|x)?)(-?\d+)$/.exec(note)
  if (!match) {
    throw new Error(`Invalid octave pitch: ${note}`)
  }

  const pitch = match[1] as SpelledPitch
  const parsed = parseSpelledPitch(pitch)
  return {
    pitch,
    letter: parsed.letter,
    accidental: parsed.accidental,
    octave: Number(match[2])
  }
}

export function accidentalOffset(accidental: Accidental): number {
  return ACCIDENTAL_TO_OFFSET[accidental]
}

export function offsetToAccidental(offset: number): Accidental {
  const accidental = OFFSET_TO_ACCIDENTAL.get(offset)
  if (accidental === undefined) {
    throw new Error(`Unsupported accidental offset: ${offset}`)
  }

  return accidental
}

export function pitchClass(note: SpelledPitch): number {
  const { letter, accidental } = parseSpelledPitch(note)
  return modulo(NATURAL_TO_SEMITONE[letter] + accidentalOffset(accidental), 12)
}

export function spelledPitchToSemitone(note: SpelledPitch): number {
  const { letter, accidental } = parseSpelledPitch(note)
  return NATURAL_TO_SEMITONE[letter] + accidentalOffset(accidental)
}

export function octavePitchToMidi(note: OctavePitch): number {
  const parsed = parseOctavePitch(note)
  return 12 * (parsed.octave + 1) + spelledPitchToSemitone(parsed.pitch)
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}

export function octavePitchToFrequency(note: OctavePitch): number {
  return midiToFrequency(octavePitchToMidi(note))
}

export function naturalLetterDistance(root: NaturalNote, top: NaturalNote): number {
  const rootIndex = NATURAL_NOTES.indexOf(root)
  const topIndex = NATURAL_NOTES.indexOf(top)
  const simpleDistance = modulo(topIndex - rootIndex, 7) + 1
  return simpleDistance === 1 ? 8 : simpleDistance
}

export function naturalSemitoneDistance(root: NaturalNote, top: NaturalNote): number {
  let distance = NATURAL_TO_SEMITONE[top] - NATURAL_TO_SEMITONE[root]
  while (distance <= 0) {
    distance += 12
  }
  return distance
}

export function formatSpelledPitch(letter: NaturalNote, accidentalOffsetValue: number): SpelledPitch {
  return `${letter}${offsetToAccidental(accidentalOffsetValue)}` as SpelledPitch
}

export function getNaturalNoteFromPitch(note: OctavePitch | SpelledPitch): NaturalNote {
  return parseSpelledPitch(stripOctave(note)).letter
}

export function stripOctave(note: OctavePitch | SpelledPitch): SpelledPitch {
  return note.replace(/-?\d+$/, '') as SpelledPitch
}

export function withOctave(note: SpelledPitch, octave: number): OctavePitch {
  return `${note}${octave}` as OctavePitch
}

export function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor
}
