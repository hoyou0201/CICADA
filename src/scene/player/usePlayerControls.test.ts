import { describe, expect, it } from 'vitest'
import { WALK_BOUNDS } from '../layout.ts'
import { isTypingTarget, stepPlayer, WALK_SPEED } from './usePlayerControls.ts'

const none = { x: 0, z: 0 }

describe('stepPlayer', () => {
  it('키 방향으로 속도만큼 걷고 그쪽을 바라본다', () => {
    const r = stepPlayer({ x: 0, z: 0 }, { x: 1, z: 0 }, null, 1)
    expect(r.position.x).toBeCloseTo(WALK_SPEED)
    expect(r.rotY).toBeCloseTo(Math.PI / 2)
  })

  it('대각선도 같은 속도로 걷는다', () => {
    const r = stepPlayer({ x: 0, z: 0 }, { x: 1, z: -1 }, null, 1)
    expect(Math.hypot(r.position.x, r.position.z)).toBeCloseTo(WALK_SPEED)
  })

  it('경계 밖으로 나가지 않는다', () => {
    const r = stepPlayer({ x: WALK_BOUNDS.maxX, z: WALK_BOUNDS.minZ }, { x: 1, z: -1 }, null, 1)
    expect(r.position).toEqual({ x: WALK_BOUNDS.maxX, z: WALK_BOUNDS.minZ })
  })

  it('키가 없으면 이동 목표로 걷고 도착하면 목표를 지운다', () => {
    const target = { x: 2, z: 0 }
    const mid = stepPlayer({ x: 0, z: 0 }, none, target, 0.1)
    expect(mid.position.x).toBeGreaterThan(0)
    expect(mid.clearTarget).toBe(false)
    const end = stepPlayer({ x: 1.9, z: 0 }, none, target, 1)
    expect(end.position).toEqual(target)
    expect(end.clearTarget).toBe(true)
  })

  it('키 입력이 목표보다 우선한다', () => {
    const r = stepPlayer({ x: 0, z: 0 }, { x: -1, z: 0 }, { x: 5, z: 0 }, 0.1)
    expect(r.position.x).toBeLessThan(0)
  })

  it('입력도 목표도 없으면 그대로다', () => {
    const p = { x: 1, z: 1 }
    const r = stepPlayer(p, none, null, 1)
    expect(r.position).toBe(p)
    expect(r.rotY).toBeNull()
  })
})

describe('isTypingTarget', () => {
  const el = (tagName: string, isContentEditable = false) =>
    ({ tagName, isContentEditable }) as unknown as EventTarget

  it('입력 요소는 true, 그 밖은 false', () => {
    expect(isTypingTarget(el('INPUT'))).toBe(true)
    expect(isTypingTarget(el('TEXTAREA'))).toBe(true)
    expect(isTypingTarget(el('DIV', true))).toBe(true)
    expect(isTypingTarget(el('DIV'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
