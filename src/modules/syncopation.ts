import type { AnswerResult, GenerationContext, StatsKey } from '../core/types'
import {
  RHYTHM_BPM_OPTIONS,
  RHYTHM_DIFFICULTIES,
  evaluateRhythmHits,
  getBarDurationMs,
  getTemplatesForDifficulty,
  type RhythmBpm,
  type RhythmDifficulty,
  type RhythmEvaluation,
  type RhythmGrid,
  type RhythmNotation
} from '../core/rhythm'
import { randomItem } from '../core/random'

export type SyncopationDifficulty = RhythmDifficulty
export type SyncopationBpm = RhythmBpm
export type SyncopationNotation = RhythmNotation

export type SyncopationQuestion = {
  id: string
  templateId: string
  label: string
  cells: RhythmGrid
}

export type SyncopationSettings = {
  difficulty: SyncopationDifficulty
  bpm: SyncopationBpm
  notation: SyncopationNotation
  inputCalibrationMs: number
}

export type SyncopationResult = AnswerResult & {
  evaluation: RhythmEvaluation
}

export const SYNCOPATION_DIFFICULTIES = RHYTHM_DIFFICULTIES
export const SYNCOPATION_BPM_OPTIONS = RHYTHM_BPM_OPTIONS

export const SYNCOPATION_DIFFICULTY_LABELS: Record<SyncopationDifficulty, string> = {
  1: '八分反拍',
  2: '正反拍混合',
  3: '十六分切分',
  4: '附点训练',
  5: '跨拍连音'
}

export const SYNCOPATION_NOTATION_LABELS: Record<SyncopationNotation, string> = {
  jianpu: '简谱节奏',
  staff: '五线谱节奏'
}

export function generateSyncopationQuestion(
  difficulty: SyncopationDifficulty,
  context: GenerationContext = {}
): SyncopationQuestion {
  const templates = getTemplatesForDifficulty(difficulty)
  const candidates =
    templates.length > 1 && context.previousQuestionKey
      ? templates.filter((template) => template.id !== context.previousQuestionKey)
      : templates
  const template = randomItem(candidates)
  return {
    id: `${template.id}-${Math.random().toString(36).slice(2)}`,
    templateId: template.id,
    label: template.label,
    cells: template.cells
  }
}

export function checkSyncopationAnswer(
  question: SyncopationQuestion,
  bpm: SyncopationBpm,
  hitTimesMs: number[],
  inputCalibrationMs = 0
): SyncopationResult {
  const calibratedHitTimes = hitTimesMs.map((timeMs) => timeMs + inputCalibrationMs)
  const evaluation = evaluateRhythmHits(question.cells, bpm, calibratedHitTimes)
  const expectedCount = evaluation.targets.length
  const hitCount = evaluation.targets.filter((target) => target.status !== 'missed').length
  return {
    correct: evaluation.correct,
    correctAnswer: `${question.label}：${expectedCount} 个击打点`,
    userAnswer: `${hitCount} 次命中，${evaluation.extras.length} 次多拍`,
    explanation: formatSyncopationExplanation(evaluation),
    evaluation
  }
}

export function getSyncopationStatsKey(difficulty: SyncopationDifficulty, bpm: SyncopationBpm): StatsKey {
  return `syncopation:${difficulty}:${bpm}`
}

export function getSyncopationBarDurationMs(bpm: SyncopationBpm): number {
  return getBarDurationMs(bpm)
}

function formatSyncopationExplanation(evaluation: RhythmEvaluation): string {
  const missed = evaluation.targets.filter((target) => target.status === 'missed').length
  const early = evaluation.targets.filter((target) => target.status === 'early').length
  const late = evaluation.targets.filter((target) => target.status === 'late').length
  const average = evaluation.averageOffsetMs === null
    ? '无有效命中'
    : evaluation.averageOffsetMs === 0
      ? '平均无偏差'
      : `平均${evaluation.averageOffsetMs > 0 ? '晚' : '早'} ${Math.abs(evaluation.averageOffsetMs)}ms`
  return `${average}；漏拍 ${missed}，偏早 ${early}，偏晚 ${late}，多拍 ${evaluation.extras.length}`
}
