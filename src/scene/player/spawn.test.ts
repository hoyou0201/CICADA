import { describe, expect, it } from 'vitest'
import { EXIT_DOOR, WALK_BOUNDS } from '../layout.ts'
import { SPAWN_CLEARANCE, pickSpawn } from './spawn.ts'

const doorX = EXIT_DOOR.position[0]
const doorZ = EXIT_DOOR.position[2]

function distance(a: { x: number; z: number }, b: { x: number; z: number }) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

describe('pickSpawn', () => {
  it('혼자면 문 앞 기준점을 고른다', () => {
    const p = pickSpawn([])
    expect(distance(p, { x: doorX + 1.5, z: doorZ })).toBeLessThan(0.01)
  })

  it('같은 입력이면 같은 자리를 돌려준다', () => {
    const others = [{ x: doorX + 1.5, z: doorZ }]
    expect(pickSpawn(others)).toEqual(pickSpawn(others))
  })

  it('다른 사람과 겹치지 않는 자리를 고른다', () => {
    const others = [
      { x: doorX + 1.5, z: doorZ },
      { x: doorX + 2.3, z: doorZ },
      { x: doorX + 1.5, z: doorZ - 0.8 },
    ]
    const p = pickSpawn(others)
    for (const o of others) expect(distance(p, o)).toBeGreaterThanOrEqual(SPAWN_CLEARANCE)
  })

  it('여러 명이 연달아 들어와도 서로 겹치지 않고 문 근처에 머문다', () => {
    const placed: { x: number; z: number }[] = []
    for (let i = 0; i < 10; i++) {
      const p = pickSpawn(placed)
      for (const o of placed) expect(distance(p, o)).toBeGreaterThanOrEqual(SPAWN_CLEARANCE)
      expect(distance(p, { x: doorX, z: doorZ })).toBeLessThan(7)
      placed.push(p)
    }
  })

  it('항상 걸을 수 있는 경계 안의 자리를 고른다', () => {
    const crowd = Array.from({ length: 200 }, (_, i) => ({
      x: WALK_BOUNDS.minX + (i % 20) * 0.6,
      z: WALK_BOUNDS.minZ + Math.floor(i / 20) * 1.5,
    }))
    for (const others of [[], crowd]) {
      const p = pickSpawn(others)
      expect(p.x).toBeGreaterThanOrEqual(WALK_BOUNDS.minX)
      expect(p.x).toBeLessThanOrEqual(WALK_BOUNDS.maxX)
      expect(p.z).toBeGreaterThanOrEqual(WALK_BOUNDS.minZ)
      expect(p.z).toBeLessThanOrEqual(WALK_BOUNDS.maxZ)
    }
  })

  it('빈 자리가 없으면 가장 덜 붐비는 자리를 돌려준다', () => {
    const wall: { x: number; z: number }[] = []
    for (let x = WALK_BOUNDS.minX; x <= WALK_BOUNDS.maxX; x += 0.5) {
      for (let z = WALK_BOUNDS.minZ; z <= WALK_BOUNDS.maxZ; z += 0.5) wall.push({ x, z })
    }
    expect(() => pickSpawn(wall)).not.toThrow()
  })
})
