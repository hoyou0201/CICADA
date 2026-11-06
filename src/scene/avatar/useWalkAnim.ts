import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'

const BOB_HEIGHT = 0.08
const BOB_SPEED = 12 // 걸을 때 초당 라디안
const BREATH_SCALE = 0.025
const BREATH_SPEED = 2
const BLEND_SPEED = 10 // 걷기↔숨쉬기 전환 속도

/** 걷기 weight(0~1)에 따른 위아래 이동량과 세로 배율. 시간 t는 초. */
export function walkPose(t: number, walk: number): { y: number; scaleY: number } {
  const bob = Math.abs(Math.sin(t * BOB_SPEED)) * BOB_HEIGHT * walk
  const breath = Math.sin(t * BREATH_SPEED) * BREATH_SCALE * (1 - walk)
  return { y: bob, scaleY: 1 + breath }
}

/**
 * 반환한 ref를 움직일 group에 붙인다. moving이면 통통 튀고 멈추면 숨쉬듯 늘었다 줄어든다.
 * group 원점이 발 아래라서 세로 배율을 줘도 발은 바닥에 붙어 있다.
 */
export function useWalkAnim(moving: boolean) {
  const ref = useRef<Group>(null)
  const walk = useRef(0)

  useFrame(({ clock }, delta) => {
    const group = ref.current
    if (!group) return
    const target = moving ? 1 : 0
    walk.current += (target - walk.current) * Math.min(1, delta * BLEND_SPEED)
    const { y, scaleY } = walkPose(clock.elapsedTime, walk.current)
    group.position.y = y
    group.scale.y = scaleY
  })

  return ref
}
