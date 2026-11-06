import { describe, expect, it } from 'vitest'
import { DESK_GRID, PLAYER_START, WALK_BOUNDS, deskPositions } from './layout.ts'

describe('layout', () => {
  it('책상 격자 개수만큼 위치를 만든다', () => {
    expect(deskPositions()).toHaveLength(DESK_GRID.rows * DESK_GRID.cols)
  })

  it('책상과 시작 위치가 걸을 수 있는 경계 안에 있다', () => {
    for (const [x, , z] of [...deskPositions(), PLAYER_START]) {
      expect(x).toBeGreaterThanOrEqual(WALK_BOUNDS.minX)
      expect(x).toBeLessThanOrEqual(WALK_BOUNDS.maxX)
      expect(z).toBeGreaterThanOrEqual(WALK_BOUNDS.minZ)
      expect(z).toBeLessThanOrEqual(WALK_BOUNDS.maxZ)
    }
  })
})
