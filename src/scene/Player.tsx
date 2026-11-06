import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { useStore } from '../state/store.ts'
import { anonymousNumber, loadNickname, resolveNickname } from '../ui/nickname.ts'
import AvatarModel from './avatar/AvatarModel.tsx'
import FollowCamera from './player/FollowCamera.tsx'
import { pickSpawn } from './player/spawn.ts'
import { useClickToMove } from './player/useClickToMove.ts'
import { usePlayerControls } from './player/usePlayerControls.ts'

/** 이 값보다 많이 움직인 프레임이면 걷는 중으로 본다(미터). */
const MOVING_EPSILON = 1e-4

/** 내 아바타. 입장 위치에 나타나 키보드·바닥 클릭으로 걷고, 카메라가 따라간다. */
export default function Player() {
  const avatar = useStore((s) => s.avatar)
  const watching = useStore((s) => s.screenStream !== null)
  const [nickname] = useState(() => resolveNickname(loadNickname(), anonymousNumber()))
  const [moving, setMoving] = useState(false)
  const group = useRef<Group>(null)
  const last = useRef({ x: NaN, z: NaN })

  usePlayerControls()
  useClickToMove()

  // 입장 위치: 같은 방 다른 사람과 겹치지 않는 문 앞 자리.
  useEffect(() => {
    const { remotePlayers, setPosition, setMoveTarget } = useStore.getState()
    const others = Object.values(remotePlayers).flatMap((p) => (p.position ? [p.position] : []))
    setMoveTarget(null)
    setPosition(pickSpawn(others))
  }, [])

  useFrame(() => {
    const { position, rotY } = useStore.getState()
    const g = group.current
    if (g) {
      g.position.set(position.x, 0, position.z)
      g.rotation.y = rotY
    }
    const moved =
      Math.abs(position.x - last.current.x) > MOVING_EPSILON ||
      Math.abs(position.z - last.current.z) > MOVING_EPSILON
    last.current = { x: position.x, z: position.z }
    setMoving((prev) => (prev === moved ? prev : moved))
  })

  return (
    <>
      <group ref={group}>
        <AvatarModel
          nickname={nickname}
          avatar={avatar}
          status={watching ? 'watching' : 'idle'}
          moving={moving}
        />
      </group>
      <FollowCamera />
    </>
  )
}
