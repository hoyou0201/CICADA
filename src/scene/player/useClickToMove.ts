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

/** 누른 곳에서 이만큼(px) 넘게 움직였으면 클릭이 아니라 드래그(시점 회전)로 본다. */
const TAP_MAX_MOVE = 5

/** 드래그가 아닌 짧은 클릭이 끝났을 때만 onTap을 부른다. 해제 함수를 돌려준다. */
export function listenTap(canvas: HTMLElement, onTap: (e: PointerEvent) => void): () => void {
  let down: { x: number; y: number } | null = null
  const onDown = (e: PointerEvent) => {
    down = e.button === 0 ? { x: e.clientX, y: e.clientY } : null
  }
  const onUp = (e: PointerEvent) => {
    const start = down
    down = null
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) <= TAP_MAX_MOVE) onTap(e)
  }
  const cancel = () => {
    down = null
  }
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', cancel)
  return () => {
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('pointercancel', cancel)
  }
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
    return listenTap(canvas, (e) => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const ndc = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        z: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      }
      const point = pickFloor(ndc, camera)
      if (point) useStore.getState().setMoveTarget(toMoveTarget(point))
    })
  }, [gl, camera])
}
