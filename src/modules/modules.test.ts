import { buildDegreeChord, buildMajorScale, findMajorKeysForTriad } from '../core/major-keys'
import { getNaturalNoteFromPitch } from '../core/notes'
import { recordAnswer, resetStats } from '../state/stats'
import { addReviewItems, getReviewQueue } from '../state/review'
import { generateChordQuestion, chordQualitiesForStage } from './chord-quality'
import { checkDegreeChordAnswer } from './degree-chord'
import { generateIntervalQuestion, getIntervalCorrectAnswer, getIntervalStatsKey } from './interval-speed'
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
})
