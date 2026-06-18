import { buildDegreeChord, buildMajorScale, findMajorKeysForTriad } from '../core/major-keys'
import { getJianpuMeasuresPerRow, layoutJianpuRhythm } from '../core/jianpu-rhythm'
import { getNaturalNoteFromPitch } from '../core/notes'
import {
  buildRelativePitchPatterns,
  evaluateRelativePitchAnswer,
  relativePitchPatternLabel,
  relativePitchPatternToNotes
} from '../core/relative-pitch'
import { framesToStableEvents } from '../audio/input-analyzer'
import {
  buildComparisonEvents,
  buildPracticeMetronomeEvents,
  buildRhythmDemoEvents,
  buildUserReplayEvents,
  cellsFromEvents,
  evaluateRhythmHits,
  getTicksPerBar,
  getTargetTimesMs,
  getTemplatesForDifficulty,
  getTotalTicks,
  rhythmToNotationEvents
} from '../core/rhythm'
import { DEFAULT_PREFERENCES, normalizePreferences, type AppPreferences } from '../state/defaults'
import { recordAnswer, resetStats } from '../state/stats'
import { addReviewItems, getReviewQueue } from '../state/review'
import { generateChordQuestion, chordQualitiesForStage } from './chord-quality'
import { checkDegreeChordAnswer } from './degree-chord'
import {
  INTERVAL_SPEED_OPTIONS,
  generateIntervalQuestion,
  getIntervalCorrectAnswer,
  getIntervalStatsKey,
  type IntervalMode
} from './interval-speed'
import { buildMelodyTimedPlayback, generateMelodyQuestion } from './melody'
import {
  SINGLE_NOTE_RANGES,
  SINGLE_NOTE_SCALE_DURATION_MS,
  SINGLE_NOTE_SCALE_GAP_MS,
  SINGLE_NOTE_SCALE_NOTES,
  createSingleNoteReviewItems,
  buildSingleNoteTimedPlayback,
  generateListenQuestion,
  getSingleNoteStatsKey
} from './single-note'
import {
  NO_MATCHING_MAJOR_KEY,
  checkTriadKeyMatchAnswer,
  findNoMatchTriadQuestion
} from './triad-key-match'
import {
  checkSyncopationAnswer,
  generateSyncopationQuestion,
  getSyncopationStatsKey
} from './syncopation'
import {
  checkRelativePitchSingAnswer,
  generateRelativePitchSingQuestion,
  getRelativePitchSingStatsKey
} from './relative-pitch-sing'

describe('single-note trainer', () => {
  it('generates targets inside the selected difficulty', () => {
    for (const difficulty of [1, 2, 3] as const) {
      for (let index = 0; index < 30; index += 1) {
        const question = generateListenQuestion({
          difficulty,
          playbackMode: 'do-target',
          reviewEnabled: false
        })
        expect(SINGLE_NOTE_RANGES[difficulty]).toContain(question.target)
      }
    }
  })

  it('keeps review items inside the current difficulty range', () => {
    const question = { id: 'q', target: 'C5', source: 'random' } as const
    const items = createSingleNoteReviewItems(question, 'D', 1)
    expect(items.every((item) => SINGLE_NOTE_RANGES[1].includes(item.target))).toBe(true)
    expect(items.some((item) => getNaturalNoteFromPitch(item.target) === 'D')).toBe(true)
  })

  it('uses fixed C4-C5 scale timing and user duration for final Do and target', () => {
    const question = { id: 'q', target: 'E5', source: 'random' } as const
    const events = buildSingleNoteTimedPlayback(question, 'scale-do-target', 640)

    expect(events.slice(0, SINGLE_NOTE_SCALE_NOTES.length).map((event) => event.note)).toEqual(
      SINGLE_NOTE_SCALE_NOTES
    )
    expect(events[0]).toEqual({
      note: 'C4',
      durationMs: SINGLE_NOTE_SCALE_DURATION_MS,
      gapAfterMs: SINGLE_NOTE_SCALE_GAP_MS
    })
    expect(events.at(-2)).toEqual({ note: 'C4', durationMs: 640, gapAfterMs: 50 })
    expect(events.at(-1)).toEqual({ note: 'E5', durationMs: 640, gapAfterMs: 0 })
  })
})

describe('melody trainer', () => {
  it('generates the requested length in C4-B4', () => {
    for (const length of [2, 3, 4, 5] as const) {
      const question = generateMelodyQuestion(length)
      expect(question.notes).toHaveLength(length)
      expect(question.playbackNotes).toHaveLength(length)
      expect(question.playbackNotes.every((note) => /^[A-G]4$/.test(note))).toBe(true)
    }
  })

  it('uses the same fixed C4-C5 scale timing before melody playback', () => {
    const question = {
      id: 'm',
      notes: ['C', 'D', 'E'],
      playbackNotes: ['C4', 'D4', 'E4']
    } as const
    const events = buildMelodyTimedPlayback(question, 'scale-do-melody', 500)

    expect(events.slice(0, SINGLE_NOTE_SCALE_NOTES.length).map((event) => event.note)).toEqual(
      SINGLE_NOTE_SCALE_NOTES
    )
    expect(events[0]).toEqual({
      note: 'C4',
      durationMs: SINGLE_NOTE_SCALE_DURATION_MS,
      gapAfterMs: SINGLE_NOTE_SCALE_GAP_MS
    })
    expect(events.at(-3)).toEqual({ note: 'C4', durationMs: 500, gapAfterMs: 50 })
    expect(events.at(-1)).toEqual({ note: 'E4', durationMs: 500, gapAfterMs: 0 })
  })
})

describe('chord trainer', () => {
  it('limits qualities by stage', () => {
    expect(chordQualitiesForStage(1)).toEqual(['major', 'minor'])
    expect(chordQualitiesForStage(4)).toEqual(['major', 'minor', 'diminished', 'augmented'])
  })

  it('generates fixed C root for stages 1 and 3', () => {
    expect(generateChordQuestion(1).root).toBe('C')
    expect(generateChordQuestion(3).root).toBe('C')
  })
})

describe('interval trainer', () => {
  it('generates reversible questions with a present correct answer', () => {
    for (let index = 0; index < 80; index += 1) {
      const question = generateIntervalQuestion('mixed')
      expect(question.answerOptions).toContain(getIntervalCorrectAnswer(question))
    }
  })

  it('honors fixed missing-part modes and separates stats by mode', () => {
    expect(generateIntervalQuestion('missing-top').missing).toBe('top')
    expect(generateIntervalQuestion('missing-root').missing).toBe('root')
    expect(generateIntervalQuestion('missing-interval').missing).toBe('interval')
    expect(getIntervalStatsKey(10, 'missing-top')).toBe('interval-speed:10:missing-top')
    expect(getIntervalStatsKey(5, 'mixed')).toBe('interval-speed:5:mixed')
  })

  it('excludes octave intervals from speed questions and answers', () => {
    expect(INTERVAL_SPEED_OPTIONS.some((interval) => interval.endsWith('8'))).toBe(false)

    for (const mode of ['missing-top', 'missing-root', 'missing-interval', 'mixed'] as IntervalMode[]) {
      for (let index = 0; index < 80; index += 1) {
        const question = generateIntervalQuestion(mode)
        expect(question.interval.endsWith('8')).toBe(false)
        if (question.missing === 'interval') {
          expect(question.answerOptions.some((option) => option.endsWith('8'))).toBe(false)
        }
      }
    }
  })
})

describe('syncopation trainer', () => {
  it('generates four-bar templates for each meter and difficulty', () => {
    for (const meter of ['2/4', '3/4', '4/4'] as const) {
      for (const difficulty of [1, 2, 3, 4, 5, 6, 7] as const) {
        const templates = getTemplatesForDifficulty(difficulty, meter)
        expect(templates.length).toBeGreaterThan(0)
        for (const template of templates) {
          expect(template.cells).toHaveLength(getTotalTicks(meter))
          expect(template.cells.filter((cell) => cell === 'attack').length).toBeGreaterThan(0)
          expect(template.cells).toContain('rest')
          expect(rhythmToNotationEvents(template.cells).reduce((sum, event) => sum + event.durationTicks, 0)).toBe(getTotalTicks(meter))
        }
      }
    }
  })

  it('generates difficulty-specific questions and avoids immediate repeats', () => {
    const settings = { difficulty: 1, bpm: 60, meter: '4/4', notation: 'jianpu', metronomeMode: 'full', inputCalibrationMs: -140 } as const
    const first = generateSyncopationQuestion(settings)
    const second = generateSyncopationQuestion(settings, { previousQuestionKey: first.templateId })
    expect(getTemplatesForDifficulty(1, '4/4').map((template) => template.id)).toContain(first.templateId)
    expect(second.templateId).not.toBe(first.templateId)
    expect(generateSyncopationQuestion({ ...settings, difficulty: 7 }).description).toContain('三连音')
  })

  it('guarantees the selected level material while mixing only current and earlier patterns', () => {
    const patternDifficulty: Record<string, number> = {
      'quarter-note': 1,
      'quarter-rest': 1,
      'two-eighths': 2,
      'four-sixteenths': 3,
      'eighth-two-sixteenths': 4,
      'two-sixteenths-eighth': 4,
      'front-dotted': 5,
      'back-dotted': 5,
      'small-syncopation': 6,
      'eighth-triplet': 7
    }
    const focusPatterns: Record<number, string[]> = {
      1: ['quarter-note'],
      2: ['two-eighths'],
      3: ['four-sixteenths'],
      4: ['eighth-two-sixteenths', 'two-sixteenths-eighth'],
      5: ['front-dotted', 'back-dotted'],
      6: ['small-syncopation'],
      7: ['eighth-triplet']
    }

    for (const difficulty of [1, 2, 3, 4, 5, 6, 7] as const) {
      for (const template of getTemplatesForDifficulty(difficulty, '4/4')) {
        expect(template.patternIds.every((id) => patternDifficulty[id] <= difficulty)).toBe(true)
        for (const focusPattern of focusPatterns[difficulty]) {
          expect(template.patternIds).toContain(focusPattern)
        }
      }
    }

    const dottedTemplates = getTemplatesForDifficulty(5, '4/4')
    expect(dottedTemplates.every((template) => template.patternIds.includes('front-dotted'))).toBe(true)
    expect(dottedTemplates.every((template) => template.patternIds.includes('back-dotted'))).toBe(true)
  })

  it('keeps small syncopation inside bar boundaries and triplets on third-beat ticks', () => {
    const ticksPerBar = getTicksPerBar('4/4')
    const smallSyncopationEvents = getTemplatesForDifficulty(6, '4/4').flatMap((template) => rhythmToNotationEvents(template.cells))
    expect(smallSyncopationEvents.some((event) => event.durationTicks === 12 && event.start % ticksPerBar <= ticksPerBar - 12)).toBe(true)

    const tripletEvents = getTemplatesForDifficulty(7, '4/4').flatMap((template) => rhythmToNotationEvents(template.cells)).filter((event) => event.tuplet === 3)
    expect(tripletEvents.length).toBeGreaterThan(0)
    expect(tripletEvents.every((event) => event.start % 4 === 0)).toBe(true)
  })

  it('converts bpm to target times on the tick timeline', () => {
    const question = generateSyncopationQuestion({ difficulty: 1, bpm: 60, meter: '4/4', notation: 'jianpu', metronomeMode: 'full', inputCalibrationMs: -140 })
    const targets = getTargetTimesMs(question.cells, 60)
    expect(targets.every((time) => time % 1000 === 0)).toBe(true)
  })

  it('builds standard rhythm demo events for four bars', () => {
    const question = generateSyncopationQuestion({ difficulty: 1, bpm: 60, meter: '2/4', notation: 'jianpu', metronomeMode: 'full', inputCalibrationMs: -140 })
    const events = buildRhythmDemoEvents(question.cells, 60)
    expect(events).toHaveLength(getTotalTicks('2/4'))
    expect(events[0]).toEqual({ index: 0, timeMs: 0, attack: question.cells[0] === 'attack' })
    expect(events.filter((event) => event.attack).map((event) => event.index)).toEqual(
      question.cells.flatMap((cell, index) => (cell === 'attack' ? [index] : []))
    )
  })

  it('maps user replay and comparison events to visual ticks', () => {
    const cells = ['attack', ...Array(11).fill('hold'), 'attack', ...Array(11).fill('hold')] as const

    expect(buildUserReplayEvents([], 60)).toEqual([])
    expect(buildUserReplayEvents([0, 1000], 60, cells.length)).toEqual([
      { index: 0, timeMs: 0, kind: 'user' },
      { index: 12, timeMs: 1000, kind: 'user' }
    ])

    const comparison = buildComparisonEvents(cells, 60, [1000])
    expect(comparison).toContainEqual({ index: 0, timeMs: 0, kind: 'standard' })
    expect(comparison).toContainEqual({ index: 12, timeMs: 1000, kind: 'standard' })
    expect(comparison).toContainEqual({ index: 12, timeMs: 1000, kind: 'user' })
  })

  it('judges hits, misses, early, late, and extras', () => {
    const cells = ['attack', ...Array(11).fill('hold'), 'attack', ...Array(11).fill('hold'), ...Array(12).fill('rest')] as const

    expect(evaluateRhythmHits(cells, 60, [0, 1000]).correct).toBe(true)

    const missed = evaluateRhythmHits(cells, 60, [0])
    expect(missed.correct).toBe(false)
    expect(missed.targets.at(1)?.status).toBe('missed')

    const earlyLateExtra = evaluateRhythmHits(cells, 60, [-130, 1130, 2600])
    expect(earlyLateExtra.targets[0].status).toBe('early')
    expect(earlyLateExtra.targets[1].status).toBe('late')
    expect(earlyLateExtra.extras).toHaveLength(1)
  })

  it('reports near target taps as early or late instead of extra', () => {
    const cells = [...Array(12).fill('rest'), 'attack', ...Array(11).fill('hold')] as const

    const result = evaluateRhythmHits(cells, 60, [1130])
    expect(result.correct).toBe(false)
    expect(result.targets[0].status).toBe('late')
    expect(result.extras).toEqual([])
  })

  it('returns answer feedback and stats key by difficulty, bpm, and meter', () => {
    const question = generateSyncopationQuestion({ difficulty: 2, bpm: 80, meter: '3/4', notation: 'jianpu', metronomeMode: 'full', inputCalibrationMs: -140 })
    const result = checkSyncopationAnswer(question, 80, [])
    expect(result.correct).toBe(false)
    expect(result.explanation).toContain('漏拍')
    expect(getSyncopationStatsKey(7, 100, '2/4', 'count-in')).toBe('syncopation:7:100:2/4:count-in')
  })

  it('builds count-in-only and full-practice metronome timelines without answer taps', () => {
    const countInOnly = buildPracticeMetronomeEvents(60, '4/4', 'count-in')
    expect(countInOnly).toHaveLength(4)
    expect(countInOnly.every((event) => event.phase === 'count-in')).toBe(true)

    const full = buildPracticeMetronomeEvents(60, '4/4', 'full')
    expect(full).toHaveLength(20)
    expect(full.filter((event) => event.phase === 'practice')).toHaveLength(16)
    expect(full.filter((event) => event.phase === 'practice' && event.strong).map((event) => event.timeMs)).toEqual([4000, 8000, 12000, 16000])
  })

  it('applies input calibration to judgement and replay event timing', () => {
    const question = {
      id: 'q',
      templateId: 'test',
      label: 'test',
      description: 'test',
      meter: '4/4',
      cells: ['attack', ...Array(11).fill('hold')],
      patternIds: ['quarter-note']
    } as const

    expect(checkSyncopationAnswer(question, 60, [140]).correct).toBe(false)
    expect(checkSyncopationAnswer(question, 60, [140], -140).correct).toBe(true)
    expect(buildUserReplayEvents([140 + -140], 60)).toEqual([{ index: 0, timeMs: 0, kind: 'user' }])
  })

  it('lays out jianpu rhythm as readable teaching score', () => {
    const cells = [
      ...Array(12).fill('rest'),
      ...Array(4).fill('attack').flatMap(() => ['attack', 'hold', 'hold']),
      ...Array(8).fill('rest')
    ]
    const layout = layoutJianpuRhythm(cells, '4/4', null, { standard: null, user: null }, { measuresPerRow: 2 })
    expect(layout.height).toBeGreaterThan(250)
    expect(layout.glyphs.filter((glyph) => glyph.kind === 'rest' && glyph.underlineLevel === 0)).not.toHaveLength(0)
    expect(layout.glyphs.filter((glyph) => glyph.kind === 'note' && glyph.underlineLevel === 2)).toHaveLength(4)
    expect(layout.underlines.filter((line) => line.level === 2).length).toBeGreaterThanOrEqual(1)
  })

  it('keeps dense sixteenth-note glyphs inside their beat without overlap', () => {
    const oneBar = Array.from({ length: 16 }, () => ['attack', 'hold', 'hold']).flat()
    const layout = layoutJianpuRhythm([...oneBar, ...oneBar, ...oneBar, ...oneBar], '4/4', null, { standard: null, user: null }, { measuresPerRow: 1 })
    expect(new Set(layout.measureLabels.map((label) => label.y)).size).toBe(4)

    for (let beat = 0; beat < 16; beat += 1) {
      const glyphs = layout.glyphs
        .filter((glyph) => Math.floor(glyph.startTick / 12) === beat)
        .sort((left, right) => left.x - right.x)
      expect(glyphs).toHaveLength(4)
      for (let index = 1; index < glyphs.length; index += 1) {
        expect(glyphs[index].x - glyphs[index - 1].x).toBeGreaterThanOrEqual(glyphs[index].width)
      }
    }
  })

  it('uses the reported viewport width so phone desktop mode stays compact', () => {
    expect(getJianpuMeasuresPerRow({
      viewportWidth: 980
    })).toBe(4)
    expect(getJianpuMeasuresPerRow({
      viewportWidth: 820
    })).toBe(2)
    expect(getJianpuMeasuresPerRow({
      viewportWidth: 390
    })).toBe(1)
    expect(getJianpuMeasuresPerRow({
      viewportWidth: 1280
    })).toBe(4)
  })

  it('marks dotted and tuplet jianpu glyphs without connecting across beats', () => {
    const cells = cellsFromEvents([
      ['note', 9],
      ['note', 3],
      ['note', 4],
      ['note', 4],
      ['note', 4],
      ['rest', 12]
    ])
    const layout = layoutJianpuRhythm(cells, '2/4', null, { standard: null, user: null }, { measuresPerRow: 4 })
    expect(layout.glyphs.some((glyph) => glyph.dotted)).toBe(true)
    expect(layout.glyphs.filter((glyph) => glyph.tuplet === 3)).toHaveLength(3)
    const firstBeatUnderlines = layout.underlines.filter((line) => line.id.includes('-0-0-'))
    const secondBeatUnderlines = layout.underlines.filter((line) => line.id.includes('-0-1-'))
    expect(firstBeatUnderlines.length).toBeGreaterThan(0)
    expect(secondBeatUnderlines.length).toBeGreaterThan(0)
  })

  it('draws short rest underlines as separate jianpu marks', () => {
    const layout = layoutJianpuRhythm(cellsFromEvents([
      ['rest', 6],
      ['rest', 3],
      ['note', 3]
    ]), '2/4', null, { standard: null, user: null }, { measuresPerRow: 2 })
    const restGlyphs = layout.glyphs.filter((glyph) => glyph.kind === 'rest')
    expect(restGlyphs.map((glyph) => glyph.underlineLevel)).toEqual([1, 2])
    expect(layout.underlines.filter((line) => line.id.includes('-0-0-1-'))).toHaveLength(3)
    expect(layout.underlines.filter((line) => line.id.includes('-0-0-2-')).length).toBeGreaterThanOrEqual(1)
  })
})

describe('relative pitch singing trainer', () => {
  it('builds two-note upward patterns including octave 111', () => {
    const patterns = buildRelativePitchPatterns(2, 'up')
    expect(patterns.map(relativePitchPatternLabel)).toEqual(['121', '131', '141', '151', '161', '171', '111'])
    expect(relativePitchPatternToNotes(patterns[0])).toEqual(['C4', 'D4', 'C4'])
    expect(relativePitchPatternToNotes(patterns.at(-1)!)).toEqual(['C4', 'C5', 'C4'])
  })

  it('builds mirrored higher-difficulty and downward patterns', () => {
    const upward = buildRelativePitchPatterns(3, 'up')
    expect(upward.map(relativePitchPatternLabel)).toContain('12321')
    expect(upward.map(relativePitchPatternLabel)).not.toContain('121')

    const downward = buildRelativePitchPatterns(2, 'down')
    expect(relativePitchPatternLabel(downward[0])).toBe('171')
    expect(relativePitchPatternToNotes(downward[0])).toEqual(['C5', 'B4', 'C5'])
    expect(relativePitchPatternToNotes(downward.at(-1)!)).toEqual(['C5', 'C4', 'C5'])
  })

  it('generates sequential questions and separates stats by difficulty and direction', () => {
    const settings = { difficulty: 2, direction: 'up', order: 'sequential' } as const
    const first = generateRelativePitchSingQuestion(settings)
    const second = generateRelativePitchSingQuestion(settings, { previousQuestionKey: first.pattern.id })
    expect(first.label).toBe('121')
    expect(second.label).toBe('131')
    expect(getRelativePitchSingStatsKey(2, 'up')).toBe('relative-pitch-sing:2:up')
  })

  it('judges sung pitch events by degree sequence and cents tolerance', () => {
    const pattern = buildRelativePitchPatterns(2, 'up')[0]
    expect(evaluateRelativePitchAnswer(pattern, [
      { midi: 60, cents: 20, durationMs: 200 },
      { midi: 62, cents: -35, durationMs: 200 },
      { midi: 60, cents: 0, durationMs: 200 }
    ]).correct).toBe(true)

    expect(evaluateRelativePitchAnswer(pattern, [
      { midi: 60, cents: 70, durationMs: 200 },
      { midi: 62, cents: 0, durationMs: 200 },
      { midi: 60, cents: 0, durationMs: 200 }
    ]).correct).toBe(false)

    expect(evaluateRelativePitchAnswer(pattern, [
      { midi: 48, cents: 0, durationMs: 200 },
      { midi: 50, cents: 0, durationMs: 200 },
      { midi: 48, cents: 0, durationMs: 200 }
    ]).correct).toBe(true)

    expect(evaluateRelativePitchAnswer(pattern, [
      { midi: 49, cents: -9, durationMs: 220 },
      { midi: 48, cents: -16, durationMs: 620 },
      { midi: 50, cents: -17, durationMs: 580 },
      { midi: 48, cents: -7, durationMs: 620 }
    ])).toMatchObject({
      correct: true,
      detectedDegrees: [1, 2, 1]
    })

    expect(checkRelativePitchSingAnswer({
      id: 'q',
      pattern,
      label: '121',
      notes: relativePitchPatternToNotes(pattern)
    }, [
      { midi: 60, cents: 0, durationMs: 200 },
      { midi: 64, cents: 0, durationMs: 200 },
      { midi: 60, cents: 0, durationMs: 200 }
    ]).correct).toBe(false)
  })

  it('does not merge three sung notes through chromatic transition frames', () => {
    const events = framesToStableEvents([
      { midi: 48, cents: 0, timeMs: 0 },
      { midi: 48, cents: -8, timeMs: 60 },
      { midi: 49, cents: -10, timeMs: 120 },
      { midi: 50, cents: -12, timeMs: 180 },
      { midi: 50, cents: -16, timeMs: 240 },
      { midi: 49, cents: -8, timeMs: 300 },
      { midi: 48, cents: -5, timeMs: 360 },
      { midi: 48, cents: -7, timeMs: 420 }
    ])

    expect(events.map((event) => event.midi)).toEqual([48, 50, 48])
  })
})

describe('major key theory', () => {
  it('spells traditional major scales', () => {
    expect(buildMajorScale('C#').notes).toEqual(['C#', 'D#', 'E#', 'F#', 'G#', 'A#', 'B#'])
    expect(buildMajorScale('Cb').notes).toEqual(['Cb', 'Db', 'Eb', 'Fb', 'Gb', 'Ab', 'Bb'])
    expect(buildMajorScale('F#').notes).toEqual(['F#', 'G#', 'A#', 'B', 'C#', 'D#', 'E#'])
    expect(buildMajorScale('Gb').notes).toEqual(['Gb', 'Ab', 'Bb', 'Cb', 'Db', 'Eb', 'F'])
  })

  it('builds diatonic triads by degree', () => {
    const dThird = buildDegreeChord('D', 3)
    expect(dThird.notes).toEqual(['F#', 'A', 'C#'])
    expect(dThird.quality).toBe('minor')

    const cbSeventh = buildDegreeChord('Cb', 7)
    expect(cbSeventh.notes).toEqual(['Bb', 'Db', 'Fb'])
    expect(cbSeventh.quality).toBe('diminished')
  })

  it('checks degree chord answers as root spelling plus quality', () => {
    const question = {
      id: 'q',
      key: 'D',
      degree: 3,
      chord: buildDegreeChord('D', 3)
    } as const

    expect(checkDegreeChordAnswer(question, { letter: 'F', accidental: '#', quality: 'minor' }).correct).toBe(true)
    expect(checkDegreeChordAnswer(question, { letter: 'F', accidental: '', quality: 'minor' }).correct).toBe(false)
  })

  it('matches triads to major keys by complete selected set', () => {
    const matchingKeys = findMajorKeysForTriad(['D', 'F', 'A'])
    const question = {
      id: 'q',
      root: 'D',
      quality: 'minor',
      notes: ['D', 'F', 'A'],
      matchingKeys
    } as const

    expect(matchingKeys).toContain('C')
    expect(checkTriadKeyMatchAnswer(question, matchingKeys).correct).toBe(true)
    expect(checkTriadKeyMatchAnswer(question, matchingKeys.slice(1)).correct).toBe(false)
  })

  it('supports no matching major key as a mutually exclusive answer', () => {
    const question = findNoMatchTriadQuestion()
    expect(question.matchingKeys).toEqual([])
    expect(checkTriadKeyMatchAnswer(question, NO_MATCHING_MAJOR_KEY).correct).toBe(true)
  })
})

describe('state helpers', () => {
  it('records and resets stats', () => {
    const key = getSingleNoteStatsKey(1)
    const afterCorrect = recordAnswer({}, key, true)
    expect(afterCorrect[key]).toEqual({ answered: 1, correct: 1, streak: 1 })
    const afterWrong = recordAnswer(afterCorrect, key, false)
    expect(afterWrong[key]).toEqual({ answered: 2, correct: 1, streak: 0 })
    expect(resetStats(afterWrong, key)[key]).toEqual({ answered: 0, correct: 0, streak: 0 })
  })

  it('deduplicates review queues by stats key', () => {
    const key = getSingleNoteStatsKey(1)
    const queues = addReviewItems(
      {},
      key,
      [
        { target: 'D4', mistakenNote: 'C' },
        { target: 'D4', mistakenNote: 'C' }
      ],
      10
    )
    expect(getReviewQueue(queues, key)).toEqual([{ target: 'D4', mistakenNote: 'C' }])
    expect(getReviewQueue(queues, getSingleNoteStatsKey(2))).toEqual([])
  })

  it('fills syncopation defaults for older preferences', () => {
    const legacy = {
      ...DEFAULT_PREFERENCES,
      syncopation: undefined
    } as unknown as AppPreferences
    expect(normalizePreferences(legacy).syncopation).toEqual({
      difficulty: 1,
      bpm: 60,
      meter: '4/4',
      notation: 'jianpu',
      metronomeMode: 'full',
      inputCalibrationMs: -140
    })
  })

  it('fills relative pitch singing defaults for older preferences', () => {
    const legacy = {
      ...DEFAULT_PREFERENCES,
      relativePitchSing: undefined
    } as unknown as AppPreferences
    expect(normalizePreferences(legacy).relativePitchSing).toEqual({
      difficulty: 2,
      direction: 'up',
      order: 'sequential'
    })
  })

  it('normalizes syncopation difficulty and input calibration', () => {
    expect(normalizePreferences({ ...DEFAULT_PREFERENCES, syncopation: { difficulty: 7, bpm: 60, meter: '2/4', notation: 'jianpu', metronomeMode: 'count-in', inputCalibrationMs: 200 } }).syncopation).toMatchObject({
      difficulty: 7,
      meter: '2/4',
      metronomeMode: 'count-in',
      inputCalibrationMs: 200
    })
    expect(normalizePreferences({ ...DEFAULT_PREFERENCES, syncopation: { difficulty: 9, bpm: 60, meter: '6/8', notation: 'jianpu', metronomeMode: 'invalid', inputCalibrationMs: 220 } as never }).syncopation).toMatchObject({
      difficulty: 1,
      meter: '4/4',
      metronomeMode: 'full',
      inputCalibrationMs: -140
    })
  })
})
