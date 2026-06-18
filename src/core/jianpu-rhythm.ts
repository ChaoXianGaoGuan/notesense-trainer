import {
  getBeatsPerBar,
  getTicksPerBar,
  getTicksPerBeat,
  rhythmToNotationEvents,
  splitRhythmEventsAtBeatBoundaries,
  type RhythmEvaluation,
  type RhythmGrid,
  type RhythmMeter
} from './rhythm'

export type JianpuGlyphState = '' | 'active' | 'hit' | 'early' | 'late' | 'missed' | 'extra'

export type JianpuRhythmGlyph = {
  id: string
  kind: 'note' | 'rest'
  startTick: number
  durationTicks: number
  x: number
  y: number
  width: number
  underlineLevel: 0 | 1 | 2
  dotted: boolean
  tuplet?: 3
  sourceStartTick: number
  tieStart: boolean
  tieEnd: boolean
  state: JianpuGlyphState
}

export type JianpuTie = {
  id: string
  x1: number
  x2: number
  y: number
  controlY: number
}

export type JianpuTuplet = {
  id: string
  x1: number
  x2: number
  y: number
  controlY: number
  labelX: number
  labelY: number
}

export type JianpuUnderlineSegment = {
  id: string
  level: 1 | 2
  x1: number
  x2: number
  y: number
}

export type JianpuGuideLine = {
  id: string
  x: number
  y1: number
  y2: number
  kind: 'bar' | 'beat'
}

export type JianpuMeasureLabel = {
  id: string
  text: string
  x: number
  y: number
}

export type JianpuRhythmLayout = {
  width: number
  height: number
  noteFontSize: number
  glyphs: JianpuRhythmGlyph[]
  underlines: JianpuUnderlineSegment[]
  ties: JianpuTie[]
  tuplets: JianpuTuplet[]
  guideLines: JianpuGuideLine[]
  measureLabels: JianpuMeasureLabel[]
}

type LayoutOptions = {
  measuresPerRow: 1 | 2 | 4
}

export function getJianpuMeasuresPerRow(options: {
  viewportWidth: number
}): 1 | 2 | 4 {
  if (options.viewportWidth <= 560) return 1
  if (options.viewportWidth <= 900) return 2
  return 4
}

type BeatGroup = {
  measureIndex: number
  beatIndex: number
  glyphs: JianpuRhythmGlyph[]
}

const BARS_PER_QUESTION = 4
const ROW_GAP = 28
const ROW_HEIGHT = 138
const TOP = 18
const LEFT = 28
const RIGHT = 28
const NOTE_Y_OFFSET = 78
const BAR_TOP_OFFSET = 18
const BAR_BOTTOM_OFFSET = 118
const UNDERLINE_START_OFFSET = 24
const UNDERLINE_GAP = 7
const HIGHLIGHT_WIDTH = 28
const BEAT_WIDTH = 112

export function layoutJianpuRhythm(
  cells: RhythmGrid,
  meter: RhythmMeter,
  evaluation: RhythmEvaluation | null,
  active: { standard: number | null; user: number | null },
  options: LayoutOptions
): JianpuRhythmLayout {
  const beatsPerBar = getBeatsPerBar(meter)
  const ticksPerBar = getTicksPerBar(meter)
  const ticksPerBeat = getTicksPerBeat()
  const rows = Math.ceil(BARS_PER_QUESTION / options.measuresPerRow)
  const measureWidth = beatsPerBar * BEAT_WIDTH
  const width = LEFT + RIGHT + measureWidth * options.measuresPerRow
  const height = TOP + rows * ROW_HEIGHT + (rows - 1) * ROW_GAP
  const glyphs: JianpuRhythmGlyph[] = []
  const guideLines: JianpuGuideLine[] = []
  const measureLabels: JianpuMeasureLabel[] = []

  for (let measureIndex = 0; measureIndex < BARS_PER_QUESTION; measureIndex += 1) {
    const row = Math.floor(measureIndex / options.measuresPerRow)
    const column = measureIndex % options.measuresPerRow
    const measureX = LEFT + column * measureWidth
    const rowY = TOP + row * (ROW_HEIGHT + ROW_GAP)
    const noteY = rowY + NOTE_Y_OFFSET
    const measureStartTick = measureIndex * ticksPerBar
    const measureCells = cells.slice(measureStartTick, measureStartTick + ticksPerBar)
    const events = splitRhythmEventsAtBeatBoundaries(rhythmToNotationEvents(measureCells), ticksPerBeat)
    const beatWidth = measureWidth / beatsPerBar

    guideLines.push({
      id: `bar-${measureIndex}`,
      kind: 'bar',
      x: measureX,
      y1: rowY + BAR_TOP_OFFSET,
      y2: rowY + BAR_BOTTOM_OFFSET
    })
    if (column === options.measuresPerRow - 1 || measureIndex === BARS_PER_QUESTION - 1) {
      guideLines.push({
        id: `bar-end-${measureIndex}`,
        kind: 'bar',
        x: measureX + measureWidth,
        y1: rowY + BAR_TOP_OFFSET,
        y2: rowY + BAR_BOTTOM_OFFSET
      })
    }
    measureLabels.push({ id: `measure-${measureIndex}`, text: String(measureIndex + 1), x: measureX + 12, y: rowY + 36 })

    for (let beatIndex = 1; beatIndex < beatsPerBar; beatIndex += 1) {
      guideLines.push({
        id: `beat-${measureIndex}-${beatIndex}`,
        kind: 'beat',
        x: measureX + beatIndex * beatWidth,
        y1: rowY + BAR_TOP_OFFSET + 12,
        y2: rowY + BAR_BOTTOM_OFFSET - 10
      })
    }

    const eventsByBeat = Array.from({ length: beatsPerBar }, (_, beatIndex) => ({
      beatIndex,
      events: events.filter((event) => Math.floor(event.start / ticksPerBeat) === beatIndex)
    }))

    for (const beat of eventsByBeat) {
      const beatStartX = measureX + beat.beatIndex * beatWidth
      const centers = distributeCenters(beatStartX, beatWidth, beat.events.length)
      beat.events.forEach((event, eventIndex) => {
        const absoluteStart = measureStartTick + event.start
        glyphs.push({
          id: `${measureIndex}-${event.start}-${event.kind}`,
          kind: event.kind,
          startTick: absoluteStart,
          durationTicks: event.durationTicks,
          x: centers[eventIndex],
          y: noteY,
          width: HIGHLIGHT_WIDTH,
          underlineLevel: getUnderlineLevel(event.durationTicks),
          dotted: event.durationTicks === 9,
          tuplet: event.tuplet,
          sourceStartTick: measureStartTick + event.sourceStart,
          tieStart: event.tieStart,
          tieEnd: event.tieEnd,
          state: getGlyphState(absoluteStart, event.durationTicks, event.kind, evaluation, active)
        })
      })
    }
  }

  const beatGroups = groupGlyphsByBeat(glyphs, meter)
  return {
    width,
    height,
    noteFontSize: options.measuresPerRow === 1 ? 28 : options.measuresPerRow === 2 ? 26 : 24,
    glyphs,
    underlines: buildUnderlineSegments(beatGroups, options.measuresPerRow),
    ties: buildTies(glyphs),
    tuplets: buildTuplets(beatGroups),
    guideLines,
    measureLabels
  }
}

function distributeCenters(startX: number, beatWidth: number, count: number): number[] {
  if (count === 0) return []
  const slot = beatWidth / count
  return Array.from({ length: count }, (_, index) => startX + slot * (index + 0.5))
}

function buildTies(glyphs: JianpuRhythmGlyph[]): JianpuTie[] {
  const groups = new Map<number, JianpuRhythmGlyph[]>()
  for (const glyph of glyphs) {
    if (!glyph.tieStart && !glyph.tieEnd) continue
    const group = groups.get(glyph.sourceStartTick) ?? []
    group.push(glyph)
    groups.set(glyph.sourceStartTick, group)
  }

  return [...groups.entries()].flatMap(([sourceStartTick, group]) => {
    const parts = group.sort((left, right) => left.startTick - right.startTick)
    return parts.slice(0, -1).flatMap((left, index) => {
      const right = parts[index + 1]
      if (!left.tieStart || !right.tieEnd || left.y !== right.y) return []
      return [{
        id: `tie-${sourceStartTick}-${index}`,
        x1: left.x + 10,
        x2: right.x - 10,
        y: left.y - 18,
        controlY: left.y - 34
      }]
    })
  })
}

function buildTuplets(groups: BeatGroup[]): JianpuTuplet[] {
  return groups.flatMap((group) => {
    const glyphs = group.glyphs.filter((glyph) => glyph.tuplet === 3)
    if (glyphs.length !== 3) return []
    const first = glyphs[0]
    const last = glyphs[2]
    const labelX = (first.x + last.x) / 2
    return [{
      id: `tuplet-${group.measureIndex}-${group.beatIndex}`,
      x1: first.x - 10,
      x2: last.x + 10,
      y: first.y - 24,
      controlY: first.y - 43,
      labelX,
      labelY: first.y - 35
    }]
  })
}

function getUnderlineLevel(durationTicks: number): 0 | 1 | 2 {
  if (durationTicks <= 3) return 2
  if (durationTicks <= 9) return 1
  return 0
}

function getGlyphState(
  startTick: number,
  durationTicks: number,
  kind: 'note' | 'rest',
  evaluation: RhythmEvaluation | null,
  active: { standard: number | null; user: number | null }
): JianpuGlyphState {
  const containsActive = [active.standard, active.user].some((tick) => tick !== null && tick >= startTick && tick < startTick + durationTicks)
  if (containsActive) return 'active'
  const target = kind === 'note' ? evaluation?.targets.find((candidate) => candidate.index === startTick) : null
  if (target) return target.status
  if (evaluation?.extras.some((candidate) => candidate.index >= startTick && candidate.index < startTick + durationTicks)) return 'extra'
  return ''
}

function groupGlyphsByBeat(glyphs: JianpuRhythmGlyph[], meter: RhythmMeter): BeatGroup[] {
  const ticksPerBar = getTicksPerBar(meter)
  const ticksPerBeat = getTicksPerBeat()
  const groups = new Map<string, BeatGroup>()
  for (const glyph of glyphs) {
    const measureIndex = Math.floor(glyph.startTick / ticksPerBar)
    const beatIndex = Math.floor((glyph.startTick - measureIndex * ticksPerBar) / ticksPerBeat)
    const key = `${measureIndex}-${beatIndex}`
    const group = groups.get(key) ?? { measureIndex, beatIndex, glyphs: [] }
    group.glyphs.push(glyph)
    groups.set(key, group)
  }
  return [...groups.values()].map((group) => ({
    ...group,
    glyphs: group.glyphs.sort((left, right) => left.startTick - right.startTick)
  }))
}

function buildUnderlineSegments(groups: BeatGroup[], measuresPerRow: 1 | 2 | 4): JianpuUnderlineSegment[] {
  return groups.flatMap((group) => {
    const segments: JianpuUnderlineSegment[] = []
    for (const level of [1, 2] as const) {
      let run: JianpuRhythmGlyph[] = []
      for (const glyph of group.glyphs) {
        if (glyph.kind === 'note' && glyph.underlineLevel >= level) {
          run.push(glyph)
        } else {
          segments.push(...createUnderlineRunSegments(run, level, group, measuresPerRow))
          run = []
          if (glyph.kind === 'rest' && glyph.underlineLevel >= level) {
            segments.push(...createUnderlineRunSegments([glyph], level, group, measuresPerRow))
          }
        }
      }
      segments.push(...createUnderlineRunSegments(run, level, group, measuresPerRow))
    }
    return segments
  })
}

function createUnderlineRunSegments(run: JianpuRhythmGlyph[], level: 1 | 2, group: BeatGroup, measuresPerRow: 1 | 2 | 4): JianpuUnderlineSegment[] {
  if (run.length === 0) return []
  const first = run[0]
  const last = run[run.length - 1]
  return [{
    id: `underline-${measuresPerRow}-${group.measureIndex}-${group.beatIndex}-${level}-${first.startTick}`,
    level,
    x1: first.x - 13,
    x2: last.x + 13,
    y: first.y + UNDERLINE_START_OFFSET + (level - 1) * UNDERLINE_GAP
  }]
}
