export type RhythmCell = 'attack' | 'hold' | 'rest'
export type RhythmGrid = readonly RhythmCell[]
export type RhythmDifficulty = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type RhythmBpm = 60 | 80 | 100
export type RhythmMeter = '2/4' | '3/4' | '4/4'
export type RhythmNotation = 'jianpu' | 'staff'
export type RhythmMetronomeMode = 'full' | 'count-in'

export type RhythmMetronomeEvent = {
  timeMs: number
  strong: boolean
  phase: 'count-in' | 'practice'
}

export type RhythmTemplate = {
  id: string
  difficulty: RhythmDifficulty
  meter: RhythmMeter
  label: string
  description: string
  cells: RhythmGrid
  patternIds: readonly string[]
  ties: readonly RhythmTie[]
}

export type RhythmTie = {
  id: string
  boundaryKind: 'beat' | 'measure'
  startTick: number
  boundaryTick: number
  endTick: number
  leftDurationTicks: 3 | 6
  rightDurationTicks: 3 | 6
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
  durationTicks: number
  tuplet?: 3
}

export type RhythmRenderEvent = RhythmNotationEvent & {
  sourceStart: number
  tieStart: boolean
  tieEnd: boolean
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

type RhythmUnit = {
  kind: 'note' | 'rest'
  durationTicks: number
  label: string
  difficulty: RhythmDifficulty
  tuplet?: 3
}

const TICKS_PER_QUARTER = 12
const BARS_PER_QUESTION = 4

export const RHYTHM_BPM_OPTIONS: RhythmBpm[] = [60, 80, 100]
export const RHYTHM_METERS: RhythmMeter[] = ['2/4', '3/4', '4/4']
export const RHYTHM_DIFFICULTIES: RhythmDifficulty[] = [1, 2, 3, 4, 5, 6, 7, 8, 9]

export const RHYTHM_DIFFICULTY_DESCRIPTIONS: Record<RhythmDifficulty, string> = {
  1: '四分音符与四分休止符',
  2: '二八节奏，可混入四分音符与休止符',
  3: '四十六节奏，可混入之前节奏',
  4: '前八后十六、前十六后八，可混入之前节奏',
  5: '前附点、后附点，可混入之前节奏',
  6: '小切分，可混入之前节奏',
  7: '三连音，可混入之前节奏',
  8: '大切分，可混入之前节奏',
  9: '延音线训练，可混入之前节奏'
}

const UNITS: RhythmUnit[] = [
  { kind: 'note', durationTicks: 12, label: '四分音符', difficulty: 1 },
  { kind: 'rest', durationTicks: 12, label: '四分休止', difficulty: 1 },
  { kind: 'note', durationTicks: 6, label: '八分音符', difficulty: 2 },
  { kind: 'rest', durationTicks: 6, label: '八分休止', difficulty: 2 },
  { kind: 'note', durationTicks: 3, label: '十六分音符', difficulty: 3 },
  { kind: 'rest', durationTicks: 3, label: '十六分休止', difficulty: 3 },
  { kind: 'note', durationTicks: 9, label: '附点八分', difficulty: 5 },
  { kind: 'note', durationTicks: 4, label: '三连音', difficulty: 7, tuplet: 3 }
]

type RhythmPattern = { id: string; difficulty: RhythmDifficulty; label: string; units: RhythmUnit[] }

const PATTERN_LIBRARY: RhythmPattern[] = [
  { id: 'quarter-note', difficulty: 1, label: '四分音符', units: [unit('四分音符')] },
  { id: 'quarter-rest', difficulty: 1, label: '四分休止', units: [unit('四分休止')] },
  { id: 'two-eighths', difficulty: 2, label: '二八节奏', units: [unit('八分音符'), unit('八分音符')] },
  { id: 'four-sixteenths', difficulty: 3, label: '四十六节奏', units: [unit('十六分音符'), unit('十六分音符'), unit('十六分音符'), unit('十六分音符')] },
  { id: 'eighth-two-sixteenths', difficulty: 4, label: '前八后十六', units: [unit('八分音符'), unit('十六分音符'), unit('十六分音符')] },
  { id: 'two-sixteenths-eighth', difficulty: 4, label: '前十六后八', units: [unit('十六分音符'), unit('十六分音符'), unit('八分音符')] },
  { id: 'front-dotted', difficulty: 5, label: '前附点', units: [unit('附点八分'), unit('十六分音符')] },
  { id: 'back-dotted', difficulty: 5, label: '后附点', units: [unit('十六分音符'), unit('附点八分')] },
  { id: 'small-syncopation', difficulty: 6, label: '小切分', units: [unit('十六分音符'), unit('八分音符'), unit('十六分音符')] },
  { id: 'eighth-triplet', difficulty: 7, label: '三连音', units: [unit('三连音'), unit('三连音'), unit('三连音')] },
  { id: 'large-syncopation', difficulty: 8, label: '大切分', units: [unit('八分音符'), unit('四分音符'), unit('八分音符')] }
]

const FOCUS_PATTERN_IDS: Record<RhythmDifficulty, readonly string[]> = {
  1: ['quarter-note'],
  2: ['two-eighths'],
  3: ['four-sixteenths'],
  4: ['eighth-two-sixteenths', 'two-sixteenths-eighth'],
  5: ['front-dotted', 'back-dotted'],
  6: ['small-syncopation'],
  7: ['eighth-triplet'],
  8: ['large-syncopation'],
  9: []
}

export function getTicksPerBeat(): number {
  return TICKS_PER_QUARTER
}

export function getBeatsPerBar(meter: RhythmMeter): 2 | 3 | 4 {
  return Number(meter.split('/')[0]) as 2 | 3 | 4
}

export function getTicksPerBar(meter: RhythmMeter): number {
  return getBeatsPerBar(meter) * TICKS_PER_QUARTER
}

export function getTotalTicks(meter: RhythmMeter): number {
  return getTicksPerBar(meter) * BARS_PER_QUESTION
}

export function getTemplatesForDifficulty(difficulty: RhythmDifficulty, meter: RhythmMeter = '4/4'): RhythmTemplate[] {
  return Array.from({ length: 8 }, (_, index) => buildRhythmTemplate(difficulty, meter, index))
}

export function buildRhythmTemplate(difficulty: RhythmDifficulty, meter: RhythmMeter, variant = 0): RhythmTemplate {
  const { cells, patternIds, ties } = difficulty === 9
    ? buildTieTrainingCells(meter, variant)
    : { ...buildCellsForDifficulty(difficulty, meter, variant), ties: [] }
  const label = difficulty === 7 ? '三连音' : RHYTHM_DIFFICULTY_DESCRIPTIONS[difficulty].split('，')[0]
  return {
    id: `${meter}-${difficulty}-${variant}-${cells.join('')}`,
    difficulty,
    meter,
    label,
    description: `${meter} · 四小节 · ${RHYTHM_DIFFICULTY_DESCRIPTIONS[difficulty]}`,
    cells,
    patternIds,
    ties
  }
}

export function cellsFromEvents(events: Array<['note' | 'rest', number]>): RhythmCell[] {
  const cells: RhythmCell[] = []
  for (const [kind, duration] of events) {
    if (kind === 'rest') {
      cells.push(...Array<RhythmCell>(duration).fill('rest'))
    } else {
      cells.push('attack')
      cells.push(...Array<RhythmCell>(Math.max(0, duration - 1)).fill('hold'))
    }
  }
  return cells
}

export function getTickMs(bpm: RhythmBpm): number {
  return 60000 / bpm / TICKS_PER_QUARTER
}

export function getSixteenthMs(bpm: RhythmBpm): number {
  return getTickMs(bpm) * 3
}

export function getBarDurationMs(bpm: RhythmBpm, meter: RhythmMeter = '4/4'): number {
  return getTickMs(bpm) * getTicksPerBar(meter)
}

export function getRhythmDurationMs(bpm: RhythmBpm, meter: RhythmMeter = '4/4'): number {
  return getTickMs(bpm) * getTotalTicks(meter)
}

export function getCountInDurationMs(bpm: RhythmBpm, meter: RhythmMeter = '4/4'): number {
  return getBarDurationMs(bpm, meter)
}

export function buildPracticeMetronomeEvents(
  bpm: RhythmBpm,
  meter: RhythmMeter,
  mode: RhythmMetronomeMode
): RhythmMetronomeEvent[] {
  const beatsPerBar = getBeatsPerBar(meter)
  const beatMs = 60000 / bpm
  const countIn = Array.from({ length: beatsPerBar }, (_, beat) => ({
    timeMs: beat * beatMs,
    strong: beat === 0,
    phase: 'count-in' as const
  }))
  if (mode === 'count-in') return countIn

  const practiceStartMs = beatsPerBar * beatMs
  const practice = Array.from({ length: beatsPerBar * BARS_PER_QUESTION }, (_, beat) => ({
    timeMs: practiceStartMs + beat * beatMs,
    strong: beat % beatsPerBar === 0,
    phase: 'practice' as const
  }))
  return [...countIn, ...practice]
}

export function getAttackIndexes(cells: RhythmGrid): number[] {
  return cells.flatMap((cell, index) => (cell === 'attack' ? [index] : []))
}

export function getTargetTimesMs(cells: RhythmGrid, bpm: RhythmBpm): number[] {
  const tickMs = getTickMs(bpm)
  return getAttackIndexes(cells).map((index) => index * tickMs)
}

export function buildRhythmDemoEvents(cells: RhythmGrid, bpm: RhythmBpm): RhythmDemoEvent[] {
  const tickMs = getTickMs(bpm)
  return cells.map((cell, index) => ({
    index,
    timeMs: index * tickMs,
    attack: cell === 'attack'
  }))
}

export function buildUserReplayEvents(hitTimesMs: number[], bpm: RhythmBpm, totalTicks = Number.POSITIVE_INFINITY): RhythmReplayEvent[] {
  const tickMs = getTickMs(bpm)
  const maxIndex = Number.isFinite(totalTicks) ? Math.max(0, totalTicks - 1) : Number.MAX_SAFE_INTEGER
  return hitTimesMs.map((timeMs) => ({
    timeMs,
    index: Math.max(0, Math.min(maxIndex, Math.round(timeMs / tickMs))),
    kind: 'user'
  }))
}

export function buildComparisonEvents(cells: RhythmGrid, bpm: RhythmBpm, hitTimesMs: number[]): RhythmReplayEvent[] {
  const tickMs = getTickMs(bpm)
  const standardEvents = getTargetTimesMs(cells, bpm).map<RhythmReplayEvent>((timeMs) => ({
    timeMs,
    index: Math.max(0, Math.min(cells.length - 1, Math.round(timeMs / tickMs))),
    kind: 'standard'
  }))
  return [...standardEvents, ...buildUserReplayEvents(hitTimesMs, bpm, cells.length)].sort((left, right) => left.timeMs - right.timeMs)
}

export function getHitToleranceMs(bpm: RhythmBpm): number {
  return Math.max(70, Math.min(120, getTickMs(bpm) * 2.4))
}

function getFeedbackWindowMs(bpm: RhythmBpm): number {
  return Math.max(getHitToleranceMs(bpm), getTickMs(bpm) * 4.5)
}

export function evaluateRhythmHits(cells: RhythmGrid, bpm: RhythmBpm, hitTimesMs: number[]): RhythmEvaluation {
  const targetTimes = getTargetTimesMs(cells, bpm)
  const attackIndexes = getAttackIndexes(cells)
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

    const gridIndex = attackIndexes[targetIndex]
    if (bestHitIndex === -1) {
      return { index: gridIndex, expectedMs, status: 'missed' }
    }

    usedHits.add(bestHitIndex)
    const actualMs = hitTimesMs[bestHitIndex]
    const offsetMs = actualMs - expectedMs
    const status = Math.abs(offsetMs) <= toleranceMs ? 'hit' : offsetMs < 0 ? 'early' : 'late'
    return { index: gridIndex, expectedMs, actualMs, offsetMs, status }
  })

  const tickMs = getTickMs(bpm)
  const extras = hitTimesMs.flatMap<RhythmExtraHit>((actualMs, hitIndex) => {
    if (usedHits.has(hitIndex)) return []
    return [{ actualMs, index: Math.max(0, Math.min(cells.length - 1, Math.round(actualMs / tickMs))) }]
  })

  const offsets = targets.map((target) => target.offsetMs).filter((offset): offset is number => typeof offset === 'number')
  const averageOffsetMs = offsets.length ? Math.round(offsets.reduce((sum, offset) => sum + offset, 0) / offsets.length) : null
  const correct = targets.every((target) => target.status === 'hit') && extras.length === 0
  return { correct, toleranceMs, averageOffsetMs, targets, extras }
}

export function rhythmToNotationEvents(cells: RhythmGrid): RhythmNotationEvent[] {
  const events: RhythmNotationEvent[] = []
  for (let index = 0; index < cells.length;) {
    const cell = cells[index]
    let durationTicks = 1
    while (index + durationTicks < cells.length && cells[index + durationTicks] === (cell === 'rest' ? 'rest' : 'hold')) {
      durationTicks += 1
    }
    events.push({
      kind: cell === 'rest' ? 'rest' : 'note',
      start: index,
      durationTicks,
      tuplet: durationTicks === 4 ? 3 : undefined
    })
    index += durationTicks
  }
  return events
}

export function splitRhythmEventsAtBeatBoundaries(
  events: RhythmNotationEvent[],
  ticksPerBeat = TICKS_PER_QUARTER
): RhythmRenderEvent[] {
  return events.flatMap((event) => {
    const eventEnd = event.start + event.durationTicks
    const boundaries: number[] = []
    for (let boundary = (Math.floor(event.start / ticksPerBeat) + 1) * ticksPerBeat; boundary < eventEnd; boundary += ticksPerBeat) {
      boundaries.push(boundary)
    }
    const points = [event.start, ...boundaries, eventEnd]
    const beatPieces = points.slice(0, -1).map((start, index) => ({
      ...event,
      start,
      durationTicks: points[index + 1] - start,
      sourceStart: event.start,
      tieStart: event.kind === 'note' && index < points.length - 2,
      tieEnd: event.kind === 'note' && index > 0
    }))
    return beatPieces.flatMap(splitRestRenderEvent)
  })
}

function splitRestRenderEvent(event: RhythmRenderEvent): RhythmRenderEvent[] {
  if (event.kind !== 'rest') return [event]
  const result: RhythmRenderEvent[] = []
  let start = event.start
  let remaining = event.durationTicks
  for (const durationTicks of [12, 6, 3]) {
    while (remaining >= durationTicks) {
      result.push({ ...event, start, durationTicks })
      start += durationTicks
      remaining -= durationTicks
    }
  }
  if (remaining > 0) result.push({ ...event, start, durationTicks: remaining })
  return result
}

function unit(label: string): RhythmUnit {
  const found = UNITS.find((candidate) => candidate.label === label)
  if (!found) throw new Error(`Unknown rhythm unit: ${label}`)
  return found
}

function buildCellsForDifficulty(
  difficulty: RhythmDifficulty,
  meter: RhythmMeter,
  variant: number
): { cells: RhythmCell[]; patternIds: string[] } {
  const ticksPerBar = getTicksPerBar(meter)
  const totalTicks = getTotalTicks(meter)
  const cells: RhythmCell[] = []
  const allowedPatterns = PATTERN_LIBRARY.filter((pattern) => pattern.difficulty <= difficulty)
  const focusPatterns = FOCUS_PATTERN_IDS[difficulty].map(findPattern)
  const patternIds: string[] = []
  let cursor = 0
  let restInserted = false

  while (cursor < totalTicks) {
    const barIndex = Math.floor(cursor / ticksPerBar)
    const tickInBar = cursor % ticksPerBar
    const barRemaining = ticksPerBar - (cursor % ticksPerBar)
    const candidates = allowedPatterns.filter((pattern) => patternDuration(pattern.units) <= barRemaining)
    if (candidates.length === 0) {
      appendUnit(cells, { kind: 'rest', durationTicks: barRemaining, label: '补齐休止', difficulty: 1 })
      restInserted = true
      cursor += barRemaining
      continue
    }

    // The first three bars explicitly practise the selected level. The last bar
    // stays available for cumulative material and the required rest.
    const focusPattern = tickInBar === 0 && barIndex < BARS_PER_QUESTION - 1
      ? focusPatterns[(barIndex + variant) % focusPatterns.length]
      : null
    const fittingFocusPattern = focusPattern && patternDuration(focusPattern.units) <= barRemaining
      ? focusPattern
      : null
    const needRest = !restInserted && barIndex === BARS_PER_QUESTION - 1
    const restPattern = candidates.find((pattern) => pattern.units.every((rhythmUnit) => rhythmUnit.kind === 'rest'))
    const pattern: RhythmPattern = fittingFocusPattern ?? (needRest && restPattern
      ? restPattern
      : candidates[Math.floor(variant * 5 + cursor / TICKS_PER_QUARTER + difficulty) % candidates.length])
    const units: RhythmUnit[] = pattern.units
    patternIds.push(pattern.id)
    for (const rhythmUnit of units) {
      appendUnit(cells, rhythmUnit)
      restInserted ||= rhythmUnit.kind === 'rest'
      cursor += rhythmUnit.durationTicks
    }
  }

  const trimmed = cells.slice(0, totalTicks)
  if (!trimmed.includes('attack')) {
    trimmed[0] = 'attack'
    for (let index = 1; index < Math.min(TICKS_PER_QUARTER, trimmed.length); index += 1) {
      trimmed[index] = 'hold'
    }
  }
  return { cells: trimmed, patternIds }
}

function buildTieTrainingCells(
  meter: RhythmMeter,
  variant: number
): { cells: RhythmCell[]; patternIds: string[]; ties: RhythmTie[] } {
  const base = buildCellsForDifficulty(8, meter, variant)
  const cells = [...base.cells]
  const ticksPerBar = getTicksPerBar(meter)
  const totalTicks = getTotalTicks(meter)
  const tieCount = 2 + (variant % 3)
  const measureBoundaries = Array.from({ length: BARS_PER_QUESTION - 1 }, (_, index) => (index + 1) * ticksPerBar)
  const beatBoundaries = Array.from(
    { length: totalTicks / TICKS_PER_QUARTER - 1 },
    (_, index) => (index + 1) * TICKS_PER_QUARTER
  ).filter((boundary) => boundary % ticksPerBar !== 0)
  const ties: RhythmTie[] = []

  addFirstAvailableTie(ties, rotate(measureBoundaries, variant), 'measure', variant)
  addFirstAvailableTie(ties, rotate(beatBoundaries, variant * 2 + 1), 'beat', variant + 1)

  const extraCandidates = rotate([
    ...measureBoundaries.map((boundary) => ({ boundary, kind: 'measure' as const })),
    ...beatBoundaries.map((boundary) => ({ boundary, kind: 'beat' as const }))
  ], variant * 3 + 1)
  for (let index = 0; index < extraCandidates.length && ties.length < tieCount; index += 1) {
    const candidate = extraCandidates[index]
    const tie = createTie(candidate.boundary, candidate.kind, variant + index + ties.length)
    if (isTieSeparated(tie, ties)) ties.push(tie)
  }

  if (!ties.some((tie) => tie.boundaryKind === 'beat') || !ties.some((tie) => tie.boundaryKind === 'measure')) {
    throw new Error('Unable to generate required tie boundaries')
  }

  rewriteTieBeats(cells, ties)
  ensureRestOutsideTies(cells, ties)

  return {
    cells,
    patternIds: [...base.patternIds, ...ties.map((tie) => `tie-across-${tie.boundaryKind}`)],
    ties
  }
}

function rewriteTieBeats(cells: RhythmCell[], ties: RhythmTie[]): void {
  const affectedBeatStarts = new Set<number>()
  for (const tie of ties) {
    const firstBeat = Math.floor(tie.startTick / TICKS_PER_QUARTER) * TICKS_PER_QUARTER
    const lastBeat = Math.floor((tie.endTick - 1) / TICKS_PER_QUARTER) * TICKS_PER_QUARTER
    for (let beatStart = firstBeat; beatStart <= lastBeat; beatStart += TICKS_PER_QUARTER) {
      affectedBeatStarts.add(beatStart)
    }
  }

  for (const beatStart of affectedBeatStarts) {
    const beatEnd = beatStart + TICKS_PER_QUARTER
    const rewritten: Array<RhythmCell | null> = Array.from({ length: TICKS_PER_QUARTER }, () => null)
    for (const tie of ties) {
      const start = Math.max(beatStart, tie.startTick)
      const end = Math.min(beatEnd, tie.endTick)
      if (start >= end) continue
      for (let tick = start; tick < end; tick += 1) rewritten[tick - beatStart] = 'hold'
      if (tie.startTick >= beatStart && tie.startTick < beatEnd) rewritten[tie.startTick - beatStart] = 'attack'
    }

    for (let index = 0; index < rewritten.length;) {
      if (rewritten[index] !== null) {
        index += 1
        continue
      }
      let gapEnd = index
      while (gapEnd < rewritten.length && rewritten[gapEnd] === null) gapEnd += 1
      let cursor = index
      let remaining = gapEnd - index
      for (const duration of [9, 6, 3]) {
        while (remaining >= duration) {
          rewritten[cursor] = 'attack'
          for (let offset = 1; offset < duration; offset += 1) rewritten[cursor + offset] = 'hold'
          cursor += duration
          remaining -= duration
        }
      }
      if (remaining !== 0) throw new Error('Unable to fill rewritten tie beat')
      index = gapEnd
    }
    cells.splice(beatStart, TICKS_PER_QUARTER, ...(rewritten as RhythmCell[]))
    const tieCrossesBeatEnd = ties.some((tie) => tie.startTick < beatEnd && tie.endTick > beatEnd)
    if (!tieCrossesBeatEnd && beatEnd < cells.length && cells[beatEnd] === 'hold') cells[beatEnd] = 'attack'
  }
}

function addFirstAvailableTie(
  ties: RhythmTie[],
  boundaries: number[],
  kind: RhythmTie['boundaryKind'],
  seed: number
): void {
  for (let index = 0; index < boundaries.length; index += 1) {
    const tie = createTie(boundaries[index], kind, seed + index)
    if (!isTieSeparated(tie, ties)) continue
    ties.push(tie)
    return
  }
}

function createTie(boundaryTick: number, boundaryKind: RhythmTie['boundaryKind'], seed: number): RhythmTie {
  const leftDurationTicks = (seed % 2 === 0 ? 6 : 3) as 3 | 6
  const rightDurationTicks = (Math.floor(seed / 2) % 2 === 0 ? 6 : 3) as 3 | 6
  return {
    id: `tie-${boundaryKind}-${boundaryTick}-${leftDurationTicks}-${rightDurationTicks}`,
    boundaryKind,
    startTick: boundaryTick - leftDurationTicks,
    boundaryTick,
    endTick: boundaryTick + rightDurationTicks,
    leftDurationTicks,
    rightDurationTicks
  }
}

function isTieSeparated(candidate: RhythmTie, ties: RhythmTie[]): boolean {
  return ties.every((tie) => candidate.endTick < tie.startTick || candidate.startTick > tie.endTick)
}

function ensureRestOutsideTies(cells: RhythmCell[], ties: RhythmTie[]): void {
  if (cells.includes('rest')) return
  for (let start = 0; start <= cells.length - TICKS_PER_QUARTER; start += TICKS_PER_QUARTER) {
    const end = start + TICKS_PER_QUARTER
    if (ties.some((tie) => start < tie.endTick && end > tie.startTick)) continue
    cells.fill('rest', start, end)
    return
  }
  throw new Error('Unable to reserve a rest outside ties')
}

function rotate<T>(values: T[], offset: number): T[] {
  if (values.length === 0) return []
  const index = ((offset % values.length) + values.length) % values.length
  return [...values.slice(index), ...values.slice(0, index)]
}

function findPattern(id: string): RhythmPattern {
  const pattern = PATTERN_LIBRARY.find((candidate) => candidate.id === id)
  if (!pattern) throw new Error(`Unknown rhythm pattern: ${id}`)
  return pattern
}

function appendUnit(cells: RhythmCell[], rhythmUnit: RhythmUnit): void {
  if (rhythmUnit.kind === 'rest') {
    cells.push(...Array<RhythmCell>(rhythmUnit.durationTicks).fill('rest'))
    return
  }
  cells.push('attack')
  cells.push(...Array<RhythmCell>(rhythmUnit.durationTicks - 1).fill('hold'))
}

function patternDuration(units: RhythmUnit[]): number {
  return units.reduce((sum, rhythmUnit) => sum + rhythmUnit.durationTicks, 0)
}
