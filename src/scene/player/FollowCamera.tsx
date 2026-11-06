import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useStore } from '../../state/store.ts'

/** 카메라가 내 아바타에서 떨어진 거리와 높이(미터). */
const DISTANCE = 6
const HEIGHT = 3.2
/** 아바타 위 어디를 바라볼지(미터). */
const LOOK_HEIGHT = 1
/** 드래그로 돌릴 수 있는 최대 각도(라디안). 칠판 쪽을 보는 기본 시점에서 좌우로만 조금 돈다. */
const MAX_YAW = 0.9
const DRAG_RADIANS_PER_PIXEL = 0.006
/** 클수록 빨리 따라온다. */
const FOLLOW_SHARPNESS = 6

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/** 기본 시점(뒤 = +z)에서 yaw만큼 돈 카메라 위치. */
function cameraOffset(yaw: number): [x: number, y: number, z: number] {
  return [Math.sin(yaw) * DISTANCE, HEIGHT, Math.cos(yaw) * DISTANCE]
}

/** 내 아바타를 뒤(+z)에서 부드럽게 따라가고, 캔버스를 좌우로 드래그하면 시점을 조금 돌린다. */
export default function FollowCamera() {
  const canvas = useThree((s) => s.gl.domElement)
  const yaw = useRef(0)
  const lastX = useRef<number | null>(null)

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.button === 0) lastX.current = e.clientX
    }
    const onMove = (e: PointerEvent) => {
      if (lastX.current === null) return
      yaw.current = clamp(yaw.current - (e.clientX - lastX.current) * DRAG_RADIANS_PER_PIXEL, -MAX_YAW, MAX_YAW)
      lastX.current = e.clientX
    }
    const onUp = () => {
      lastX.current = null
    }
    canvas.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [canvas])

  useFrame(({ camera }, delta) => {
    const { position } = useStore.getState()
    const [ox, oy, oz] = cameraOffset(yaw.current)
    const t = 1 - Math.exp(-FOLLOW_SHARPNESS * Math.min(delta, 0.1))
    camera.position.x += (position.x + ox - camera.position.x) * t
    camera.position.y += (oy - camera.position.y) * t
    camera.position.z += (position.z + oz - camera.position.z) * t
    camera.lookAt(position.x, LOOK_HEIGHT, position.z)
  })

  return null
}
