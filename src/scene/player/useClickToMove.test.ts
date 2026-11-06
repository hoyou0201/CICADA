import { PerspectiveCamera } from 'three'
import { describe, expect, it } from 'vitest'
import { WALK_BOUNDS } from '../layout.ts'
import { pickFloor, toMoveTarget } from './useClickToMove.ts'

function topDownCamera() {
  const camera = new PerspectiveCamera(60, 1, 0.1, 100)
  camera.position.set(0, 10, 0)
  camera.lookAt(0, 0, 0)
  camera.updateMatrixWorld()
  return camera
}

describe('pickFloor', () => {
  it('화면 가운데는 카메라 바로 아래 바닥이다', () => {
    const p = pickFloor({ x: 0, z: 0 }, topDownCamera())
    expect(p?.x).toBeCloseTo(0)
    expect(p?.z).toBeCloseTo(0)
  })

  it('바닥을 보고 있지 않으면 null이다', () => {
    const camera = new PerspectiveCamera(60, 1, 0.1, 100)
    camera.position.set(0, 3, 0)
    camera.lookAt(0, 10, 0)
    camera.updateMatrixWorld()
    expect(pickFloor({ x: 0, z: 0 }, camera)).toBeNull()
  })
})

describe('toMoveTarget', () => {
  it('경계 안은 그대로 둔다', () => {
    expect(toMoveTarget({ x: 1, z: 2 })).toEqual({ x: 1, z: 2 })
  })

  it('경계 밖은 가장 가까운 경계 점으로 바꾼다', () => {
    expect(toMoveTarget({ x: 100, z: -100 })).toEqual({ x: WALK_BOUNDS.maxX, z: WALK_BOUNDS.minZ })
  })
})
