import { describe, expect, it } from 'vitest'
import { isNearExit } from './ExitDoor.tsx'
import { EXIT_DOOR } from './layout.ts'

const [doorX, , doorZ] = EXIT_DOOR.position

describe('isNearExit', () => {
  it('출입문 반경 안이면 가까이 있는 것으로 본다', () => {
    expect(isNearExit({ x: doorX, z: doorZ })).toBe(true)
    expect(isNearExit({ x: doorX + EXIT_DOOR.enterRadius, z: doorZ })).toBe(true)
  })

  it('반경 밖이면 가까이 있지 않다', () => {
    expect(isNearExit({ x: doorX + EXIT_DOOR.enterRadius + 0.05, z: doorZ })).toBe(false)
    expect(isNearExit({ x: doorX, z: doorZ + 4 })).toBe(false)
  })
})
