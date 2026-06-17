export type NaturalNote = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
export type Accidental = 'bb' | 'b' | '' | '#' | 'x'
export type SpelledPitch = `${NaturalNote}${Accidental}`
export type OctavePitch = `${SpelledPitch}${number}`

export type Solfege = 'do' | 're' | 'mi' | 'fa' | 'sol' | 'la' | 'si'

export type AnswerResult = {
  correct: boolean
  correctAnswer: string | string[]
  userAnswer: string | string[]
  explanation?: string
}

export type Timbre = 'piano' | 'guitar'

export type AudioSettings = {
  volume: number
  durationMs: number
  timbre: Timbre
}

export type Stats = {
  answered: number
  correct: number
  streak: number
}

export type StatsKey =
  | 'solfege'
  | `single-note:${1 | 2 | 3}`
  | `melody:${2 | 3 | 4 | 5}`
  | `chord-quality:${1 | 2 | 3 | 4}`
  | `interval-speed:${5 | 10}:${'missing-top' | 'missing-root' | 'missing-interval' | 'mixed'}`
  | `syncopation:${1 | 2 | 3 | 4 | 5 | 6 | 7}:${60 | 80 | 100}:${'2/4' | '3/4' | '4/4'}`
  | `relative-pitch-sing:${2 | 3 | 4 | 5 | 6 | 7}:${'up' | 'down' | 'mixed'}`
  | 'degree-chord'
  | 'triad-key-match'

export type GenerationContext = {
  previousQuestionKey?: string
}

export interface TrainerModule<Question, Answer, Settings> {
  generateQuestion(settings: Settings, context: GenerationContext): Question
  checkAnswer(question: Question, answer: Answer): AnswerResult
  getStatsKey(settings: Settings): StatsKey
}
