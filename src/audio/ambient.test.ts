import { describe, expect, it } from 'vitest'
import {
  AMBIENT_DEFAULT,
  ambientMix,
  makeClassroomImpulse,
  makeRoomTone,
} from './ambient.ts'

function energy(data: Float32Array, from: number, to: number) {
  let sum = 0
  for (let i = from; i < to; i++) sum += data[i] * data[i]
  return sum / (to - from)
}

describe('강의실 소리', () => {
  it('기본은 새소리와 잔향이 모두 꺼져 무음이다', () => {
    expect(AMBIENT_DEFAULT).toEqual({ birds: false, reverb: false })
    expect(ambientMix(AMBIENT_DEFAULT)).toEqual({ dry: 0, birdSend: 0, room: 0, wet: 0 })
  })

  it('새소리만 켜면 마른 소리만 난다', () => {
    const mix = ambientMix({ birds: true, reverb: false })
    expect(mix.dry).toBeGreaterThan(0)
    expect(mix.birdSend).toBe(0)
    expect(mix.room).toBe(0)
    expect(mix.wet).toBe(0)
  })

  it('잔향만 켜면 실내 바닥음이 잔향으로만 나간다', () => {
    const mix = ambientMix({ birds: false, reverb: true })
    expect(mix.dry).toBe(0)
    expect(mix.birdSend).toBe(0)
    expect(mix.room).toBeGreaterThan(0)
    expect(mix.wet).toBeGreaterThan(0)
  })

  it('둘 다 켜면 새소리가 잔향으로 섞이고 마른 소리는 줄어든다', () => {
    const dryOnly = ambientMix({ birds: true, reverb: false })
    const both = ambientMix({ birds: true, reverb: true })
    expect(both.dry).toBeGreaterThan(0)
    expect(both.dry).toBeLessThan(dryOnly.dry)
    expect(both.birdSend).toBeGreaterThan(0)
    expect(both.room).toBeGreaterThan(0)
    expect(both.wet).toBeGreaterThan(0)
  })

  it('강의실 임펄스는 뒤로 갈수록 잦아든다', () => {
    const ir = makeClassroomImpulse(8000, 0.62)
    expect(ir.length).toBe(4960)
    let peak = 0
    for (let i = 0; i < ir.length; i++) peak = Math.max(peak, Math.abs(ir[i]))
    expect(peak).toBeCloseTo(1, 5)
    const early = energy(ir, 0, Math.floor(ir.length * 0.15))
    const late = energy(ir, Math.floor(ir.length * 0.75), ir.length)
    expect(early).toBeGreaterThan(late * 5)
    expect(makeClassroomImpulse(8000, 0.62)).toEqual(ir)
  })

  it('실내 바닥음은 반복 경계가 조용하다', () => {
    const tone = makeRoomTone(8000, 1)
    expect(Math.abs(tone[0])).toBe(0)
    expect(Math.abs(tone[tone.length - 1])).toBeLessThan(0.001)
    let peak = 0
    for (let i = 0; i < tone.length; i++) peak = Math.max(peak, Math.abs(tone[i]))
    expect(peak).toBeGreaterThan(0.05)
    expect(peak).toBeLessThanOrEqual(0.35)
  })
})
