import { CHORD_LABELS, CHORD_QUALITIES, buildChord, type ChordQuality } from '../core/chords'
import {
  MAJOR_KEYS,
  buildMajorScale,
  findMajorKeysForTriad,
  hasDoubleAccidental,
  type MajorKey
} from '../core/major-keys'
import { randomItem, randomKeyAvoiding } from '../core/random'
import type { AnswerResult, GenerationContext, SpelledPitch, StatsKey } from '../core/types'

export type TriadKeyMatchQuestion = {
  id: string
  root: SpelledPitch
  quality: ChordQuality
  notes: [SpelledPitch, SpelledPitch, SpelledPitch]
  matchingKeys: MajorKey[]
}

const TRIAD_ROOTS = Array.from(
  new Set(MAJOR_KEYS.flatMap((key) => buildMajorScale(key).notes))
).filter((note) => !hasDoubleAccidental(note))

export const NO_MATCHING_MAJOR_KEY = 'none'

export type TriadKeyAnswer = MajorKey[] | typeof NO_MATCHING_MAJOR_KEY

export function generateTriadKeyMatchQuestion(context: GenerationContext = {}): TriadKeyMatchQuestion {
  for (let attempt = 0; attempt < 2000; attempt += 1) {
    const root = randomItem(TRIAD_ROOTS)
    const quality = randomItem(CHORD_QUALITIES)
    const chord = tryBuildDisplayableChord(root, quality)

    if (!chord) {
      continue
    }

    const matchingKeys = findMajorKeysForTriad(chord.notes)
    const questionKey = triadKeyMatchQuestionKey({ root, quality })
    if (questionKey === context.previousQuestionKey) {
      continue
    }

    return {
      id: crypto.randomUUID(),
      root,
      quality,
      notes: chord.notes,
      matchingKeys
    }
  }

  throw new Error('Unable to generate a valid triad key match question')
}

export function checkTriadKeyMatchAnswer(question: TriadKeyMatchQuestion, answer: TriadKeyAnswer): AnswerResult {
  const userKeys = answer === NO_MATCHING_MAJOR_KEY ? [] : answer
  const correct = sameSet(userKeys, question.matchingKeys)
  return {
    correct,
    correctAnswer: formatMajorKeyAnswer(question.matchingKeys),
    userAnswer: answer === NO_MATCHING_MAJOR_KEY ? '无符合大调' : formatMajorKeyAnswer(answer),
    explanation: `${question.notes.join(' ')} · ${CHORD_LABELS[question.quality]}`
  }
}

export function getTriadKeyMatchStatsKey(): StatsKey {
  return 'triad-key-match'
}

export function triadKeyMatchQuestionKey(question: Pick<TriadKeyMatchQuestion, 'root' | 'quality'>): string {
  return `${question.root}:${question.quality}`
}

export function findNoMatchTriadQuestion(): TriadKeyMatchQuestion {
  const candidates = TRIAD_ROOTS.flatMap((root) =>
    CHORD_QUALITIES.map((quality) => {
      const chord = tryBuildDisplayableChord(root, quality)
      return chord ? { root, quality, chord } : null
    })
  ).filter((candidate): candidate is NonNullable<typeof candidate> =>
    Boolean(candidate && findMajorKeysForTriad(candidate.chord.notes).length === 0)
  )

  const selected = randomKeyAvoiding(candidates, (candidate) => `${candidate.root}:${candidate.quality}`, undefined)
  return {
    id: crypto.randomUUID(),
    root: selected.root,
    quality: selected.quality,
    notes: selected.chord.notes,
    matchingKeys: []
  }
}

function sameSet(left: MajorKey[], right: MajorKey[]): boolean {
  return left.length === right.length && left.every((key) => right.includes(key))
}

function formatMajorKeyAnswer(keys: MajorKey[]): string {
  return keys.length === 0 ? '无符合大调' : keys.join(' ')
}

function tryBuildDisplayableChord(root: SpelledPitch, quality: ChordQuality): ReturnType<typeof buildChord> | null {
  try {
    const chord = buildChord(root, quality)
    return chord.notes.some(hasDoubleAccidental) ? null : chord
  } catch {
    return null
  }
}
