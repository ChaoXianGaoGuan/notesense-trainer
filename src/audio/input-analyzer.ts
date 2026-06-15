import type { SungPitchEvent } from '../core/relative-pitch'

type FramePitch = {
  midi: number
  cents: number
  timeMs: number
}

export type InputAnalysisResult = {
  events: SungPitchEvent[]
  audioUrl: string | null
}

const MIN_STABLE_DURATION_MS = 160
const SAME_NOTE_GAP_MS = 200
const FRAME_INTERVAL_MS = 60

let mediaStream: MediaStream | null = null
let audioContext: AudioContext | null = null
let analyser: AnalyserNode | null = null
let source: MediaStreamAudioSourceNode | null = null
let intervalId: number | null = null
let recordingStartedAt = 0
let frames: FramePitch[] = []
let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []

export const inputAnalyzer = {
  async start(): Promise<void> {
    await stopRecorder()
    await stop()
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('当前浏览器不支持麦克风录音')
    }

    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    })
    audioContext = new AudioContext()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 4096
    source = audioContext.createMediaStreamSource(mediaStream)
    source.connect(analyser)
    frames = []
    audioChunks = []
    recordingStartedAt = performance.now()

    if (typeof MediaRecorder !== 'undefined') {
      mediaRecorder = new MediaRecorder(mediaStream)
      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      })
      mediaRecorder.start()
    }

    intervalId = window.setInterval(() => {
      if (!analyser || !audioContext) return
      const buffer = new Float32Array(analyser.fftSize)
      analyser.getFloatTimeDomainData(buffer)
      const frequency = detectPitch(buffer, audioContext.sampleRate)
      if (frequency === null) return
      const midiFloat = 69 + 12 * Math.log2(frequency / 440)
      const midi = Math.round(midiFloat)
      frames.push({
        midi,
        cents: Math.round((midiFloat - midi) * 100),
        timeMs: performance.now() - recordingStartedAt
      })
    }, FRAME_INTERVAL_MS)
  },

  async stopAndAnalyze(): Promise<InputAnalysisResult> {
    const capturedFrames = [...frames]
    const audioUrl = await stopRecorder()
    await stop()
    return {
      events: framesToStableEvents(capturedFrames),
      audioUrl
    }
  },

  async cancel(): Promise<void> {
    await stopRecorder()
    await stop()
  }
}

async function stop(): Promise<void> {
  if (intervalId !== null) {
    window.clearInterval(intervalId)
    intervalId = null
  }
  source?.disconnect()
  source = null
  analyser = null
  mediaStream?.getTracks().forEach((track) => track.stop())
  mediaStream = null
  if (audioContext && audioContext.state !== 'closed') {
    await audioContext.close()
  }
  audioContext = null
}

async function stopRecorder(): Promise<string | null> {
  if (!mediaRecorder) return null
  const recorder = mediaRecorder
  mediaRecorder = null

  if (recorder.state !== 'inactive') {
    await new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true })
      recorder.stop()
    })
  }

  if (audioChunks.length === 0) return null
  const mimeType = recorder.mimeType || 'audio/webm'
  const blob = new Blob(audioChunks, { type: mimeType })
  audioChunks = []
  return URL.createObjectURL(blob)
}

export function framesToStableEvents(framePitches: FramePitch[]): SungPitchEvent[] {
  const events: SungPitchEvent[] = []
  let current: FramePitch[] = []

  const flush = () => {
    if (current.length === 0) return
    const durationMs = current.at(-1)!.timeMs - current[0].timeMs + FRAME_INTERVAL_MS
    if (durationMs >= MIN_STABLE_DURATION_MS) {
      const midi = mode(current.map((frame) => frame.midi))
      const relevantFrames = current.filter((frame) => frame.midi === midi)
      const cents = Math.round(average(relevantFrames.map((frame) => frame.cents)))
      const previous = events.at(-1)
      if (previous && previous.midi === midi) {
        previous.durationMs += durationMs
        previous.cents = Math.round((previous.cents + cents) / 2)
      } else {
        events.push({ midi, cents, durationMs })
      }
    }
    current = []
  }

  for (const frame of framePitches) {
    const previous = current.at(-1)
    if (!previous || (previous.midi === frame.midi && frame.timeMs - previous.timeMs <= SAME_NOTE_GAP_MS)) {
      current.push(frame)
      continue
    }
    flush()
    current.push(frame)
  }
  flush()
  return events
}

function detectPitch(buffer: Float32Array, sampleRate: number): number | null {
  const rms = Math.sqrt(buffer.reduce((sum, sample) => sum + sample * sample, 0) / buffer.length)
  if (rms < 0.015) return null

  let bestOffset = -1
  let bestCorrelation = 0
  const minOffset = Math.floor(sampleRate / 900)
  const maxOffset = Math.floor(sampleRate / 80)

  for (let offset = minOffset; offset <= maxOffset; offset += 1) {
    let correlation = 0
    for (let index = 0; index < buffer.length - offset; index += 1) {
      correlation += buffer[index] * buffer[index + offset]
    }
    correlation /= buffer.length - offset
    if (correlation > bestCorrelation) {
      bestCorrelation = correlation
      bestOffset = offset
    }
  }

  if (bestOffset === -1 || bestCorrelation < 0.002) return null
  return sampleRate / bestOffset
}

function mode(values: number[]): number {
  const counts = new Map<number, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0][0]
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
}
