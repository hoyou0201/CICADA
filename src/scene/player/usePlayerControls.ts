import { useFrame } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { useStore, type Position } from '../../state/store.ts'
import { WALK_BOUNDS } from '../layout.ts'

/** 걷는 속도(미터/초). */
export const WALK_SPEED = 3.5

/** 이동 목표에 이만큼 가까워지면 도착한 것으로 본다(미터). */
const ARRIVE_DISTANCE = 0.05

const KEY_DIRECTIONS: Record<string, Position> = {
  KeyW: { x: 0, z: -1 },
  ArrowUp: { x: 0, z: -1 },
  KeyS: { x: 0, z: 1 },
  ArrowDown: { x: 0, z: 1 },
  KeyA: { x: -1, z: 0 },
  ArrowLeft: { x: -1, z: 0 },
  KeyD: { x: 1, z: 0 },
  ArrowRight: { x: 1, z: 0 },
}

export function clampToBounds(p: Position): Position {
  return {
    x: Math.min(WALK_BOUNDS.maxX, Math.max(WALK_BOUNDS.minX, p.x)),
    z: Math.min(WALK_BOUNDS.maxZ, Math.max(WALK_BOUNDS.minZ, p.z)),
  }
}

/** 글을 쓰는 중인 요소(입력창 등)인지. 이때는 키로 걷지 않는다. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as { tagName?: string; isContentEditable?: boolean } | null
  if (!el || typeof el.tagName !== 'string') return false
  return el.isContentEditable === true || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)
}

export type StepResult = {
  position: Position
  /** 바라보는 방향(라디안, 0이면 +z). 움직이지 않았으면 null */
  rotY: number | null
  /** 이동 목표에 도착했거나 막혀서 목표를 지워야 하면 true */
  clearTarget: boolean
}

/**
 * dt초 동안 한 걸음 걷는다. 키 방향(direction)이 있으면 그쪽으로,
 * 없고 이동 목표가 있으면 목표로 걷는다. 결과는 항상 경계 안이다.
 */
export function stepPlayer(
  position: Position,
  direction: Position,
  target: Position | null,
  dt: number,
): StepResult {
  const dist = WALK_SPEED * dt
  let dx = direction.x
  let dz = direction.z
  let toTarget = false

  if (dx === 0 && dz === 0 && target) {
    const tx = target.x - position.x
    const tz = target.z - position.z
    const left = Math.hypot(tx, tz)
    if (left <= ARRIVE_DISTANCE) {
      return { position: clampToBounds(target), rotY: null, clearTarget: true }
    }
    dx = tx / left
    dz = tz / left
    toTarget = true
    if (left <= dist) {
      return {
        position: clampToBounds(target),
        rotY: Math.atan2(dx, dz),
        clearTarget: true,
      }
    }
  }

  const len = Math.hypot(dx, dz)
  if (len === 0) return { position, rotY: null, clearTarget: false }
  dx /= len
  dz /= len

  const next = clampToBounds({ x: position.x + dx * dist, z: position.z + dz * dist })
  const moved = next.x !== position.x || next.z !== position.z
  // 목표가 경계 밖이라 더 못 가면 목표를 지운다.
  const stuck = toTarget && !moved
  return { position: next, rotY: Math.atan2(dx, dz), clearTarget: stuck }
}

/**
 * WASD·방향키와 저장소의 이동 목표로 내 아바타를 걷게 한다.
 * Canvas 안의 컴포넌트에서 한 번만 부른다. 위치와 방향은 저장소에 쓴다.
 */
export function usePlayerControls(): void {
  const pressed = useRef(new Set<string>())

  useEffect(() => {
    const keys = pressed.current
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.code in KEY_DIRECTIONS)) return
      if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      keys.add(e.code)
      e.preventDefault()
      // 키를 누르면 클릭 이동은 취소한다.
      if (useStore.getState().moveTarget) useStore.getState().setMoveTarget(null)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code)
    }
    const clear = () => keys.clear()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clear)
      keys.clear()
    }
  }, [])

  useFrame((_, delta) => {
    const { position, moveTarget, setPosition, setMoveTarget } = useStore.getState()
    const direction = { x: 0, z: 0 }
    for (const code of pressed.current) {
      const d = KEY_DIRECTIONS[code]
      direction.x += d.x
      direction.z += d.z
    }
    // 탭 전환 등으로 큰 delta가 들어와도 순간이동하지 않게 한다.
    const result = stepPlayer(position, direction, moveTarget, Math.min(delta, 0.1))
    if (result.position !== position) {
      setPosition(result.position, result.rotY ?? undefined)
    }
    if (result.clearTarget) setMoveTarget(null)
  })
}
