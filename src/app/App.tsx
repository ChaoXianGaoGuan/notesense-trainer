import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, ReactNode, SetStateAction } from 'react'
import { audioEngine } from '../audio/engine'
import { inputAnalyzer } from '../audio/input-analyzer'
import { metronome } from '../audio/metronome'
import { CHORD_LABELS } from '../core/chords'
import { INTERVAL_LABELS } from '../core/intervals'
import { DEGREE_ROMANS, getMajorKeyGroups, type MajorKey } from '../core/major-keys'
import { SOLFEGE_OPTIONS, solfegeToOctavePitch } from '../core/notes'
import {
  buildComparisonEvents,
  buildRhythmDemoEvents,
  buildUserReplayEvents,
  getCountInDurationMs,
  getBeatsPerBar,
  getTicksPerBeat,
  getTicksPerBar,
  getTargetTimesMs,
  rhythmToNotationEvents,
  type RhythmEvaluation,
  type RhythmMeter,
  type RhythmReplayEvent
} from '../core/rhythm'
import type { Accidental, AnswerResult, AudioSettings, NaturalNote, Solfege, StatsKey, Timbre } from '../core/types'
import {
  checkChordAnswer,
  chordQualitiesForStage,
  generateChordQuestion,
  getChordStatsKey,
  type ChordQuestion,
  type ChordStage
} from '../modules/chord-quality'
import {
  DEGREE_CHORD_ACCIDENTALS,
  DEGREE_CHORD_QUALITIES,
  checkDegreeChordAnswer,
  degreeChordQuestionKey,
  generateDegreeChordQuestion,
  getDegreeChordStatsKey,
  type DegreeChordAnswer,
  type DegreeChordQuestion
} from '../modules/degree-chord'
import {
  generateIntervalQuestion,
  getIntervalCorrectAnswer,
  getIntervalStatsKey,
  intervalQuestionKey,
  checkIntervalAnswer,
  type IntervalMode,
  type IntervalQuestion
} from '../modules/interval-speed'
import {
  MELODY_LENGTHS,
  buildMelodyTimedPlayback,
  checkMelodyAnswer,
  generateMelodyQuestion,
  getMelodyStatsKey,
  melodyAnswerOptions,
  type MelodyLength,
  type MelodyQuestion
} from '../modules/melody'
import {
  RELATIVE_PITCH_SING_DIFFICULTIES,
  RELATIVE_PITCH_SING_DIFFICULTY_LABELS,
  RELATIVE_PITCH_SING_DIRECTIONS,
  RELATIVE_PITCH_SING_DIRECTION_LABELS,
  RELATIVE_PITCH_SING_ORDERS,
  RELATIVE_PITCH_SING_ORDER_LABELS,
  checkRelativePitchSingAnswer,
  generateRelativePitchSingQuestion,
  getRelativePitchSingStatsKey,
  type RelativePitchSingQuestion,
  type RelativePitchSingResult
} from '../modules/relative-pitch-sing'
import {
  SINGLE_NOTE_RANGES,
  buildSingleNoteTimedPlayback,
  checkSingleNoteAnswer,
  createSingleNoteReviewItems,
  generateListenQuestion,
  getSingleNoteStatsKey,
  singleNoteAnswerOptions,
  type SingleNoteDifficulty,
  type SingleNoteQuestion
} from '../modules/single-note'
import {
  checkSolfegeAnswer,
  generateSolfegeQuestion,
  getSolfegeStatsKey,
  solfegeOptions,
  type SolfegeQuestion
} from '../modules/solfege'
import {
  SYNCOPATION_BPM_OPTIONS,
  SYNCOPATION_DIFFICULTIES,
  SYNCOPATION_DIFFICULTY_LABELS,
  SYNCOPATION_METER_OPTIONS,
  SYNCOPATION_NOTATION_LABELS,
  checkSyncopationAnswer,
  generateSyncopationQuestion,
  getSyncopationBarDurationMs,
  getSyncopationStatsKey,
  type SyncopationQuestion,
  type SyncopationResult
} from '../modules/syncopation'
import {
  NO_MATCHING_MAJOR_KEY,
  checkTriadKeyMatchAnswer,
  generateTriadKeyMatchQuestion,
  getTriadKeyMatchStatsKey,
  triadKeyMatchQuestionKey,
  type TriadKeyMatchQuestion
} from '../modules/triad-key-match'
import { DEFAULT_PREFERENCES, normalizePreferences, type AppPreferences, type ModuleId } from '../state/defaults'
import { addReviewItems, getReviewQueue, type ReviewQueues } from '../state/review'
import { accuracy, getStats, recordAnswer, resetStats, type StatsState } from '../state/stats'
import { loadRecord, saveJson } from '../state/storage'
import { usePersistentState } from '../state/usePersistentState'

const MODULES: Array<{ id: ModuleId; label: string }> = [
  { id: 'solfege', label: '看音名选唱名' },
  { id: 'single-note', label: '单音听辨' },
  { id: 'melody', label: '旋律短句听写' },
  { id: 'chord-quality', label: '和弦性质听辨' },
  { id: 'interval-speed', label: '根音冠音音程速算' },
  { id: 'syncopation', label: '切分节奏跟拍' },
  { id: 'relative-pitch-sing', label: '相对音高模唱' },
  { id: 'degree-chord', label: '调内级数和弦' },
  { id: 'triad-key-match', label: '和弦所属大调' }
]

const TIMBRES: Array<{ value: Timbre; label: string }> = [
  { value: 'piano', label: '钢琴' },
  { value: 'guitar', label: '吉他' }
]

const INTERVAL_PITCH_ACCIDENTALS: Array<Extract<Accidental, 'b' | '' | '#'>> = ['b', '', '#']
const INTERVAL_NUMBERS = [2, 3, 4, 5, 6, 7] as const
const INTERVAL_QUALITIES = ['d', 'm', 'P', 'M', 'A'] as const
const INTERVAL_QUALITY_LABELS: Record<(typeof INTERVAL_QUALITIES)[number], string> = {
  d: '减',
  m: '小',
  P: '纯',
  M: '大',
  A: '增'
}

export function App() {
  const [preferences, setPreferences] = usePersistentState<AppPreferences>(
    'music-trainer:preferences',
    DEFAULT_PREFERENCES,
    normalizePreferences
  )
  const [stats, setStats] = useState<StatsState>(() => loadRecord('music-trainer:stats') as StatsState)
  const [reviewQueues, setReviewQueues] = useState<ReviewQueues>(
    () => loadRecord('music-trainer:single-note-reviews') as ReviewQueues
  )

  useEffect(() => {
    saveJson('music-trainer:stats', stats)
  }, [stats])

  useEffect(() => {
    saveJson('music-trainer:single-note-reviews', reviewQueues)
  }, [reviewQueues])

  const updateAudio = useCallback(
    (audio: AudioSettings) => {
      setPreferences((current) => ({ ...current, audio }))
    },
    [setPreferences]
  )

  const setActiveModule = useCallback(
    (activeModule: ModuleId) => {
      setPreferences((current) => ({ ...current, activeModule }))
    },
    [setPreferences]
  )

  const recordModuleAnswer = useCallback((key: StatsKey, correct: boolean) => {
    setStats((current) => recordAnswer(current, key, correct))
  }, [])

  const resetModuleStats = useCallback((key: StatsKey) => {
    setStats((current) => resetStats(current, key))
  }, [])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <h1>NoteSense 音感训练器</h1>
          <p>固定唱名、听辨、旋律、和弦和音程速算</p>
        </div>
      </header>

      <nav className="module-tabs" aria-label="训练模块">
        {MODULES.map((module) => (
          <button
            key={module.id}
            type="button"
            className={preferences.activeModule === module.id ? 'active' : ''}
            onClick={() => setActiveModule(module.id)}
          >
            {module.label}
          </button>
        ))}
      </nav>

      {!['interval-speed', 'syncopation', 'degree-chord', 'triad-key-match'].includes(preferences.activeModule) && (
        <AudioControls settings={preferences.audio} onChange={updateAudio} />
      )}

      <main className="trainer-surface">
        {preferences.activeModule === 'solfege' && (
          <SolfegeTrainer
            audioSettings={preferences.audio}
            stats={stats}
            recordAnswer={recordModuleAnswer}
            resetStats={resetModuleStats}
          />
        )}

        {preferences.activeModule === 'single-note' && (
          <SingleNoteTrainer
            audioSettings={preferences.audio}
            stats={stats}
            reviewQueues={reviewQueues}
            setReviewQueues={setReviewQueues}
            settings={preferences.singleNote}
            updateSettings={(singleNote) => setPreferences((current) => ({ ...current, singleNote }))}
            recordAnswer={recordModuleAnswer}
            resetStats={resetModuleStats}
          />
        )}

        {preferences.activeModule === 'melody' && (
          <MelodyTrainer
            audioSettings={preferences.audio}
            stats={stats}
            settings={preferences.melody}
            updateSettings={(melody) => setPreferences((current) => ({ ...current, melody }))}
            recordAnswer={recordModuleAnswer}
            resetStats={resetModuleStats}
          />
        )}

        {preferences.activeModule === 'chord-quality' && (
          <ChordTrainer
            audioSettings={preferences.audio}
            stats={stats}
            settings={preferences.chord}
            updateSettings={(chord) => setPreferences((current) => ({ ...current, chord }))}
            recordAnswer={recordModuleAnswer}
            resetStats={resetModuleStats}
          />
        )}

        {preferences.activeModule === 'interval-speed' && (
          <IntervalTrainer
            stats={stats}
            settings={preferences.interval}
            updateSettings={(interval) => setPreferences((current) => ({ ...current, interval }))}
            recordAnswer={recordModuleAnswer}
            resetStats={resetModuleStats}
          />
        )}

        {preferences.activeModule === 'syncopation' && (
          <SyncopationTrainer
            stats={stats}
            settings={preferences.syncopation}
            updateSettings={(syncopation) => setPreferences((current) => ({ ...current, syncopation }))}
            recordAnswer={recordModuleAnswer}
            resetStats={resetModuleStats}
          />
        )}

        {preferences.activeModule === 'relative-pitch-sing' && (
          <RelativePitchSingTrainer
            audioSettings={preferences.audio}
            stats={stats}
            settings={preferences.relativePitchSing}
            updateSettings={(relativePitchSing) => setPreferences((current) => ({ ...current, relativePitchSing }))}
            recordAnswer={recordModuleAnswer}
            resetStats={resetModuleStats}
          />
        )}

        {preferences.activeModule === 'degree-chord' && (
          <DegreeChordTrainer stats={stats} recordAnswer={recordModuleAnswer} resetStats={resetModuleStats} />
        )}

        {preferences.activeModule === 'triad-key-match' && (
          <TriadKeyMatchTrainer stats={stats} recordAnswer={recordModuleAnswer} resetStats={resetModuleStats} />
        )}
      </main>
    </div>
  )
}

function AudioControls({
  settings,
  onChange
}: {
  settings: AudioSettings
  onChange: (settings: AudioSettings) => void
}) {
  return (
    <section className="settings-band" aria-label="音频设置">
      <label>
        音量
        <input
          type="range"
          min="0"
          max="100"
          value={settings.volume}
          onChange={(event) => onChange({ ...settings, volume: Number(event.target.value) })}
        />
        <span>{settings.volume}%</span>
      </label>
      <label>
        时长
        <input
          type="range"
          min="80"
          max="800"
          step="20"
          value={settings.durationMs}
          onChange={(event) => onChange({ ...settings, durationMs: Number(event.target.value) })}
        />
        <span>{settings.durationMs} ms</span>
      </label>
      <label>
        音色
        <select
          value={settings.timbre}
          onChange={(event) => onChange({ ...settings, timbre: event.target.value as Timbre })}
        >
          {TIMBRES.map((timbre) => (
            <option key={timbre.value} value={timbre.value}>
              {timbre.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  )
}

function SolfegeTrainer({
  audioSettings,
  stats,
  recordAnswer: record,
  resetStats: reset
}: {
  audioSettings: AudioSettings
  stats: StatsState
  recordAnswer: (key: StatsKey, correct: boolean) => void
  resetStats: (key: StatsKey) => void
}) {
  const statsKey = getSolfegeStatsKey()
  const [question, setQuestion] = useState<SolfegeQuestion>(() => generateSolfegeQuestion())
  const [feedback, setFeedback] = useState<AnswerResult | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const nextQuestion = useCallback(() => {
    clearPendingTimeout(timeoutRef)
    setQuestion((current) => generateSolfegeQuestion({ previousQuestionKey: current.note }))
    setFeedback(null)
  }, [])

  const submit = useCallback(
    async (answer: Solfege) => {
      if (feedback) return
      void audioEngine.playNote(solfegeToOctavePitch(answer), audioSettings)
      const result = checkSolfegeAnswer(question, answer)
      setFeedback(result)
      record(statsKey, result.correct)
      if (result.correct) {
        timeoutRef.current = window.setTimeout(nextQuestion, 480)
      }
    },
    [audioSettings, feedback, nextQuestion, question, record, statsKey]
  )

  useEffect(() => () => clearPendingTimeout(timeoutRef), [])

  useHotkeys(
    useMemo(
      () => ({
        onNumber: (index) => {
          const answer = SOLFEGE_OPTIONS[index - 1]
          if (answer) void submit(answer)
        },
        onSpace: () => {
          if (feedback && !feedback.correct) nextQuestion()
        },
        onReset: () => reset(statsKey)
      }),
      [feedback, nextQuestion, reset, statsKey, submit]
    )
  )

  return (
    <section className="module-panel" data-testid="module-solfege">
      <ModuleHeader title="看音名选唱名" />
      <div className="question-display">
        <span className="question-label">音名</span>
        <strong>{question.note}</strong>
      </div>
      <OptionGrid>
        {solfegeOptions.map((option) => (
          <button key={option} type="button" disabled={Boolean(feedback)} onClick={() => void submit(option)}>
            {option}
          </button>
        ))}
      </OptionGrid>
      <FeedbackPanel feedback={feedback} onNext={nextQuestion} />
      <StatsPanel stats={getStats(stats, statsKey)} onReset={() => reset(statsKey)} />
    </section>
  )
}

function SingleNoteTrainer({
  audioSettings,
  stats,
  reviewQueues,
  setReviewQueues,
  settings,
  updateSettings,
  recordAnswer: record,
  resetStats: reset
}: {
  audioSettings: AudioSettings
  stats: StatsState
  reviewQueues: ReviewQueues
  setReviewQueues: Dispatch<SetStateAction<ReviewQueues>>
  settings: AppPreferences['singleNote']
  updateSettings: (settings: AppPreferences['singleNote']) => void
  recordAnswer: (key: StatsKey, correct: boolean) => void
  resetStats: (key: StatsKey) => void
}) {
  const statsKey = getSingleNoteStatsKey(settings.difficulty)
  const queue = getReviewQueue(reviewQueues, statsKey)
  const [question, setQuestion] = useState<SingleNoteQuestion>(() =>
    generateListenQuestion(settings, {}, queue)
  )
  const [feedback, setFeedback] = useState<AnswerResult | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const autoPlayedQuestionIdRef = useRef<string | null>(null)

  const nextQuestion = useCallback(() => {
    clearPendingTimeout(timeoutRef)
    setQuestion((current) =>
      generateListenQuestion(settings, { previousQuestionKey: current.target }, getReviewQueue(reviewQueues, statsKey))
    )
    setFeedback(null)
  }, [reviewQueues, settings, statsKey])

  const playCurrent = useCallback(() => {
    void audioEngine.playTimedSequence(
      buildSingleNoteTimedPlayback(question, settings.playbackMode, audioSettings.durationMs),
      audioSettings
    )
  }, [audioSettings, question, settings.playbackMode])

  useEffect(() => {
    if (feedback || autoPlayedQuestionIdRef.current === question.id) {
      return
    }

    autoPlayedQuestionIdRef.current = question.id
    const timer = window.setTimeout(playCurrent, 120)
    return () => window.clearTimeout(timer)
  }, [feedback, playCurrent, question.id])

  const submit = useCallback(
    (answer: NaturalNote) => {
      if (feedback) return
      const result = checkSingleNoteAnswer(question, answer)
      setFeedback(result)
      record(statsKey, result.correct)
      if (!result.correct && settings.reviewEnabled) {
        setReviewQueues((current) =>
          addReviewItems(current, statsKey, createSingleNoteReviewItems(question, answer, settings.difficulty))
        )
      }
      if (result.correct) {
        timeoutRef.current = window.setTimeout(nextQuestion, 520)
      }
    },
    [feedback, nextQuestion, question, record, setReviewQueues, settings.difficulty, settings.reviewEnabled, statsKey]
  )

  useEffect(() => {
    setQuestion(generateListenQuestion(settings, {}, getReviewQueue(reviewQueues, statsKey)))
    setFeedback(null)
    return () => clearPendingTimeout(timeoutRef)
  }, [settings.difficulty, settings.playbackMode, settings.reviewEnabled, statsKey])

  useHotkeys(
    useMemo(
      () => ({
        onNumber: (index) => {
          const answer = singleNoteAnswerOptions[index - 1]
          if (answer) submit(answer)
        },
        onSpace: () => {
          if (feedback && !feedback.correct) nextQuestion()
        },
        onReplay: playCurrent,
        onReset: () => reset(statsKey)
      }),
      [feedback, nextQuestion, playCurrent, reset, statsKey, submit]
    )
  )

  return (
    <section className="module-panel" data-testid="module-single-note">
      <ModuleHeader title="单音听辨" />
      <div className="settings-row">
        <SegmentedControl
          label="难度"
          value={String(settings.difficulty)}
          options={[
            { value: '1', label: '难度 1' },
            { value: '2', label: '难度 2' },
            { value: '3', label: '难度 3' }
          ]}
          onChange={(value) => updateSettings({ ...settings, difficulty: Number(value) as SingleNoteDifficulty })}
        />
        <SegmentedControl
          label="播放"
          value={settings.playbackMode}
          options={[
            { value: 'scale-do-target', label: '音阶 + Do + 目标' },
            { value: 'do-target', label: 'Do + 目标' }
          ]}
          onChange={(value) => updateSettings({ ...settings, playbackMode: value as AppPreferences['singleNote']['playbackMode'] })}
        />
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={settings.reviewEnabled}
            onChange={(event) => updateSettings({ ...settings, reviewEnabled: event.target.checked })}
          />
          错题强化
        </label>
      </div>
      <div className="question-display compact">
        <span className="question-label">当前范围</span>
        <strong>{SINGLE_NOTE_RANGES[settings.difficulty].join(' ')}</strong>
      </div>
      <div className="primary-actions">
        <button type="button" className="primary" onClick={playCurrent}>
          重播题目
        </button>
        <span className="queue-count">复习队列 {queue.length}</span>
      </div>
      <OptionGrid>
        {singleNoteAnswerOptions.map((option) => (
          <button key={option} type="button" disabled={Boolean(feedback)} onClick={() => submit(option)}>
            {option}
          </button>
        ))}
      </OptionGrid>
      <FeedbackPanel feedback={feedback} onNext={nextQuestion} />
      <StatsPanel stats={getStats(stats, statsKey)} onReset={() => reset(statsKey)} />
    </section>
  )
}

function MelodyTrainer({
  audioSettings,
  stats,
  settings,
  updateSettings,
  recordAnswer: record,
  resetStats: reset
}: {
  audioSettings: AudioSettings
  stats: StatsState
  settings: AppPreferences['melody']
  updateSettings: (settings: AppPreferences['melody']) => void
  recordAnswer: (key: StatsKey, correct: boolean) => void
  resetStats: (key: StatsKey) => void
}) {
  const statsKey = getMelodyStatsKey(settings.length)
  const [question, setQuestion] = useState<MelodyQuestion>(() => generateMelodyQuestion(settings.length))
  const [answer, setAnswer] = useState<NaturalNote[]>([])
  const [feedback, setFeedback] = useState<AnswerResult | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const nextQuestion = useCallback(() => {
    clearPendingTimeout(timeoutRef)
    setQuestion((current) => generateMelodyQuestion(settings.length, { previousQuestionKey: current.notes.join('') }))
    setAnswer([])
    setFeedback(null)
  }, [settings.length])

  const playCurrent = useCallback(() => {
    void audioEngine.playTimedSequence(
      buildMelodyTimedPlayback(question, settings.playbackMode, audioSettings.durationMs),
      audioSettings
    )
  }, [audioSettings, question, settings.playbackMode])

  const addNote = useCallback(
    (note: NaturalNote) => {
      if (feedback) return
      setAnswer((current) => (current.length >= settings.length ? current : [...current, note]))
    },
    [feedback, settings.length]
  )

  const submit = useCallback(() => {
    if (feedback) return
    const result = checkMelodyAnswer(question, answer)
    setFeedback(result)
    record(statsKey, result.correct)
    if (result.correct) {
      timeoutRef.current = window.setTimeout(nextQuestion, 520)
    }
  }, [answer, feedback, nextQuestion, question, record, statsKey])

  useEffect(() => {
    setQuestion(generateMelodyQuestion(settings.length))
    setAnswer([])
    setFeedback(null)
    return () => clearPendingTimeout(timeoutRef)
  }, [settings.length, settings.playbackMode])

  useHotkeys(
    useMemo(
      () => ({
        onNumber: (index) => {
          const note = melodyAnswerOptions[index - 1]
          if (note) addNote(note)
        },
        onBackspace: () => setAnswer((current) => current.slice(0, -1)),
        onSpace: () => {
          if (feedback && !feedback.correct) nextQuestion()
        },
        onReplay: playCurrent,
        onReset: () => reset(statsKey)
      }),
      [addNote, feedback, nextQuestion, playCurrent, reset, statsKey]
    )
  )

  return (
    <section className="module-panel" data-testid="module-melody">
      <ModuleHeader title="旋律短句听写" />
      <div className="settings-row">
        <SegmentedControl
          label="长度"
          value={String(settings.length)}
          options={MELODY_LENGTHS.map((length) => ({ value: String(length), label: `${length} 个音` }))}
          onChange={(value) => updateSettings({ ...settings, length: Number(value) as MelodyLength })}
        />
        <SegmentedControl
          label="播放"
          value={settings.playbackMode}
          options={[
            { value: 'scale-do-melody', label: '音阶 + Do + 旋律' },
            { value: 'do-melody', label: 'Do + 旋律' }
          ]}
          onChange={(value) => updateSettings({ ...settings, playbackMode: value as AppPreferences['melody']['playbackMode'] })}
        />
      </div>
      <div className="primary-actions">
        <button type="button" className="primary" onClick={playCurrent}>
          播放旋律
        </button>
      </div>
      <div className="answer-strip" aria-label="用户答案">
        {Array.from({ length: settings.length }, (_, index) => (
          <span key={index}>{answer[index] ?? ''}</span>
        ))}
      </div>
      <OptionGrid>
        {melodyAnswerOptions.map((option) => (
          <button key={option} type="button" disabled={Boolean(feedback)} onClick={() => addNote(option)}>
            {option}
          </button>
        ))}
      </OptionGrid>
      <div className="secondary-actions">
        <button type="button" disabled={Boolean(feedback) || answer.length === 0} onClick={() => setAnswer((current) => current.slice(0, -1))}>
          退格
        </button>
        <button type="button" disabled={Boolean(feedback) || answer.length === 0} onClick={() => setAnswer([])}>
          清空
        </button>
        <button type="button" className="primary" disabled={Boolean(feedback)} onClick={submit}>
          提交
        </button>
      </div>
      <FeedbackPanel feedback={feedback} onNext={nextQuestion} />
      <StatsPanel stats={getStats(stats, statsKey)} onReset={() => reset(statsKey)} />
    </section>
  )
}

function ChordTrainer({
  audioSettings,
  stats,
  settings,
  updateSettings,
  recordAnswer: record,
  resetStats: reset
}: {
  audioSettings: AudioSettings
  stats: StatsState
  settings: AppPreferences['chord']
  updateSettings: (settings: AppPreferences['chord']) => void
  recordAnswer: (key: StatsKey, correct: boolean) => void
  resetStats: (key: StatsKey) => void
}) {
  const statsKey = getChordStatsKey(settings.stage)
  const [question, setQuestion] = useState<ChordQuestion>(() => generateChordQuestion(settings.stage))
  const [feedback, setFeedback] = useState<AnswerResult | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const autoPlayedQuestionIdRef = useRef<string | null>(null)
  const options = chordQualitiesForStage(settings.stage)

  const nextQuestion = useCallback(() => {
    clearPendingTimeout(timeoutRef)
    setQuestion((current) =>
      generateChordQuestion(settings.stage, { previousQuestionKey: `${current.root}:${current.quality}` })
    )
    setFeedback(null)
  }, [settings.stage])

  const playCurrent = useCallback(() => {
    void audioEngine.playArpeggioThenChord(question.playbackNotes, audioSettings)
  }, [audioSettings, question.playbackNotes])

  useEffect(() => {
    if (feedback || autoPlayedQuestionIdRef.current === question.id) {
      return
    }

    autoPlayedQuestionIdRef.current = question.id
    const timer = window.setTimeout(playCurrent, 120)
    return () => window.clearTimeout(timer)
  }, [feedback, playCurrent, question.id])

  const submit = useCallback(
    (answer: typeof options[number]) => {
      if (feedback) return
      const result = checkChordAnswer(question, answer)
      setFeedback(result)
      record(statsKey, result.correct)
      if (result.correct) {
        timeoutRef.current = window.setTimeout(nextQuestion, 520)
      }
    },
    [feedback, nextQuestion, question, record, statsKey]
  )

  useEffect(() => {
    setQuestion(generateChordQuestion(settings.stage))
    setFeedback(null)
    return () => clearPendingTimeout(timeoutRef)
  }, [settings.stage])

  useHotkeys(
    useMemo(
      () => ({
        onNumber: (index) => {
          const quality = options[index - 1]
          if (quality) submit(quality)
        },
        onSpace: () => {
          if (feedback && !feedback.correct) nextQuestion()
        },
        onReplay: playCurrent,
        onReset: () => reset(statsKey)
      }),
      [feedback, nextQuestion, options, playCurrent, reset, statsKey, submit]
    )
  )

  return (
    <section className="module-panel" data-testid="module-chord">
      <ModuleHeader title="和弦性质听辨" />
      <div className="settings-row">
        <SegmentedControl
          label="阶段"
          value={String(settings.stage)}
          options={[
            { value: '1', label: '阶段 1' },
            { value: '2', label: '阶段 2' },
            { value: '3', label: '阶段 3' },
            { value: '4', label: '阶段 4' }
          ]}
          onChange={(value) => updateSettings({ stage: Number(value) as ChordStage })}
        />
      </div>
      <div className="primary-actions">
        <button type="button" className="primary" onClick={playCurrent}>
          重播题目
        </button>
      </div>
      <OptionGrid>
        {options.map((option) => (
          <button key={option} type="button" disabled={Boolean(feedback)} onClick={() => submit(option)}>
            {CHORD_LABELS[option]}
          </button>
        ))}
      </OptionGrid>
      <FeedbackPanel feedback={feedback} onNext={nextQuestion} />
      <StatsPanel stats={getStats(stats, statsKey)} onReset={() => reset(statsKey)} />
    </section>
  )
}

function IntervalTrainer({
  stats,
  settings,
  updateSettings,
  recordAnswer: record,
  resetStats: reset
}: {
  stats: StatsState
  settings: AppPreferences['interval']
  updateSettings: (settings: AppPreferences['interval']) => void
  recordAnswer: (key: StatsKey, correct: boolean) => void
  resetStats: (key: StatsKey) => void
}) {
  const statsKey = getIntervalStatsKey(settings.timeLimit, settings.mode)
  const [question, setQuestion] = useState<IntervalQuestion>(() => generateIntervalQuestion(settings.mode))
  const [feedback, setFeedback] = useState<AnswerResult | null>(null)
  const [pitchAnswer, setPitchAnswer] = useState<{
    letter?: NaturalNote
    accidental?: Extract<Accidental, 'b' | '' | '#'>
  }>({})
  const [intervalAnswer, setIntervalAnswer] = useState<{
    number?: (typeof INTERVAL_NUMBERS)[number]
    quality?: (typeof INTERVAL_QUALITIES)[number]
  }>({})
  const [remaining, setRemaining] = useState<number>(settings.timeLimit)
  const lockedRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  const nextQuestion = useCallback(() => {
    clearPendingTimeout(timeoutRef)
    lockedRef.current = false
    setQuestion((current) => generateIntervalQuestion(settings.mode, { previousQuestionKey: intervalQuestionKey(current) }))
    setFeedback(null)
    setPitchAnswer({})
    setIntervalAnswer({})
    setRemaining(settings.timeLimit)
  }, [settings.mode, settings.timeLimit])

  const finish = useCallback(
    (answer: string, timedOut = false) => {
      if (lockedRef.current) return
      lockedRef.current = true
      const result = timedOut
        ? {
            correct: false,
            correctAnswer: getIntervalCorrectAnswer(question),
            userAnswer: '超时',
            explanation: `${question.root} -> ${question.top} = ${INTERVAL_LABELS[question.interval]}`
          }
        : checkIntervalAnswer(question, answer)

      setFeedback(result)
      record(statsKey, result.correct)
      if (result.correct) {
        timeoutRef.current = window.setTimeout(nextQuestion, 560)
      }
    },
    [nextQuestion, question, record, statsKey]
  )

  const updatePitchAnswer = useCallback(
    (partial: { letter?: NaturalNote; accidental?: Extract<Accidental, 'b' | '' | '#'> }) => {
      if (feedback || question.missing === 'interval') return

      setPitchAnswer((current) => {
        const next = { ...current, ...partial }
        if (next.letter && next.accidental !== undefined) {
          window.setTimeout(() => finish(`${next.letter}${next.accidental}`), 0)
        }
        return next
      })
    },
    [feedback, finish, question.missing]
  )

  const updateIntervalAnswer = useCallback(
    (partial: { number?: (typeof INTERVAL_NUMBERS)[number]; quality?: (typeof INTERVAL_QUALITIES)[number] }) => {
      if (feedback || question.missing !== 'interval') return

      setIntervalAnswer((current) => {
        const next = { ...current, ...partial }
        if (next.number && next.quality && !isValidIntervalQuality(next.number, next.quality)) {
          next.quality = undefined
        }
        if (next.number && next.quality) {
          window.setTimeout(() => finish(`${next.quality}${next.number}`), 0)
        }
        return next
      })
    },
    [feedback, finish, question.missing]
  )

  useEffect(() => {
    lockedRef.current = false
    clearPendingTimeout(timeoutRef)
    setQuestion(generateIntervalQuestion(settings.mode))
    setFeedback(null)
    setPitchAnswer({})
    setIntervalAnswer({})
    setRemaining(settings.timeLimit)
  }, [settings.mode])

  useEffect(() => {
    lockedRef.current = false
    setFeedback(null)
    setPitchAnswer({})
    setIntervalAnswer({})
    setRemaining(settings.timeLimit)
    const deadline = Date.now() + settings.timeLimit * 1000
    const timer = window.setInterval(() => {
      if (lockedRef.current) return
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(next)
      if (next <= 0) {
        window.clearInterval(timer)
        finish('', true)
      }
    }, 250)

    return () => {
      window.clearInterval(timer)
      clearPendingTimeout(timeoutRef)
    }
  }, [finish, question.id, settings.mode, settings.timeLimit])

  useHotkeys(
    useMemo(
      () => ({
        onSpace: () => {
          if (feedback && !feedback.correct) nextQuestion()
        },
        onReset: () => reset(statsKey)
      }),
      [feedback, nextQuestion, reset, statsKey]
    )
  )

  return (
    <section className="module-panel" data-testid="module-interval">
      <ModuleHeader title="根音冠音音程速算" />
      <div className="settings-row">
        <SegmentedControl
          label="限时"
          value={String(settings.timeLimit)}
          options={[
            { value: '5', label: '5 秒' },
            { value: '10', label: '10 秒' }
          ]}
          onChange={(value) => updateSettings({ ...settings, timeLimit: Number(value) as AppPreferences['interval']['timeLimit'] })}
        />
        <SegmentedControl
          label="模式"
          value={settings.mode}
          options={[
            { value: 'missing-top', label: '算冠音' },
            { value: 'missing-root', label: '算根音' },
            { value: 'missing-interval', label: '算音程' },
            { value: 'mixed', label: '混合' }
          ]}
          onChange={(value) => updateSettings({ ...settings, mode: value as IntervalMode })}
        />
      </div>
      <div className="timer-row">
        <div className="timer-bar">
          <span style={{ width: `${(remaining / settings.timeLimit) * 100}%` }} />
        </div>
        <strong>{remaining}s</strong>
      </div>
      <div className="interval-prompt">
        <PromptField label="根音" value={question.missing === 'root' ? '?' : question.root} />
        <PromptField label="冠音" value={question.missing === 'top' ? '?' : question.top} />
        <PromptField
          label="音程"
          value={question.missing === 'interval' ? '?' : INTERVAL_LABELS[question.interval]}
        />
      </div>
      {question.missing === 'interval' ? (
        <PickerRows>
          <PickerRow label="度数">
            {INTERVAL_NUMBERS.map((number) => (
              <button
                key={number}
                type="button"
                className={intervalAnswer.number === number ? 'active' : ''}
                disabled={Boolean(feedback)}
                onClick={() => updateIntervalAnswer({ number })}
              >
                {number}度
              </button>
            ))}
          </PickerRow>
          <PickerRow label="性质">
            {INTERVAL_QUALITIES.map((quality) => {
              const disabled =
                Boolean(feedback) ||
                (intervalAnswer.number !== undefined && !isValidIntervalQuality(intervalAnswer.number, quality))
              return (
                <button
                  key={quality}
                  type="button"
                  className={intervalAnswer.quality === quality ? 'active' : ''}
                  disabled={disabled}
                  onClick={() => updateIntervalAnswer({ quality })}
                >
                  {INTERVAL_QUALITY_LABELS[quality]}
                </button>
              )
            })}
          </PickerRow>
        </PickerRows>
      ) : (
        <PickerRows>
          <PickerRow label="音名">
            {(['C', 'D', 'E', 'F', 'G', 'A', 'B'] as NaturalNote[]).map((letter) => (
              <button
                key={letter}
                type="button"
                className={pitchAnswer.letter === letter ? 'active' : ''}
                disabled={Boolean(feedback)}
                onClick={() => updatePitchAnswer({ letter })}
              >
                {letter}
              </button>
            ))}
          </PickerRow>
          <PickerRow label="升降">
            {INTERVAL_PITCH_ACCIDENTALS.map((accidental) => (
              <button
                key={accidental || 'natural'}
                type="button"
                className={pitchAnswer.accidental === accidental ? 'active' : ''}
                disabled={Boolean(feedback)}
                onClick={() => updatePitchAnswer({ accidental })}
              >
                {formatAccidental(accidental)}
              </button>
            ))}
          </PickerRow>
        </PickerRows>
      )}
      <FeedbackPanel feedback={feedback} onNext={nextQuestion} />
      <StatsPanel stats={getStats(stats, statsKey)} onReset={() => reset(statsKey)} />
    </section>
  )
}

type SyncopationPhase = 'idle' | 'count-in' | 'playing' | 'feedback'
type RhythmPlaybackMode = 'none' | 'demo' | 'user' | 'comparison'
type RhythmActiveCells = {
  standard: number | null
  user: number | null
}

function SyncopationTrainer({
  stats,
  settings,
  updateSettings,
  recordAnswer: record,
  resetStats: reset
}: {
  stats: StatsState
  settings: AppPreferences['syncopation']
  updateSettings: (settings: AppPreferences['syncopation']) => void
  recordAnswer: (key: StatsKey, correct: boolean) => void
  resetStats: (key: StatsKey) => void
}) {
  const statsKey = getSyncopationStatsKey(settings.difficulty, settings.bpm, settings.meter)
  const [question, setQuestion] = useState<SyncopationQuestion>(() => generateSyncopationQuestion(settings))
  const [phase, setPhase] = useState<SyncopationPhase>('idle')
  const [feedback, setFeedback] = useState<SyncopationResult | null>(null)
  const [hitCount, setHitCount] = useState(0)
  const [playbackMode, setPlaybackMode] = useState<RhythmPlaybackMode>('none')
  const [activeCells, setActiveCells] = useState<RhythmActiveCells>({ standard: null, user: null })
  const [lastAttemptHitTimes, setLastAttemptHitTimes] = useState<number[]>([])
  const hitTimesRef = useRef<number[]>([])
  const runStartRef = useRef<number | null>(null)
  const countInTimeoutRef = useRef<number | null>(null)
  const finishTimeoutRef = useRef<number | null>(null)
  const playbackTimeoutRefs = useRef<number[]>([])

  const clearRunTimers = useCallback(() => {
    clearPendingTimeout(countInTimeoutRef)
    clearPendingTimeout(finishTimeoutRef)
  }, [])

  const clearPlaybackTimers = useCallback(() => {
    playbackTimeoutRefs.current.forEach((timer) => window.clearTimeout(timer))
    playbackTimeoutRefs.current = []
    setActiveCells({ standard: null, user: null })
    setPlaybackMode('none')
  }, [])

  const finish = useCallback(() => {
    clearRunTimers()
    const hitTimes = [...hitTimesRef.current]
    const result = checkSyncopationAnswer(question, settings.bpm, hitTimes, settings.inputCalibrationMs)
    setLastAttemptHitTimes(hitTimes)
    setFeedback(result)
    setPhase('feedback')
    record(statsKey, result.correct)
  }, [clearRunTimers, question, record, settings.bpm, settings.inputCalibrationMs, statsKey])

  const start = useCallback(() => {
    clearRunTimers()
    clearPlaybackTimers()
    hitTimesRef.current = []
    runStartRef.current = null
    setHitCount(0)
    setLastAttemptHitTimes([])
    setFeedback(null)
    setPhase('count-in')
    void metronome.playCountInAndBar(settings.bpm, settings.meter)

    const countInMs = getCountInDurationMs(settings.bpm, settings.meter)
    const barMs = getSyncopationBarDurationMs(settings.bpm, settings.meter)
    countInTimeoutRef.current = window.setTimeout(() => {
      runStartRef.current = Date.now()
      setPhase('playing')
    }, countInMs)
    finishTimeoutRef.current = window.setTimeout(finish, countInMs + barMs + 80)
  }, [clearPlaybackTimers, clearRunTimers, finish, settings.bpm, settings.meter])

  const playDemo = useCallback(() => {
    if (phase === 'count-in' || phase === 'playing') return
    clearPlaybackTimers()
    setPlaybackMode('demo')
    void metronome.playCountInAndRhythm(question.cells, settings.bpm, settings.meter)

    const countInMs = getCountInDurationMs(settings.bpm, settings.meter)
    const events = buildRhythmDemoEvents(question.cells, settings.bpm)
    events.forEach((event) => {
      playbackTimeoutRefs.current.push(
        window.setTimeout(() => {
          setActiveCells({ standard: event.index, user: null })
        }, countInMs + event.timeMs)
      )
    })
    playbackTimeoutRefs.current.push(
      window.setTimeout(() => {
        setActiveCells({ standard: null, user: null })
        setPlaybackMode('none')
        }, countInMs + getSyncopationBarDurationMs(settings.bpm, settings.meter) + 80)
    )
  }, [clearPlaybackTimers, phase, question.cells, settings.bpm, settings.meter])

  const scheduleReplayHighlights = useCallback(
    (events: RhythmReplayEvent[]) => {
      const countInMs = getCountInDurationMs(settings.bpm, settings.meter)
      events.forEach((event) => {
        playbackTimeoutRefs.current.push(
          window.setTimeout(() => {
            setActiveCells((current) => ({
              ...current,
              [event.kind]: event.index
            }))
          }, countInMs + event.timeMs)
        )
      })
      playbackTimeoutRefs.current.push(
        window.setTimeout(() => {
          setActiveCells({ standard: null, user: null })
          setPlaybackMode('none')
        }, countInMs + getSyncopationBarDurationMs(settings.bpm, settings.meter) + 120)
      )
    },
    [settings.bpm, settings.meter]
  )

  const calibratedAttemptHitTimes = useMemo(
    () => lastAttemptHitTimes.map((timeMs) => timeMs + settings.inputCalibrationMs),
    [lastAttemptHitTimes, settings.inputCalibrationMs]
  )

  const replayUser = useCallback(() => {
    if (phase !== 'feedback' || lastAttemptHitTimes.length === 0) return
    clearPlaybackTimers()
    setPlaybackMode('user')
    void metronome.playCountInAndUserHits(calibratedAttemptHitTimes, settings.bpm, settings.meter)
    scheduleReplayHighlights(buildUserReplayEvents(calibratedAttemptHitTimes, settings.bpm, question.cells.length))
  }, [calibratedAttemptHitTimes, clearPlaybackTimers, lastAttemptHitTimes.length, phase, question.cells.length, scheduleReplayHighlights, settings.bpm, settings.meter])

  const replayComparison = useCallback(() => {
    if (phase !== 'feedback' || lastAttemptHitTimes.length === 0) return
    clearPlaybackTimers()
    setPlaybackMode('comparison')
    void metronome.playCountInAndComparison(question.cells, calibratedAttemptHitTimes, settings.bpm, settings.meter)
    scheduleReplayHighlights(buildComparisonEvents(question.cells, settings.bpm, calibratedAttemptHitTimes))
  }, [calibratedAttemptHitTimes, clearPlaybackTimers, lastAttemptHitTimes.length, phase, question.cells, scheduleReplayHighlights, settings.bpm, settings.meter])

  const tap = useCallback(() => {
    if (phase === 'idle') {
      start()
      return
    }
    if (phase !== 'playing' || runStartRef.current === null) return
    hitTimesRef.current = [...hitTimesRef.current, Date.now() - runStartRef.current]
    setHitCount(hitTimesRef.current.length)
  }, [phase, start])

  const nextQuestion = useCallback(() => {
    clearRunTimers()
    clearPlaybackTimers()
    setQuestion((current) =>
      generateSyncopationQuestion(settings, { previousQuestionKey: current.templateId })
    )
    hitTimesRef.current = []
    runStartRef.current = null
    setHitCount(0)
    setLastAttemptHitTimes([])
    setFeedback(null)
    setPhase('idle')
  }, [clearPlaybackTimers, clearRunTimers, settings])

  useEffect(() => {
    clearRunTimers()
    clearPlaybackTimers()
    setQuestion(generateSyncopationQuestion(settings))
    hitTimesRef.current = []
    runStartRef.current = null
    setHitCount(0)
    setLastAttemptHitTimes([])
    setFeedback(null)
    setPhase('idle')
    return () => {
      clearRunTimers()
      clearPlaybackTimers()
    }
  }, [clearPlaybackTimers, clearRunTimers, settings.bpm, settings.difficulty, settings.meter])

  useHotkeys(
    useMemo(
      () => ({
        onSpace: () => {
          if (phase === 'feedback') {
            nextQuestion()
            return
          }
          tap()
        },
        onReset: () => reset(statsKey)
      }),
      [nextQuestion, phase, reset, statsKey, tap]
    )
  )

  const phaseLabel = {
    idle: '准备',
    'count-in': '预备拍',
    playing: '跟拍中',
    feedback: '已完成'
  }[phase]
  const isPlaybackActive = playbackMode !== 'none'
  const canPlayDemo = (phase === 'idle' || phase === 'feedback') && !isPlaybackActive
  const canReplayAttempt = phase === 'feedback' && lastAttemptHitTimes.length > 0 && !isPlaybackActive

  return (
    <section className="module-panel" data-testid="module-syncopation">
      <ModuleHeader title="切分节奏跟拍" />
      <div className="settings-row">
        <SegmentedControl
          label="难度"
          value={String(settings.difficulty)}
          options={SYNCOPATION_DIFFICULTIES.map((difficulty) => ({
            value: String(difficulty),
            label: SYNCOPATION_DIFFICULTY_LABELS[difficulty]
          }))}
          onChange={(value) =>
            updateSettings({ ...settings, difficulty: Number(value) as AppPreferences['syncopation']['difficulty'] })
          }
        />
        <SegmentedControl
          label="速度"
          value={String(settings.bpm)}
          options={SYNCOPATION_BPM_OPTIONS.map((bpm) => ({ value: String(bpm), label: `${bpm} bpm` }))}
          onChange={(value) => updateSettings({ ...settings, bpm: Number(value) as AppPreferences['syncopation']['bpm'] })}
        />
        <SegmentedControl
          label="拍号"
          value={settings.meter}
          options={SYNCOPATION_METER_OPTIONS.map((meter) => ({ value: meter, label: meter }))}
          onChange={(value) => updateSettings({ ...settings, meter: value as AppPreferences['syncopation']['meter'] })}
        />
        <SegmentedControl
          label="显示"
          value={settings.notation}
          options={[
            { value: 'jianpu', label: SYNCOPATION_NOTATION_LABELS.jianpu },
            { value: 'staff', label: SYNCOPATION_NOTATION_LABELS.staff }
          ]}
          onChange={(value) => updateSettings({ ...settings, notation: value as AppPreferences['syncopation']['notation'] })}
        />
        <label className="calibration-control">
          <span>输入校准</span>
          <input
            type="range"
            min="-200"
            max="200"
            step="10"
            value={settings.inputCalibrationMs}
            onChange={(event) => updateSettings({ ...settings, inputCalibrationMs: Number(event.target.value) })}
          />
          <strong>{settings.inputCalibrationMs}ms</strong>
          <small>使用空格可能会有约 140ms 的延迟</small>
        </label>
      </div>
      <div className="syncopation-status">
        <span>训练：{question.description}</span>
        <span>状态：{phaseLabel}</span>
        <span>已拍：{hitCount}</span>
      </div>
      {settings.notation === 'jianpu' ? (
        <JianpuRhythm cells={question.cells} meter={question.meter} evaluation={feedback?.evaluation ?? null} activeCells={activeCells} />
      ) : (
        <StaffRhythm cells={question.cells} meter={question.meter} evaluation={feedback?.evaluation ?? null} activeCells={activeCells} />
      )}
      <div className="syncopation-actions">
        <button type="button" className="primary" disabled={phase === 'count-in' || phase === 'playing' || isPlaybackActive} onClick={start}>
          {phase === 'feedback' ? '再来一次' : '开始'}
        </button>
        <button type="button" disabled={!canPlayDemo} onClick={playDemo}>
          {playbackMode === 'demo' ? '示范中' : '正确节奏'}
        </button>
        <button type="button" className="tap-button" disabled={phase !== 'playing' || isPlaybackActive} onClick={tap}>
          拍
        </button>
        <button type="button" disabled={phase === 'count-in' || phase === 'playing' || isPlaybackActive} onClick={nextQuestion}>
          下一题
        </button>
      </div>
      <SyncopationFeedback
        feedback={feedback}
        canReplayAttempt={canReplayAttempt}
        playbackMode={playbackMode}
        onReplayUser={replayUser}
        onReplayComparison={replayComparison}
        onNext={nextQuestion}
      />
      <StatsPanel stats={getStats(stats, statsKey)} onReset={() => reset(statsKey)} />
    </section>
  )
}

function JianpuRhythm({
  cells,
  meter,
  evaluation,
  activeCells
}: {
  cells: SyncopationQuestion['cells']
  meter: RhythmMeter
  evaluation: RhythmEvaluation | null
  activeCells: RhythmActiveCells
}) {
  const ticksPerBar = getTicksPerBar(meter)
  const bars = splitRhythmIntoBars(cells, ticksPerBar)
  const width = 1180
  const height = 170
  const left = 28
  const right = 28
  const top = 24
  const bottom = 132
  const noteY = 82
  const barWidth = (width - left - right) / bars.length
  return (
    <div className="jianpu-rhythm" aria-label="简谱节奏型">
      <svg className="jianpu-score-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${meter} 四小节简谱节奏`}>
        <rect x={left} y={top} width={width - left - right} height={bottom - top} rx="8" className="jianpu-score-bg" />
        {bars.map((bar) => {
          const barX = left + bar.barIndex * barWidth
          return (
            <g key={bar.barIndex}>
              <line x1={barX} y1={top} x2={barX} y2={bottom} className="jianpu-barline" />
              <text x={barX + 10} y={top + 18} className="jianpu-measure-label">{bar.barIndex + 1}</text>
              {Array.from({ length: getBeatsPerBar(meter) - 1 }, (_, beatIndex) => {
                const beatX = barX + (beatIndex + 1) * getTicksPerBeat() / ticksPerBar * barWidth
                return <line key={beatIndex} x1={beatX} y1={top + 12} x2={beatX} y2={bottom - 12} className="jianpu-beatline" />
              })}
              {bar.events.map((event, eventIndex) => {
                const absoluteStart = bar.startTick + event.start
                const eventState = getJianpuEventState(event, absoluteStart, evaluation, activeCells)
                const symbolPadding = 18
                const usableWidth = barWidth - symbolPadding * 2
                const centerX = bar.events.length === 1
                  ? barX + barWidth / 2
                  : barX + symbolPadding + eventIndex * usableWidth / (bar.events.length - 1)
                const visualWidth = Math.max(18, Math.min(30, usableWidth / Math.max(1, bar.events.length)))
                const underlineWidth = event.durationTicks === 3 ? 14 : Math.max(16, Math.min(24, visualWidth))
                const textClass = [
                  'jianpu-symbol',
                  event.kind === 'rest' ? 'rest' : 'note',
                  eventState
                ].filter(Boolean).join(' ')
                const markClass = [
                  'jianpu-event-highlight',
                  eventState
                ].filter(Boolean).join(' ')
                return (
                  <g key={`${bar.barIndex}-${event.start}-${event.kind}`}>
                    {eventState && (
                      <rect
                        x={centerX - visualWidth / 2}
                        y={noteY - 26}
                        width={Math.max(18, visualWidth)}
                        height="56"
                        rx="7"
                        className={markClass}
                      />
                    )}
                    {event.tuplet && (
                      <text x={centerX} y={noteY - 34} className="jianpu-triplet">3</text>
                    )}
                    <text x={centerX} y={noteY} className={textClass}>
                      {event.kind === 'note' ? 'X' : '0'}
                    </text>
                    {event.durationTicks === 9 && <text x={centerX + 18} y={noteY - 4} className="jianpu-dot">.</text>}
                    {event.durationTicks <= 6 && (
                      <line
                        x1={centerX - underlineWidth / 2}
                        y1={noteY + 20}
                        x2={centerX + underlineWidth / 2}
                        y2={noteY + 20}
                        className="jianpu-underline"
                      />
                    )}
                    {event.durationTicks === 3 && (
                      <line
                        x1={centerX - underlineWidth / 2}
                        y1={noteY + 27}
                        x2={centerX + underlineWidth / 2}
                        y2={noteY + 27}
                        className="jianpu-underline"
                      />
                    )}
                  </g>
                )
              })}
            </g>
          )
        })}
        <line x1={width - right} y1={top} x2={width - right} y2={bottom} className="jianpu-barline" />
      </svg>
      <RhythmFeedbackGrid cells={cells} meter={meter} evaluation={evaluation} activeCells={activeCells} />
    </div>
  )
}

function splitRhythmIntoBars(cells: SyncopationQuestion['cells'], ticksPerBar: number) {
  const barCount = Math.ceil(cells.length / ticksPerBar)
  return Array.from({ length: barCount }, (_, barIndex) => {
    const startTick = barIndex * ticksPerBar
    const barCells = cells.slice(startTick, startTick + ticksPerBar)
    return {
      barIndex,
      startTick,
      events: rhythmToNotationEvents(barCells)
    }
  })
}

function getJianpuEventState(
  event: ReturnType<typeof rhythmToNotationEvents>[number],
  absoluteStart: number,
  evaluation: RhythmEvaluation | null,
  activeCells: RhythmActiveCells
) {
  const indexes = Array.from({ length: event.durationTicks }, (_, offset) => absoluteStart + offset)
  if (indexes.some((index) => activeCells.standard === index || activeCells.user === index)) return 'active'
  const target = event.kind === 'note' ? evaluation?.targets.find((candidate) => candidate.index === absoluteStart) : null
  if (target) return target.status
  if (evaluation?.extras.some((candidate) => indexes.includes(candidate.index))) return 'extra'
  return ''
}

function StaffRhythm({
  cells,
  meter,
  evaluation,
  activeCells
}: {
  cells: SyncopationQuestion['cells']
  meter: RhythmMeter
  evaluation: RhythmEvaluation | null
  activeCells: RhythmActiveCells
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    async function renderStaff() {
      if (!containerRef.current) return
      const { Formatter, Renderer, Stave, StaveNote, Voice } = await import('vexflow')
      if (cancelled || !containerRef.current) return
      containerRef.current.innerHTML = ''
      const renderer = new Renderer(containerRef.current, Renderer.Backends.SVG)
      renderer.resize(1100, 180)
      const context = renderer.getContext()
      const stave = new Stave(10, 28, 1040)
      stave.addClef('percussion').addTimeSignature(meter)
      stave.setContext(context).draw()

      const notes = rhythmToNotationEvents(cells).map((event) => {
        const duration = event.durationTicks === 3 ? '16' : event.durationTicks === 4 ? '8' : event.durationTicks === 6 ? '8' : event.durationTicks === 9 ? '8d' : event.durationTicks === 12 ? 'q' : 'q'
        return new StaveNote({
          keys: ['b/4'],
          duration: event.kind === 'rest' ? `${duration}r` : duration,
          clef: 'percussion'
        })
      })
      const voice = new Voice({ numBeats: cells.length / 12, beatValue: 4 }).setStrict(false)
      voice.addTickables(notes)
      new Formatter().joinVoices([voice]).format([voice], 960)
      voice.draw(context, stave)
    }

    void renderStaff()
    return () => {
      cancelled = true
    }
  }, [cells, meter])

  return (
    <div className="staff-rhythm" aria-label="五线谱节奏型">
      <div ref={containerRef} className="staff-canvas" />
      <RhythmFeedbackGrid cells={cells} meter={meter} evaluation={evaluation} activeCells={activeCells} />
    </div>
  )
}

function RhythmFeedbackGrid({
  cells,
  meter,
  evaluation,
  activeCells
}: {
  cells: SyncopationQuestion['cells']
  meter: RhythmMeter
  evaluation: RhythmEvaluation | null
  activeCells: RhythmActiveCells
}) {
  const ticksPerBar = getTicksPerBar(meter)
  const targetByIndex = new Map(evaluation?.targets.map((target) => [target.index, target]) ?? [])
  const extraIndexes = new Set(evaluation?.extras.map((extra) => extra.index) ?? [])
  const activeIndexes = new Set([activeCells.standard, activeCells.user].filter((index): index is number => index !== null))
  const visibleIndexes = cells.flatMap((cell, index) =>
    cell === 'attack' || targetByIndex.has(index) || extraIndexes.has(index) || activeIndexes.has(index) || index % ticksPerBar === 0 ? [index] : []
  )
  return (
    <div className="rhythm-feedback-grid" aria-label="节奏反馈格">
      {visibleIndexes.map((index) => {
        const cell = cells[index]
        const target = targetByIndex.get(index)
        const extra = extraIndexes.has(index)
        const status = extra ? 'extra' : target?.status
        const standardActiveClass = activeCells.standard === index ? 'standard-active' : ''
        const userActiveClass = activeCells.user === index ? 'user-active' : ''
        const demoClass = activeCells.standard === index || activeCells.user === index ? 'demo-active' : ''
        return (
          <div key={`${cell}-${index}`} className={`rhythm-cell ${cell} ${status ?? ''} ${demoClass} ${standardActiveClass} ${userActiveClass}`}>
            <span>{Math.floor(index / ticksPerBar) + 1}.{Math.floor((index % ticksPerBar) / 12) + 1}</span>
            <strong>{getRhythmCellMark(cell, status)}</strong>
          </div>
        )
      })}
    </div>
  )
}

function SyncopationFeedback({
  feedback,
  canReplayAttempt,
  playbackMode,
  onReplayUser,
  onReplayComparison,
  onNext
}: {
  feedback: SyncopationResult | null
  canReplayAttempt: boolean
  playbackMode: RhythmPlaybackMode
  onReplayUser: () => void
  onReplayComparison: () => void
  onNext: () => void
}) {
  if (!feedback) return null
  return (
    <div className={`feedback ${feedback.correct ? 'correct' : 'wrong'}`} role="status">
      <strong>{feedback.correct ? '正确' : '错误'}</strong>
      <span>{feedback.explanation}</span>
      <button type="button" disabled={!canReplayAttempt} onClick={onReplayUser}>
        {playbackMode === 'user' ? '回放中' : '回放我的节奏'}
      </button>
      <button type="button" disabled={!canReplayAttempt} onClick={onReplayComparison}>
        {playbackMode === 'comparison' ? '对比中' : '对比标准'}
      </button>
      <button type="button" disabled={playbackMode !== 'none'} onClick={onNext}>
        下一题
      </button>
    </div>
  )
}

function getRhythmCellMark(cell: SyncopationQuestion['cells'][number], status?: string): string {
  if (status === 'extra') return '多'
  if (status === 'missed') return '漏'
  if (status === 'early') return '早'
  if (status === 'late') return '晚'
  if (status === 'hit') return '准'
  if (cell === 'attack') return 'X'
  if (cell === 'hold') return '—'
  return '0'
}

type RelativePitchSingPhase = 'idle' | 'recording' | 'feedback'

function RelativePitchSingTrainer({
  audioSettings,
  stats,
  settings,
  updateSettings,
  recordAnswer: record,
  resetStats: reset
}: {
  audioSettings: AudioSettings
  stats: StatsState
  settings: AppPreferences['relativePitchSing']
  updateSettings: (settings: AppPreferences['relativePitchSing']) => void
  recordAnswer: (key: StatsKey, correct: boolean) => void
  resetStats: (key: StatsKey) => void
}) {
  const statsKey = getRelativePitchSingStatsKey(settings.difficulty, settings.direction)
  const [question, setQuestion] = useState<RelativePitchSingQuestion>(() => generateRelativePitchSingQuestion(settings))
  const [phase, setPhase] = useState<RelativePitchSingPhase>('idle')
  const [feedback, setFeedback] = useState<RelativePitchSingResult | null>(null)
  const [micMessage, setMicMessage] = useState('准备录音')
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null)
  const recordingTimeoutRef = useRef<number | null>(null)

  const clearRecordingTimer = useCallback(() => {
    clearPendingTimeout(recordingTimeoutRef)
  }, [])

  const replaceRecordingUrl = useCallback((url: string | null) => {
    setRecordingUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return url
    })
  }, [])

  const playDo = useCallback(() => {
    void audioEngine.playNote(question.pattern.direction === 'up' ? 'C4' : 'C5', audioSettings)
  }, [audioSettings, question.pattern.direction])

  const playAnswer = useCallback(() => {
    void audioEngine.playTimedSequence(
      question.notes.map((note) => ({
        note,
        durationMs: audioSettings.durationMs,
        gapAfterMs: 90
      })),
      audioSettings
    )
  }, [audioSettings, question.notes])

  const finishRecording = useCallback(async () => {
    clearRecordingTimer()
    try {
      const analysis = await inputAnalyzer.stopAndAnalyze()
      replaceRecordingUrl(analysis.audioUrl)
      const result = checkRelativePitchSingAnswer(question, analysis.events)
      setFeedback(result)
      setMicMessage(`候选音高 ${analysis.rawFrameCount} 帧，稳定音 ${result.detectedDegrees.length} 个`)
      setPhase('feedback')
      record(statsKey, result.correct)
    } catch (error) {
      setMicMessage(error instanceof Error ? error.message : '录音分析失败')
      setPhase('idle')
    }
  }, [clearRecordingTimer, question, record, statsKey])

  const startRecording = useCallback(async () => {
    clearRecordingTimer()
    setFeedback(null)
    replaceRecordingUrl(null)
    setMicMessage('请求麦克风权限')
    try {
      await audioEngine.playNote(question.pattern.direction === 'up' ? 'C4' : 'C5', audioSettings)
      await inputAnalyzer.start()
      setPhase('recording')
      setMicMessage('录音中，唱完后可手动结束')
      recordingTimeoutRef.current = window.setTimeout(() => {
        void finishRecording()
      }, 10000)
    } catch (error) {
      setPhase('idle')
      setMicMessage(error instanceof Error ? error.message : '无法打开麦克风，请检查浏览器权限')
    }
  }, [audioSettings, clearRecordingTimer, finishRecording, question.pattern.direction, replaceRecordingUrl])

  const nextQuestion = useCallback(() => {
    clearRecordingTimer()
    setQuestion((current) =>
      generateRelativePitchSingQuestion(settings, { previousQuestionKey: current.pattern.id })
    )
    setFeedback(null)
    replaceRecordingUrl(null)
    setPhase('idle')
    setMicMessage('准备录音')
  }, [clearRecordingTimer, replaceRecordingUrl, settings])

  useEffect(() => {
    clearRecordingTimer()
    setQuestion(generateRelativePitchSingQuestion(settings))
    setFeedback(null)
    replaceRecordingUrl(null)
    setPhase('idle')
    setMicMessage('准备录音')
    return () => {
      clearRecordingTimer()
      void inputAnalyzer.cancel().catch(() => undefined)
      replaceRecordingUrl(null)
    }
  }, [clearRecordingTimer, replaceRecordingUrl, settings.difficulty, settings.direction, settings.order])

  return (
    <section className="module-panel" data-testid="module-relative-pitch-sing">
      <ModuleHeader title="相对音高模唱" />
      <div className="settings-row">
        <SegmentedControl
          label="难度"
          value={String(settings.difficulty)}
          options={RELATIVE_PITCH_SING_DIFFICULTIES.map((difficulty) => ({
            value: String(difficulty),
            label: RELATIVE_PITCH_SING_DIFFICULTY_LABELS[difficulty]
          }))}
          onChange={(value) =>
            updateSettings({ ...settings, difficulty: Number(value) as AppPreferences['relativePitchSing']['difficulty'] })
          }
        />
        <SegmentedControl
          label="方向"
          value={settings.direction}
          options={RELATIVE_PITCH_SING_DIRECTIONS.map((direction) => ({
            value: direction,
            label: RELATIVE_PITCH_SING_DIRECTION_LABELS[direction]
          }))}
          onChange={(value) => updateSettings({ ...settings, direction: value as AppPreferences['relativePitchSing']['direction'] })}
        />
        <SegmentedControl
          label="出题"
          value={settings.order}
          options={RELATIVE_PITCH_SING_ORDERS.map((order) => ({
            value: order,
            label: RELATIVE_PITCH_SING_ORDER_LABELS[order]
          }))}
          onChange={(value) => updateSettings({ ...settings, order: value as AppPreferences['relativePitchSing']['order'] })}
        />
      </div>
      <div className="relative-pitch-prompt">
        <span>{RELATIVE_PITCH_SING_DIRECTION_LABELS[question.pattern.direction]}</span>
        <strong>{question.label}</strong>
        <small>1 = C，{question.pattern.direction === 'up' ? '低音 1 为 C4' : '高音 1 为 C5'}</small>
      </div>
      <div className="syncopation-status">
        <span>状态：{phase === 'recording' ? '录音中' : phase === 'feedback' ? '已判定' : '准备'}</span>
        <span>麦克风：{micMessage}</span>
      </div>
      <div className="syncopation-actions">
        <button type="button" onClick={playDo} disabled={phase === 'recording'}>
          播放 do
        </button>
        <button type="button" className="primary" onClick={startRecording} disabled={phase === 'recording'}>
          开始录音
        </button>
        <button type="button" onClick={() => void finishRecording()} disabled={phase !== 'recording'}>
          结束并判定
        </button>
        <button type="button" onClick={playAnswer} disabled={phase === 'recording'}>
          播放标准答案
        </button>
        <button type="button" onClick={nextQuestion} disabled={phase === 'recording'}>
          下一题
        </button>
      </div>
      <RelativePitchSingFeedback feedback={feedback} recordingUrl={recordingUrl} />
      <StatsPanel stats={getStats(stats, statsKey)} onReset={() => reset(statsKey)} />
    </section>
  )
}

function RelativePitchSingFeedback({
  feedback,
  recordingUrl
}: {
  feedback: RelativePitchSingResult | null
  recordingUrl: string | null
}) {
  if (!feedback) return null
  return (
    <div className={`feedback ${feedback.correct ? 'correct' : 'wrong'}`} role="status">
      <strong>{feedback.correct ? '正确' : '错误'}</strong>
      <span>正确序列：{feedback.correctAnswer}</span>
      <span>识别序列：{feedback.userAnswer}</span>
      <span>{feedback.explanation}</span>
      {recordingUrl && <audio controls src={recordingUrl} aria-label="播放录音" />}
    </div>
  )
}

function DegreeChordTrainer({
  stats,
  recordAnswer: record,
  resetStats: reset
}: {
  stats: StatsState
  recordAnswer: (key: StatsKey, correct: boolean) => void
  resetStats: (key: StatsKey) => void
}) {
  const statsKey = getDegreeChordStatsKey()
  const [question, setQuestion] = useState<DegreeChordQuestion>(() => generateDegreeChordQuestion())
  const [answer, setAnswer] = useState<Partial<DegreeChordAnswer>>({})
  const [feedback, setFeedback] = useState<AnswerResult | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const nextQuestion = useCallback(() => {
    clearPendingTimeout(timeoutRef)
    setQuestion((current) => generateDegreeChordQuestion({ previousQuestionKey: degreeChordQuestionKey(current) }))
    setAnswer({})
    setFeedback(null)
  }, [])

  const submit = useCallback(() => {
    if (feedback || !answer.letter || answer.accidental === undefined || !answer.quality) return
    const result = checkDegreeChordAnswer(question, answer as DegreeChordAnswer)
    setFeedback(result)
    record(statsKey, result.correct)
    if (result.correct) {
      timeoutRef.current = window.setTimeout(nextQuestion, 560)
    }
  }, [answer, feedback, nextQuestion, question, record, statsKey])

  useEffect(() => () => clearPendingTimeout(timeoutRef), [])

  useHotkeys(
    useMemo(
      () => ({
        onSpace: () => {
          if (feedback && !feedback.correct) nextQuestion()
        },
        onReset: () => reset(statsKey)
      }),
      [feedback, nextQuestion, reset, statsKey]
    )
  )

  const canSubmit = Boolean(answer.letter && answer.accidental !== undefined && answer.quality && !feedback)

  return (
    <section className="module-panel" data-testid="module-degree-chord">
      <ModuleHeader title="调内级数和弦" />
      <div className="question-display compact">
        <span className="question-label">题目</span>
        <strong>
          {question.key} 大调 · {question.degree}级 {DEGREE_ROMANS[question.degree]}
        </strong>
      </div>
      <PickerRows>
        <PickerRow label="根音">
          {(['C', 'D', 'E', 'F', 'G', 'A', 'B'] as NaturalNote[]).map((letter) => (
            <button
              key={letter}
              type="button"
              className={answer.letter === letter ? 'active' : ''}
              disabled={Boolean(feedback)}
              onClick={() => setAnswer((current) => ({ ...current, letter }))}
            >
              {letter}
            </button>
          ))}
        </PickerRow>
        <PickerRow label="升降">
          {DEGREE_CHORD_ACCIDENTALS.map((accidental) => (
            <button
              key={accidental || 'natural'}
              type="button"
              className={answer.accidental === accidental ? 'active' : ''}
              disabled={Boolean(feedback)}
              onClick={() => setAnswer((current) => ({ ...current, accidental }))}
            >
              {formatAccidental(accidental)}
            </button>
          ))}
        </PickerRow>
        <PickerRow label="类型">
          {DEGREE_CHORD_QUALITIES.map((quality) => (
            <button
              key={quality}
              type="button"
              className={answer.quality === quality ? 'active' : ''}
              disabled={Boolean(feedback)}
              onClick={() => setAnswer((current) => ({ ...current, quality }))}
            >
              {CHORD_LABELS[quality]}
            </button>
          ))}
        </PickerRow>
      </PickerRows>
      <div className="primary-actions">
        <button type="button" className="primary" disabled={!canSubmit} onClick={submit}>
          提交
        </button>
      </div>
      <FeedbackPanel feedback={feedback} onNext={nextQuestion} />
      <StatsPanel stats={getStats(stats, statsKey)} onReset={() => reset(statsKey)} />
    </section>
  )
}

function TriadKeyMatchTrainer({
  stats,
  recordAnswer: record,
  resetStats: reset
}: {
  stats: StatsState
  recordAnswer: (key: StatsKey, correct: boolean) => void
  resetStats: (key: StatsKey) => void
}) {
  const statsKey = getTriadKeyMatchStatsKey()
  const [question, setQuestion] = useState<TriadKeyMatchQuestion>(() => generateTriadKeyMatchQuestion())
  const [selectedKeys, setSelectedKeys] = useState<MajorKey[]>([])
  const [noneSelected, setNoneSelected] = useState(false)
  const [feedback, setFeedback] = useState<AnswerResult | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const nextQuestion = useCallback(() => {
    clearPendingTimeout(timeoutRef)
    setQuestion((current) => generateTriadKeyMatchQuestion({ previousQuestionKey: triadKeyMatchQuestionKey(current) }))
    setSelectedKeys([])
    setNoneSelected(false)
    setFeedback(null)
  }, [])

  const toggleKey = useCallback(
    (key: MajorKey) => {
      if (feedback) return
      setNoneSelected(false)
      setSelectedKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]))
    },
    [feedback]
  )

  const toggleNone = useCallback(() => {
    if (feedback) return
    setSelectedKeys([])
    setNoneSelected((current) => !current)
  }, [feedback])

  const submit = useCallback(() => {
    if (feedback) return
    const result = checkTriadKeyMatchAnswer(question, noneSelected ? NO_MATCHING_MAJOR_KEY : selectedKeys)
    setFeedback(result)
    record(statsKey, result.correct)
    if (result.correct) {
      timeoutRef.current = window.setTimeout(nextQuestion, 560)
    }
  }, [feedback, nextQuestion, noneSelected, question, record, selectedKeys, statsKey])

  useEffect(() => () => clearPendingTimeout(timeoutRef), [])

  useHotkeys(
    useMemo(
      () => ({
        onSpace: () => {
          if (feedback && !feedback.correct) nextQuestion()
        },
        onReset: () => reset(statsKey)
      }),
      [feedback, nextQuestion, reset, statsKey]
    )
  )

  return (
    <section className="module-panel" data-testid="module-triad-key-match">
      <ModuleHeader title="和弦所属大调" />
      <div className="question-display">
        <span className="question-label">三和弦</span>
        <strong>{question.notes.join(' ')}</strong>
      </div>
      <div className="major-key-options">
        {getMajorKeyGroups().map((group) => (
          <div key={group.label} className="option-group">
            <span>{group.label}</span>
            <div>
              {group.keys.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={selectedKeys.includes(key) ? 'active' : ''}
                  disabled={Boolean(feedback)}
                  onClick={() => toggleKey(key)}
                >
                  {key} 大调
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="option-group">
          <span>无</span>
          <div>
            <button
              type="button"
              className={noneSelected ? 'active' : ''}
              disabled={Boolean(feedback)}
              onClick={toggleNone}
            >
              无符合大调
            </button>
          </div>
        </div>
      </div>
      <div className="primary-actions">
        <button type="button" className="primary" disabled={Boolean(feedback)} onClick={submit}>
          提交
        </button>
      </div>
      <FeedbackPanel feedback={feedback} onNext={nextQuestion} />
      <StatsPanel stats={getStats(stats, statsKey)} onReset={() => reset(statsKey)} />
    </section>
  )
}

function ModuleHeader({ title }: { title: string }) {
  return (
    <div className="module-header">
      <h2>{title}</h2>
    </div>
  )
}

function PickerRows({ children }: { children: ReactNode }) {
  return <div className="picker-rows">{children}</div>
}

function PickerRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="picker-row">
      <span>{label}</span>
      <div>{children}</div>
    </div>
  )
}

function StatsPanel({ stats, onReset }: { stats: ReturnType<typeof getStats>; onReset: () => void }) {
  return (
    <div className="stats-row">
      <span>已答 {stats.answered}</span>
      <span>正确 {stats.correct}</span>
      <span>正确率 {accuracy(stats)}%</span>
      <span>连续 {stats.streak}</span>
      <button type="button" onClick={onReset}>
        重新开始
      </button>
    </div>
  )
}

function FeedbackPanel({ feedback, onNext }: { feedback: AnswerResult | null; onNext: () => void }) {
  if (!feedback) {
    return null
  }

  return (
    <div className={`feedback ${feedback.correct ? 'correct' : 'wrong'}`} role="status">
      <strong>{feedback.correct ? '正确' : '错误'}</strong>
      <span>正确答案：{formatAnswer(feedback.correctAnswer)}</span>
      <span>你的答案：{formatAnswer(feedback.userAnswer)}</span>
      {feedback.explanation && <span>{feedback.explanation}</span>}
      {!feedback.correct && (
        <button type="button" onClick={onNext}>
          下一题
        </button>
      )}
    </div>
  )
}

function OptionGrid({ children }: { children: ReactNode }) {
  return <div className="option-grid">{children}</div>
}

function SegmentedControl({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <div className="segmented-control">
      <span>{label}</span>
      <div>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? 'active' : ''}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function PromptField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function useHotkeys(handlers: {
  onNumber?: (index: number) => void
  onSpace?: () => void
  onReset?: () => void
  onReplay?: () => void
  onBackspace?: () => void
}) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) {
        return
      }

      if (/^[1-7]$/.test(event.key)) {
        handlers.onNumber?.(Number(event.key))
        return
      }
      if (event.code === 'Space') {
        event.preventDefault()
        handlers.onSpace?.()
        return
      }
      if (event.key === 'r' || event.key === 'R') {
        handlers.onReset?.()
        return
      }
      if (event.key === 'p' || event.key === 'P') {
        handlers.onReplay?.()
        return
      }
      if (event.key === 'Backspace') {
        handlers.onBackspace?.()
      }
    }

    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [handlers])
}

function clearPendingTimeout(timeoutRef: MutableRefObject<number | null>): void {
  if (timeoutRef.current !== null) {
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }
}

function formatAnswer(answer: string | string[]): string {
  return Array.isArray(answer) ? answer.join(' ') : answer
}

function formatAccidental(accidental: Extract<Accidental, 'b' | '' | '#'>): string {
  if (accidental === 'b') return '♭'
  if (accidental === '#') return '♯'
  return '♮'
}

function isValidIntervalQuality(
  number: (typeof INTERVAL_NUMBERS)[number],
  quality: (typeof INTERVAL_QUALITIES)[number]
): boolean {
  return [4, 5].includes(number) ? ['d', 'P', 'A'].includes(quality) : ['d', 'm', 'M', 'A'].includes(quality)
}
