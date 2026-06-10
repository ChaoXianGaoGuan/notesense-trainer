import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject, ReactNode, SetStateAction } from 'react'
import { audioEngine } from '../audio/engine'
import { CHORD_LABELS } from '../core/chords'
import { INTERVAL_LABELS, type IntervalName } from '../core/intervals'
import { SOLFEGE_OPTIONS, solfegeToOctavePitch } from '../core/notes'
import type { AnswerResult, AudioSettings, NaturalNote, Solfege, StatsKey, Timbre } from '../core/types'
import {
  checkChordAnswer,
  chordQualitiesForStage,
  generateChordQuestion,
  getChordStatsKey,
  type ChordQuestion,
  type ChordStage
} from '../modules/chord-quality'
import {
  generateIntervalQuestion,
  getIntervalCorrectAnswer,
  getIntervalStatsKey,
  intervalQuestionKey,
  checkIntervalAnswer,
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
  { id: 'interval-speed', label: '根音冠音音程速算' }
]

const TIMBRES: Array<{ value: Timbre; label: string }> = [
  { value: 'piano', label: '钢琴' },
  { value: 'guitar', label: '吉他' }
]

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

      {preferences.activeModule !== 'interval-speed' && (
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
  const statsKey = getIntervalStatsKey(settings.timeLimit)
  const [question, setQuestion] = useState<IntervalQuestion>(() => generateIntervalQuestion())
  const [feedback, setFeedback] = useState<AnswerResult | null>(null)
  const [remaining, setRemaining] = useState<number>(settings.timeLimit)
  const lockedRef = useRef(false)
  const timeoutRef = useRef<number | null>(null)

  const nextQuestion = useCallback(() => {
    clearPendingTimeout(timeoutRef)
    lockedRef.current = false
    setQuestion((current) => generateIntervalQuestion({ previousQuestionKey: intervalQuestionKey(current) }))
    setFeedback(null)
    setRemaining(settings.timeLimit)
  }, [settings.timeLimit])

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

  useEffect(() => {
    lockedRef.current = false
    setFeedback(null)
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
  }, [finish, question.id, settings.timeLimit])

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

  const optionGroups =
    question.missing === 'interval'
      ? groupIntervals(question.answerOptions as IntervalName[])
      : [{ label: '音名', options: question.answerOptions }]

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
          onChange={(value) => updateSettings({ timeLimit: Number(value) as AppPreferences['interval']['timeLimit'] })}
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
      <div className={question.missing === 'interval' ? 'interval-options grouped' : 'interval-options'}>
        {optionGroups.map((group) => (
          <div key={group.label} className="option-group">
            <span>{group.label}</span>
            <div>
              {group.options.map((option) => (
                <button key={option} type="button" disabled={Boolean(feedback)} onClick={() => finish(option)}>
                  {question.missing === 'interval' ? INTERVAL_LABELS[option as IntervalName] : option}
                </button>
              ))}
            </div>
          </div>
        ))}
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

function groupIntervals(options: IntervalName[]): Array<{ label: string; options: IntervalName[] }> {
  return [2, 3, 4, 5, 6, 7, 8].map((number) => ({
    label: `${number}度`,
    options: options.filter((option) => option.endsWith(String(number)))
  }))
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
