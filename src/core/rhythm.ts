export type RhythmCell = 'attack' | 'hold' | 'rest'
export type RhythmGrid = readonly RhythmCell[]
export type RhythmDifficulty = 1 | 2 | 3 | 4 | 5
export type RhythmBpm = 60 | 80 | 100
export type RhythmNotation = 'jianpu' | 'staff'

export type RhythmTemplate = {
  id: string
  difficulty: RhythmDifficulty
  label: string
  cells: RhythmGrid
}

export type RhythmHitStatus = 'hit' | 'early' | 'late' | 'missed'

export type RhythmTargetFeedback = {
  index: number
  expectedMs: number
  actualMs?: number
  offsetMs?: number
  status: RhythmHitStatus
}

export type RhythmExtraHit = {
  index: number
  actualMs: number
}

export type RhythmEvaluation = {
  correct: boolean
  toleranceMs: number
  averageOffsetMs: number | null
  targets: RhythmTargetFeedback[]
  extras: RhythmExtraHit[]
}

export type RhythmNotationEvent = {
  kind: 'note' | 'rest'
  start: number
  durationCells: 1 | 2 | 3 | 4
}

export type RhythmDemoEvent = {
  index: number
  timeMs: number
  attack: boolean
}

export type RhythmReplayEvent = {
  index: number
  timeMs: number
  kind: 'standard' | 'user'
}

const CELLS_PER_BAR = 16

export const RHYTHM_BPM_OPTIONS: RhythmBpm[] = [60, 80, 100]
export const RHYTHM_DIFFICULTIES: RhythmDifficulty[] = [1, 2, 3, 4, 5]

export const RHYTHM_TEMPLATES: RhythmTemplate[] = [
  {
    id: 'offbeat-eighths-a',
    difficulty: 1,
    label: '八分反拍',
    cells: cellsFromEvents([
      ['rest', 2],
      ['note', 2],
      ['rest', 2],
      ['note', 2],
      ['rest', 2],
      ['note', 2],
      ['rest', 2],
      ['note', 2]
    ])
  },
  {
    id: 'offbeat-eighths-b',
    difficulty: 1,
    label: '八分反拍变化',
    cells: cellsFromEvents([
      ['rest', 2],
      ['note', 2],
      ['rest', 4],
      ['note', 2],
      ['rest', 2],
      ['note', 2],
      ['rest', 2]
    ])
  },
  {
    id: 'mixed-eighths-a',
    difficulty: 2,
    label: '正反拍交替',
    cells: cellsFromEvents([
      ['note', 2],
      ['rest', 2],
      ['rest', 2],
      ['note', 2],
      ['note', 2],
      ['rest', 2],
      ['rest', 2],
      ['note', 2]
    ])
  },
  {
    id: 'mixed-eighths-b',
    difficulty: 2,
    label: '正反拍混合',
    cells: cellsFromEvents([
      ['note', 2],
      ['note', 4],
      ['rest', 2],
      ['rest', 2],
      ['note', 2],
      ['note', 2],
      ['rest', 2]
    ])
  },
  {
    id: 'sixteenth-syncopation-a',
    difficulty: 3,
    label: '十六分切分',
    cells: cellsFromEvents([
      ['note', 1],
      ['rest', 1],
      ['note', 1],
      ['rest', 1],
      ['rest', 1],
      ['note', 1],
      ['rest', 1],
      ['note', 1],
      ['note', 2],
      ['rest', 2],
      ['rest', 1],
      ['note', 1],
      ['rest', 2]
    ])
  },
  {
    id: 'sixteenth-syncopation-b',
    difficulty: 3,
    label: '十六分反拍',
    cells: cellsFromEvents([
      ['rest', 1],
      ['note', 1],
      ['rest', 2],
      ['note', 1],
      ['rest', 1],
      ['note', 2],
      ['rest', 2],
      ['note', 1],
      ['rest', 1],
      ['note', 1],
      ['rest', 1],
      ['note', 2]
    ])
  },
  {
    id: 'dotted-syncopation-a',
    difficulty: 4,
    label: '附点八分',
    cells: cellsFromEvents([
      ['note', 3],
      ['note', 1],
      ['rest', 2],
      ['note', 2],
      ['note', 3],
      ['note', 1],
      ['rest', 4]
    ])
  },
  {
    id: 'dotted-syncopation-b',
    difficulty: 4,
    label: '附点切分',
    cells: cellsFromEvents([
      ['rest', 1],
      ['note', 3],
      ['note', 2],
      ['rest', 2],
      ['note', 3],
      ['note', 1],
      ['note', 2],
      ['rest', 2]
    ])
  },
  {
    id: 'tied-across-beat-a',
    difficulty: 5,
    label: '跨拍延音',
    cells: cellsFromEvents([
      ['note', 2],
      ['note', 4],
      ['rest', 2],
      ['note', 1],
      ['rest', 1],
      ['note', 2],
      ['note', 4]
    ])
  },
  {
    id: 'tied-across-beat-b',
    difficulty: 5,
    label: '跨强拍切分',
    cells: cellsFromEvents([
      ['rest', 2],
      ['note', 4],
      ['note', 2],
      ['rest', 2],
      ['note', 4],
      ['rest', 2]
    ])
  }
]

export function cellsFromEvents(events: Array<['note' | 'rest', 1 | 2 | 3 | 4]>): RhythmCell[] {
  const cells: RhythmCell[] = []
  for (const [kind, duration] of events) {
    if (kind === 'rest') {
      cells.push(...Array<RhythmCell>(duration).fill('rest'))
      continue
    }
    cells.push('attack')
    cells.push(...Array<RhythmCell>(duration - 1).fill('hold'))
  }
  if (cells.length !== CELLS_PER_BAR) {
    throw new Error(`Rhythm template must contain ${CELLS_PER_BAR} cells, got ${cells.length}`)
  }
  return cells
}

export function getTemplatesForDifficulty(difficulty: RhythmDifficulty): RhythmTemplate[] {
  return RHYTHM_TEMPLATES.filter((template) => template.difficulty === difficulty)
}

export function getSixteenthMs(bpm: RhythmBpm): number {
  return 60000 / bpm / 4
}

export function getBarDurationMs(bpm: RhythmBpm): number {
  return getSixteenthMs(bpm) * CELLS_PER_BAR
}

export function getCountInDurationMs(bpm: RhythmBpm): number {
  return getBarDurationMs(bpm)
}

export function getAttackIndexes(cells: RhythmGrid): number[] {
  return cells.flatMap((cell, index) => (cell === 'attack' ? [index] : []))
}

export function getTargetTimesMs(cells: RhythmGrid, bpm: RhythmBpm): number[] {
  const sixteenthMs = getSixteenthMs(bpm)
  return getAttackIndexes(cells).map((index) => index * sixteenthMs)
}

export function buildRhythmDemoEvents(cells: RhythmGrid, bpm: RhythmBpm): RhythmDemoEvent[] {
  const sixteenthMs = getSixteenthMs(bpm)
  return cells.map((cell, index) => ({
    index,
    timeMs: index * sixteenthMs,
    attack: cell === 'attack'
  }))
}

export function buildUserReplayEvents(hitTimesMs: number[], bpm: RhythmBpm): RhythmReplayEvent[] {
  const sixteenthMs = getSixteenthMs(bpm)
  return hitTimesMs.map((timeMs) => ({
    timeMs,
    index: Math.max(0, Math.min(15, Math.round(timeMs / sixteenthMs))),
    kind: 'user'
  }))
}

export function buildComparisonEvents(cells: RhythmGrid, bpm: RhythmBpm, hitTimesMs: number[]): RhythmReplayEvent[] {
  const standardEvents = getTargetTimesMs(cells, bpm).map<RhythmReplayEvent>((timeMs) => ({
    timeMs,
    index: Math.max(0, Math.min(15, Math.round(timeMs / getSixteenthMs(bpm)))),
    kind: 'standard'
  }))
  return [...standardEvents, ...buildUserReplayEvents(hitTimesMs, bpm)].sort((left, right) => left.timeMs - right.timeMs)
}

export function getHitToleranceMs(bpm: RhythmBpm): number {
  return Math.max(70, Math.min(120, getSixteenthMs(bpm) * 0.4))
}

function getFeedbackWindowMs(bpm: RhythmBpm): number {
  return Math.max(getHitToleranceMs(bpm), getSixteenthMs(bpm) * 0.75)
}

export function evaluateRhythmHits(cells: RhythmGrid, bpm: RhythmBpm, hitTimesMs: number[]): RhythmEvaluation {
  const targetTimes = getTargetTimesMs(cells, bpm)
  const toleranceMs = getHitToleranceMs(bpm)
  const feedbackWindowMs = getFeedbackWindowMs(bpm)
  const usedHits = new Set<number>()

  const targets = targetTimes.map<RhythmTargetFeedback>((expectedMs, targetIndex) => {
    let bestHitIndex = -1
    let bestDistance = Number.POSITIVE_INFINITY

    hitTimesMs.forEach((actualMs, hitIndex) => {
      if (usedHits.has(hitIndex)) return
      const distance = Math.abs(actualMs - expectedMs)
      if (distance <= feedbackWindowMs && distance < bestDistance) {
        bestDistance = distance
        bestHitIndex = hitIndex
      }
    })

    const gridIndex = getAttackIndexes(cells)[targetIndex]
    if (bestHitIndex === -1) {
      return { index: gridIndex, expectedMs, status: 'missed' }
    }

    usedHits.add(bestHitIndex)
    const actualMs = hitTimesMs[bestHitIndex]
    const offsetMs = actualMs - expectedMs
    const status = Math.abs(offsetMs) <= toleranceMs ? 'hit' : offsetMs < 0 ? 'early' : 'late'
    return { index: gridIndex, expectedMs, actualMs, offsetMs, status }
  })

  const sixteenthMs = getSixteenthMs(bpm)
  const extras = hitTimesMs.flatMap<RhythmExtraHit>((actualMs, hitIndex) => {
    if (usedHits.has(hitIndex)) return []
    return [{ actualMs, index: Math.max(0, Math.min(15, Math.round(actualMs / sixteenthMs))) }]
  })

  const offsets = targets
    .map((target) => target.offsetMs)
    .filter((offset): offset is number => typeof offset === 'number')
  const averageOffsetMs = offsets.length
    ? Math.round(offsets.reduce((sum, offset) => sum + offset, 0) / offsets.length)
    : null
  const correct = targets.every((target) => target.status === 'hit') && extras.length === 0

  return { correct, toleranceMs, averageOffsetMs, targets, extras }
}

export function rhythmToNotationEvents(cells: RhythmGrid): RhythmNotationEvent[] {
  const events: RhythmNotationEvent[] = []
  for (let index = 0; index < cells.length; ) {
    const cell = cells[index]
    let durationCells = 1
    while (index + durationCells < cells.length && cells[index + durationCells] === (cell === 'rest' ? 'rest' : 'hold')) {
      durationCells += 1
    }

    if (cell === 'rest' && ![1, 2, 3, 4].includes(durationCells)) {
      let remaining = durationCells
      let start = index
      for (const chunk of [4, 2, 1] as const) {
        while (remaining >= chunk) {
          events.push({ kind: 'rest', start, durationCells: chunk })
          start += chunk
          remaining -= chunk
        }
      }
      index += durationCells
      continue
    }

    if (![1, 2, 3, 4].includes(durationCells)) {
      throw new Error(`Unsupported rhythm duration: ${durationCells}`)
    }

    events.push({
      kind: cell === 'rest' ? 'rest' : 'note',
      start: index,
      durationCells: durationCells as 1 | 2 | 3 | 4
    })
    index += durationCells
  }
  return events
}
