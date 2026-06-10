import { transposeNoteByInterval, type IntervalName } from './intervals'
import type { SpelledPitch } from './types'

export type ChordQuality = 'major' | 'minor' | 'diminished' | 'augmented'

export const CHORD_QUALITIES: ChordQuality[] = ['major', 'minor', 'diminished', 'augmented']

export const CHORD_LABELS: Record<ChordQuality, string> = {
  major: 'Major 大三',
  minor: 'Minor 小三',
  diminished: 'Diminished 减三',
  augmented: 'Augmented 增三'
}

const CHORD_INTERVALS: Record<ChordQuality, [IntervalName, IntervalName]> = {
  major: ['M3', 'P5'],
  minor: ['m3', 'P5'],
  diminished: ['m3', 'd5'],
  augmented: ['M3', 'A5']
}

export type BuiltChord = {
  root: SpelledPitch
  quality: ChordQuality
  notes: [SpelledPitch, SpelledPitch, SpelledPitch]
  label: string
}

export function buildChord(root: SpelledPitch, quality: ChordQuality): BuiltChord {
  const [thirdInterval, fifthInterval] = CHORD_INTERVALS[quality]
  const third = transposeNoteByInterval(root, thirdInterval)
  const fifth = transposeNoteByInterval(root, fifthInterval)
  const notes: [SpelledPitch, SpelledPitch, SpelledPitch] = [root, third, fifth]

  return {
    root,
    quality,
    notes,
    label: `${root} ${CHORD_LABELS[quality]} = ${notes.join(' ')}`
  }
}
