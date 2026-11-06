import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group } from 'three'
import { useStore } from '../state/store.ts'
import { anonymousNumber, loadNickname, resolveNickname } from '../ui/nickname.ts'
import AvatarModel from './avatar/AvatarModel.tsx'
import FollowCamera from './player/FollowCamera.tsx'
import { currentPresenceKey } from '../room/presence.ts'
import { pickSpawn, shouldYieldSpawn } from './player/spawn.ts'
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
  // 위치가 도착하기 전에는 둘 다 문 앞에 서므로, 키가 더 큰 쪽만 빈 자리로 비킨다.
  // 직접 걷기 시작하면 더 이상 옮기지 않는다.
  useEffect(() => {
    let allow = true
    let adjusting = false
    const separate = () => {
      if (!allow) return
      const myKey = currentPresenceKey()
      if (!myKey) return
      const { remotePlayers, position, setPosition, setMoveTarget } = useStore.getState()
      const crowd = Object.values(remotePlayers).map((player) => ({
        key: player.key,
        position: player.position,
      }))
      if (!shouldYieldSpawn(myKey, position, crowd)) return
      const others = crowd.flatMap((player) => (player.position ? [player.position] : []))
      adjusting = true
      setMoveTarget(null)
      setPosition(pickSpawn(others))
      adjusting = false
    }
    const { remotePlayers, setPosition, setMoveTarget } = useStore.getState()
    const others = Object.values(remotePlayers).flatMap((p) => (p.position ? [p.position] : []))
    setMoveTarget(null)
    setPosition(pickSpawn(others))
    const unsubscribe = useStore.subscribe((state, prev) => {
      if (!allow) return
      if (state.position !== prev.position && !adjusting) {
        allow = false
        return
      }
      if (state.remotePlayers !== prev.remotePlayers) separate()
    })
    const timer = window.setTimeout(() => {
      allow = false
    }, 4000)
    return () => {
      allow = false
      window.clearTimeout(timer)
      unsubscribe()
    }
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
          isSelf
        />
      </group>
      <FollowCamera />
    </>
  )
}
