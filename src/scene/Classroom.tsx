import { Canvas } from '@react-three/fiber'
import type { Navigate } from '../App.tsx'
import Blackboard from './Blackboard.tsx'
import Decor from './Decor.tsx'
import Desks from './Desks.tsx'
import ExitDoor from './ExitDoor.tsx'
import KoreanDecor from './KoreanDecor.tsx'
import Lighting from './Lighting.tsx'
import NoticeBoard from './NoticeBoard.tsx'
import Player from './Player.tsx'
import Professor from './Professor.tsx'
import RemoteAvatars from './RemoteAvatars.tsx'
import Room from './Room.tsx'
import RoomSign from './RoomSign.tsx'
import { CAMERA_START } from './layout.ts'

type Props = { navigate: Navigate }

export default function Classroom({ navigate }: Props) {
  return (
    <Canvas className="scene-canvas" shadows camera={{ position: CAMERA_START, fov: 60 }}>
      <Lighting />
      <Room />
      <Desks />
      <Decor />
      <KoreanDecor />
      <Blackboard />
      <Professor />
      <NoticeBoard />
      <RoomSign />
      <ExitDoor navigate={navigate} />
      <Player />
      <RemoteAvatars />
    </Canvas>
  )
}
