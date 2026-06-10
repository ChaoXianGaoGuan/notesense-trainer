import { buildChord, CHORD_LABELS, type BuiltChord, type ChordQuality } from '../core/chords'
import { NATURAL_NOTES } from '../core/notes'
import { randomItem, randomKeyAvoiding } from '../core/random'
import type { AnswerResult, GenerationContext, NaturalNote, OctavePitch, StatsKey } from '../core/types'

export type ChordStage = 1 | 2 | 3 | 4

export type ChordQuestion = {
  id: string
  root: NaturalNote
  quality: ChordQuality
  chord: BuiltChord
  playbackNotes: [OctavePitch, OctavePitch, OctavePitch]
}

export const CHORD_STAGES: ChordStage[] = [1, 2, 3, 4]

export function chordQualitiesForStage(stage: ChordStage): ChordQuality[] {
  return stage === 1 || stage === 2 ? ['major', 'minor'] : ['major', 'minor', 'diminished', 'augmented']
}

export function rootsForStage(stage: ChordStage): NaturalNote[] {
  return stage === 1 || stage === 3 ? ['C'] : NATURAL_NOTES
}

export function generateChordQuestion(stage: ChordStage, context: GenerationContext = {}): ChordQuestion {
  const roots = rootsForStage(stage)
  const qualities = chordQualitiesForStage(stage)
  const candidates = roots.flatMap((root) => qualities.map((quality) => ({ root, quality })))
  const selected = randomKeyAvoiding(
    candidates,
    (candidate) => `${candidate.root}:${candidate.quality}`,
    context.previousQuestionKey
  )
  const chord = buildChord(selected.root, selected.quality)
  const playbackNotes = chord.notes.map((note) => `${note}4`) as [OctavePitch, OctavePitch, OctavePitch]

  return {
    id: crypto.randomUUID(),
    root: selected.root,
    quality: selected.quality,
    chord,
    playbackNotes
  }
}

export function checkChordAnswer(question: ChordQuestion, answer: ChordQuality): AnswerResult {
  return {
    correct: answer === question.quality,
    correctAnswer: CHORD_LABELS[question.quality],
    userAnswer: CHORD_LABELS[answer],
    explanation: question.chord.label
  }
}

export function getChordStatsKey(stage: ChordStage): StatsKey {
  return `chord-quality:${stage}`
}
