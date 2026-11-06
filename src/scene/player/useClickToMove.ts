import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Plane, Raycaster, Vector2, Vector3, type Camera } from 'three'
import { useStore, type Position } from '../../state/store.ts'
import { clampToBounds } from './usePlayerControls.ts'

const FLOOR_PLANE = new Plane(new Vector3(0, 1, 0), 0)

/** 화면 좌표(ndc, -1~1)가 가리키는 바닥 점. 바닥을 보고 있지 않으면 null. */
export function pickFloor(ndc: Position, camera: Camera): Position | null {
  const raycaster = new Raycaster()
  raycaster.setFromCamera(new Vector2(ndc.x, ndc.z), camera)
  const hit = raycaster.ray.intersectPlane(FLOOR_PLANE, new Vector3())
  return hit ? { x: hit.x, z: hit.z } : null
}

/** 바닥 점을 이동 목표로 바꾼다. 경계 밖이면 경계 안 가장 가까운 점이다. */
export function toMoveTarget(point: Position): Position {
  return clampToBounds(point)
}

/**
 * 캔버스를 누르면 그 아래 바닥 점을 저장소의 이동 목표로 정한다.
 * 실제 걷기는 usePlayerControls가 한다. Canvas 안에서 한 번만 부른다.
 */
export function useClickToMove(): void {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const canvas = gl.domElement
    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const ndc = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        z: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      }
      const point = pickFloor(ndc, camera)
      if (point) useStore.getState().setMoveTarget(toMoveTarget(point))
    }
    canvas.addEventListener('pointerdown', onPointerDown)
    return () => canvas.removeEventListener('pointerdown', onPointerDown)
  }, [gl, camera])
}
