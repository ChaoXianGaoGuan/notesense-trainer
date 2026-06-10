import { buildChord } from './chords'
import { intervalBetweenNotes, transposeNoteByInterval } from './intervals'
import { noteToSolfege, octavePitchToMidi } from './notes'

describe('notes', () => {
  it('maps natural notes to fixed solfege', () => {
    expect(noteToSolfege('C')).toBe('do')
    expect(noteToSolfege('D')).toBe('re')
    expect(noteToSolfege('E')).toBe('mi')
    expect(noteToSolfege('F')).toBe('fa')
    expect(noteToSolfege('G')).toBe('sol')
    expect(noteToSolfege('A')).toBe('la')
    expect(noteToSolfege('B')).toBe('si')
  })

  it('converts octave pitches to midi numbers', () => {
    expect(octavePitchToMidi('C4')).toBe(60)
    expect(octavePitchToMidi('A4')).toBe(69)
    expect(octavePitchToMidi('Cb4')).toBe(59)
    expect(octavePitchToMidi('B#3')).toBe(60)
  })
})

describe('intervals', () => {
  it('distinguishes interval spelling from enharmonic semitones', () => {
    expect(intervalBetweenNotes('C', 'E')).toBe('M3')
    expect(intervalBetweenNotes('C', 'Fb')).toBe('d4')
    expect(intervalBetweenNotes('D', 'F')).toBe('m3')
    expect(intervalBetweenNotes('D', 'F#')).toBe('M3')
    expect(intervalBetweenNotes('B', 'C')).toBe('m2')
  })

  it('transposes while preserving required letter spelling', () => {
    expect(transposeNoteByInterval('D', 'm3')).toBe('F')
    expect(transposeNoteByInterval('C', 'd4')).toBe('Fb')
    expect(transposeNoteByInterval('D', 'M3')).toBe('F#')
    expect(transposeNoteByInterval('C', 'P8')).toBe('C')
  })
})

describe('chords', () => {
  it('builds triads with third-stacked spelling', () => {
    expect(buildChord('C', 'major').notes).toEqual(['C', 'E', 'G'])
    expect(buildChord('D', 'major').notes).toEqual(['D', 'F#', 'A'])
    expect(buildChord('D', 'minor').notes).toEqual(['D', 'F', 'A'])
    expect(buildChord('B', 'diminished').notes).toEqual(['B', 'D', 'F'])
    expect(buildChord('C', 'augmented').notes).toEqual(['C', 'E', 'G#'])
  })
})
