import { create } from 'zustand'

/** 창밖 새소리. 출처는 public/audio/CREDITS.md */
export const BIRD_URL = '/audio/birds.mp3'

export const BIRD_LOAD_ERROR = '새소리 파일을 열지 못했어요. 잔향은 그대로 쓸 수 있어요'
export const AUDIO_UNSUPPORTED_ERROR = '이 브라우저는 강의실 소리를 재생하지 못해요'

export type AmbientFlags = {
  birds: boolean
  reverb: boolean
}

/** 기본은 둘 다 꺼짐. */
export const AMBIENT_DEFAULT: AmbientFlags = { birds: false, reverb: false }

export type AmbientMix = {
  /** 새소리의 마른 경로. 잔향이 꺼져 있으면 창밖처럼 바로 들린다. */
  dry: number
  /** 새소리를 강의실 잔향으로 보내는 양. */
  birdSend: number
  /** 잔향만 켤 때 들리는 실내 바닥음. */
  room: number
  /** 잔향 출력. */
  wet: number
}

/** 켠 층만 소리가 나게 게인을 정한다. 둘 다 꺼지면 전부 0이다. */
export function ambientMix(flags: AmbientFlags): AmbientMix {
  return {
    dry: flags.birds ? (flags.reverb ? 0.16 : 0.42) : 0,
    birdSend: flags.birds && flags.reverb ? 0.7 : 0,
    room: flags.reverb ? 0.22 : 0,
    wet: flags.reverb ? 0.9 : 0,
  }
}

function nextNoise(state: number): { state: number; value: number } {
  let x = state | 0
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d)
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b)
  x = (x ^ (x >>> 16)) >>> 0
  return { state: x, value: (x / 4294967296) * 2 - 1 }
}

/**
 * 작은 강의실 임펄스. 직접음, 몇 개의 초기 반사, 0.5초 정도 감쇠하는 뒷꼬리.
 * 외부 파일이 아니라 여기서 만든다.
 */
export function makeClassroomImpulse(sampleRate: number, seconds = 0.62): Float32Array {
  const length = Math.max(1, Math.floor(sampleRate * seconds))
  const data = new Float32Array(length)
  data[0] = 1
  const reflections: Array<[number, number]> = [
    [0.011, 0.42],
    [0.017, -0.3],
    [0.026, 0.24],
    [0.038, 0.18],
    [0.055, -0.14],
    [0.079, 0.1],
    [0.11, 0.07],
  ]
  for (const [time, amp] of reflections) {
    const index = Math.round(time * sampleRate)
    if (index > 0 && index < length) data[index] += amp
  }

  const rt60 = 0.5
  const decay = Math.log(1000) / (rt60 * sampleRate)
  let state = 0x6d2b79f5
  for (let i = 1; i < length; i++) {
    const noise = nextNoise(state)
    state = noise.state
    data[i] += noise.value * Math.exp(-decay * i) * 0.2
  }

  let peak = 0
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(data[i]))
  if (peak > 0) {
    for (let i = 0; i < length; i++) data[i] /= peak
  }
  return data
}

/** 잔향에 넣을 낮은 실내 바닥음. 반복해도 경계가 튀지 않게 끝을 죽인다. */
export function makeRoomTone(sampleRate: number, seconds = 1): Float32Array {
  const length = Math.max(1, Math.floor(sampleRate * seconds))
  const data = new Float32Array(length)
  let state = 0x13579bdf
  let low = 0
  for (let i = 0; i < length; i++) {
    const noise = nextNoise(state)
    state = noise.state
    low += 0.02 * (noise.value - low)
    data[i] = low
  }

  let peak = 0
  for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(data[i]))
  const scale = peak > 0 ? 0.35 / peak : 0
  for (let i = 0; i < length; i++) data[i] *= scale
  fadeLoopEdges(data, sampleRate, 0.02)
  return data
}

/** 반복 재생할 버퍼의 시작과 끝을 깎아 경계 클릭을 줄인다. */
export function fadeLoopEdges(data: Float32Array, sampleRate: number, seconds = 0.04): void {
  const fade = Math.min(data.length >> 1, Math.floor(sampleRate * seconds))
  for (let i = 0; i < fade; i++) {
    const gain = i / fade
    data[i] *= gain
    data[data.length - 1 - i] *= gain
  }
}

type Engine = {
  context: AudioContext
  dry: GainNode
  birdSend: GainNode
  room: GainNode
  wet: GainNode
}

let engine: Engine | null = null
let birdReady = false
let chain: Promise<void> = Promise.resolve()

function run(task: () => Promise<void>): Promise<void> {
  const next = chain.then(task, task)
  chain = next.then(
    () => undefined,
    () => undefined,
  )
  return next
}

function applyMix(flags: AmbientFlags, immediate: boolean) {
  if (!engine) return
  const mix = ambientMix(flags)
  const now = engine.context.currentTime
  const assign = (gain: GainNode, value: number) => {
    gain.gain.cancelScheduledValues(now)
    if (immediate) gain.gain.setValueAtTime(value, now)
    else gain.gain.setTargetAtTime(value, now, 0.04)
  }
  assign(engine.dry, mix.dry)
  assign(engine.birdSend, mix.birdSend)
  assign(engine.room, mix.room)
  assign(engine.wet, mix.wet)
}

function audioContext(): AudioContext | null {
  const Ctx = window.AudioContext
  if (!Ctx) return null
  return new Ctx()
}

async function ensureEngine(): Promise<void> {
  if (engine) {
    if (engine.context.state === 'suspended') await engine.context.resume()
    return
  }

  const context = audioContext()
  if (!context) throw new Error(AUDIO_UNSUPPORTED_ERROR)
  try {
    if (context.state === 'suspended') await context.resume()

    const dry = context.createGain()
    const birdSend = context.createGain()
    const room = context.createGain()
    const wet = context.createGain()
    dry.gain.value = 0
    birdSend.gain.value = 0
    room.gain.value = 0
    wet.gain.value = 0

    const convolver = context.createConvolver()
    const impulse = makeClassroomImpulse(context.sampleRate)
    const ir = context.createBuffer(1, impulse.length, context.sampleRate)
    ir.getChannelData(0).set(impulse)
    convolver.buffer = ir

    const toneData = makeRoomTone(context.sampleRate)
    const toneBuffer = context.createBuffer(1, toneData.length, context.sampleRate)
    toneBuffer.getChannelData(0).set(toneData)
    const tone = context.createBufferSource()
    tone.buffer = toneBuffer
    tone.loop = true
    tone.connect(room)

    dry.connect(context.destination)
    birdSend.connect(convolver)
    room.connect(convolver)
    convolver.connect(wet)
    wet.connect(context.destination)
    tone.start()

    engine = { context, dry, birdSend, room, wet }
  } catch (error) {
    await context.close().catch(() => undefined)
    throw error
  }
}

async function ensureBirds(): Promise<void> {
  if (!engine) throw new Error(AUDIO_UNSUPPORTED_ERROR)
  if (birdReady) return

  const response = await fetch(BIRD_URL)
  if (!response.ok) throw new Error(BIRD_LOAD_ERROR)
  const decoded = await engine.context.decodeAudioData(await response.arrayBuffer())
  for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
    fadeLoopEdges(decoded.getChannelData(channel), decoded.sampleRate)
  }

  const source = engine.context.createBufferSource()
  source.buffer = decoded
  source.loop = true
  source.connect(engine.dry)
  source.connect(engine.birdSend)
  source.start()
  birdReady = true
}

type AmbientState = AmbientFlags & {
  pending: boolean
  errorMessage: string | null
  setBirds: (on: boolean) => Promise<void>
  setReverb: (on: boolean) => Promise<void>
}

async function applyLayer(
  set: (partial: Partial<AmbientState>) => void,
  get: () => AmbientState,
  layer: keyof AmbientFlags,
  on: boolean,
) {
  const prev = get()
  const next: AmbientFlags = {
    birds: layer === 'birds' ? on : prev.birds,
    reverb: layer === 'reverb' ? on : prev.reverb,
  }
  set({ pending: true, errorMessage: null })

  if (!next.birds && !next.reverb) {
    applyMix(next, true)
    if (engine && engine.context.state === 'running') await engine.context.suspend()
    set({ ...next, pending: false, errorMessage: null })
    return
  }

  try {
    await ensureEngine()
  } catch (error) {
    set({
      birds: false,
      reverb: false,
      pending: false,
      errorMessage: error instanceof Error ? error.message : AUDIO_UNSUPPORTED_ERROR,
    })
    return
  }

  if (next.birds) {
    try {
      await ensureBirds()
    } catch (error) {
      const flags = { birds: false, reverb: next.reverb }
      // 새소리가 없고 잔향도 꺼져 있으면 무음으로 두고 오디오를 멈춘다.
      applyMix(flags, !flags.reverb)
      if (!flags.reverb && engine && engine.context.state === 'running') {
        await engine.context.suspend()
      }
      set({
        ...flags,
        pending: false,
        errorMessage: error instanceof Error ? error.message : BIRD_LOAD_ERROR,
      })
      return
    }
  }

  applyMix(next, false)
  set({ ...next, pending: false, errorMessage: null })
}

export const useAmbient = create<AmbientState>((set, get) => ({
  ...AMBIENT_DEFAULT,
  pending: false,
  errorMessage: null,
  setBirds: (on) => run(() => applyLayer(set, get, 'birds', on)),
  setReverb: (on) => run(() => applyLayer(set, get, 'reverb', on)),
}))
