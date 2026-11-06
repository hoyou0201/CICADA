import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import type { Group } from 'three'
import { useStore, type Position, type RemotePlayer } from '../state/store.ts'
import AvatarModel from './avatar/AvatarModel.tsx'
import { PLAYER_START } from './layout.ts'

const FOLLOW_SPEED = 10
const MOVING_DISTANCE = 0.02

function interpolateRemotePosition(current: Position, target: Position, delta: number): Position {
  const amount = 1 - Math.exp(-FOLLOW_SPEED * Math.max(0, delta))
  return {
    x: current.x + (target.x - current.x) * amount,
    z: current.z + (target.z - current.z) * amount,
  }
}

function RemoteAvatar({ player }: { player: RemotePlayer }) {
  const group = useRef<Group>(null)
  const hasPosition = useRef(player.position !== null)
  const [moving, setMoving] = useState(false)
  const [initialPosition] = useState<[number, number, number]>(() => [
    player.position?.x ?? PLAYER_START[0],
    0,
    player.position?.z ?? PLAYER_START[2],
  ])

  useFrame((_, delta) => {
    const g = group.current
    const target = player.position
    if (!g || !target) return
    if (!hasPosition.current) {
      g.position.set(target.x, 0, target.z)
      hasPosition.current = true
    } else {
      const next = interpolateRemotePosition(g.position, target, delta)
      g.position.set(next.x, 0, next.z)
    }
    g.rotation.y = player.rotY
    const isMoving = Math.hypot(target.x - g.position.x, target.z - g.position.z) > MOVING_DISTANCE
    setMoving((previous) => previous === isMoving ? previous : isMoving)
  })

  return (
    <group ref={group} position={initialPosition}>
      <AvatarModel nickname={player.nickname} avatar={player.avatar} status={player.status} moving={moving} />
    </group>
  )
}

export default function RemoteAvatars() {
  const players = useStore((s) => s.remotePlayers)
  const roomId = useStore((s) => s.roomId)

  return (
    <>
      {Object.values(players).filter((player) => player.roomId === roomId).map((player) => (
        <RemoteAvatar key={player.key} player={player} />
      ))}
    </>
  )
}
