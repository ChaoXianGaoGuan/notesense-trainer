import { CHORD_LABELS, type ChordQuality } from '../core/chords'
import {
  MAJOR_KEYS,
  SCALE_DEGREES,
  buildDegreeChord,
  type MajorKey,
  type ScaleDegree
} from '../core/major-keys'
import { randomItem, randomKeyAvoiding } from '../core/random'
import type { Accidental, AnswerResult, GenerationContext, NaturalNote, SpelledPitch, StatsKey } from '../core/types'

export type DegreeChordAnswer = {
  letter: NaturalNote
  accidental: Extract<Accidental, 'b' | '' | '#'>
  quality: Extract<ChordQuality, 'major' | 'minor' | 'diminished'>
}

export type DegreeChordQuestion = {
  id: string
  key: MajorKey
  degree: ScaleDegree
  chord: ReturnType<typeof buildDegreeChord>
}

export const DEGREE_CHORD_ACCIDENTALS: DegreeChordAnswer['accidental'][] = ['b', '', '#']
export const DEGREE_CHORD_QUALITIES: DegreeChordAnswer['quality'][] = ['major', 'minor', 'diminished']

export function generateDegreeChordQuestion(context: GenerationContext = {}): DegreeChordQuestion {
  const candidates = MAJOR_KEYS.flatMap((key) =>
    SCALE_DEGREES.map((degree) => ({
      key,
      degree,
      questionKey: `${key}:${degree}`
    }))
  )
  const selected = randomKeyAvoiding(candidates, (candidate) => candidate.questionKey, context.previousQuestionKey)
  return {
    id: crypto.randomUUID(),
    key: selected.key,
    degree: selected.degree,
    chord: buildDegreeChord(selected.key, selected.degree)
  }
}

export function checkDegreeChordAnswer(question: DegreeChordQuestion, answer: DegreeChordAnswer): AnswerResult {
  const correctAnswer = chordToAnswer(question.chord.root, question.chord.quality)
  const correct =
    answer.letter === correctAnswer.letter &&
    answer.accidental === correctAnswer.accidental &&
    answer.quality === correctAnswer.quality

  return {
    correct,
    correctAnswer: formatDegreeChordAnswer(correctAnswer),
    userAnswer: formatDegreeChordAnswer(answer),
    explanation: question.chord.label
  }
}

export function getDegreeChordStatsKey(): StatsKey {
  return 'degree-chord'
}

export function degreeChordQuestionKey(question: Pick<DegreeChordQuestion, 'key' | 'degree'>): string {
  return `${question.key}:${question.degree}`
}

function chordToAnswer(root: SpelledPitch, quality: ChordQuality): DegreeChordAnswer {
  const match = /^([A-G])(b|#)?$/.exec(root)
  if (!match || quality === 'augmented') {
    throw new Error(`Unsupported degree chord answer: ${root} ${quality}`)
  }

  return {
    letter: match[1] as NaturalNote,
    accidental: (match[2] ?? '') as DegreeChordAnswer['accidental'],
    quality
  }
}

function formatDegreeChordAnswer(answer: DegreeChordAnswer): string {
  return `${answer.letter}${answer.accidental} ${CHORD_LABELS[answer.quality]}`
}

export function randomDegreeChordAnswer(): DegreeChordAnswer {
  return {
    letter: randomItem<NaturalNote>(['C', 'D', 'E', 'F', 'G', 'A', 'B']),
    accidental: randomItem(DEGREE_CHORD_ACCIDENTALS),
    quality: randomItem(DEGREE_CHORD_QUALITIES)
  }
}
