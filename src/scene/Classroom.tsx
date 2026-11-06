import { Canvas } from '@react-three/fiber'
import Blackboard from './Blackboard.tsx'
import Desks from './Desks.tsx'
import ExitDoor from './ExitDoor.tsx'
import Lighting from './Lighting.tsx'
import NoticeBoard from './NoticeBoard.tsx'
import Player from './Player.tsx'
import Professor from './Professor.tsx'
import RemoteAvatars from './RemoteAvatars.tsx'
import Room from './Room.tsx'
import RoomSign from './RoomSign.tsx'
import { CAMERA_START } from './layout.ts'

export default function Classroom() {
  return (
    <Canvas className="scene-canvas" shadows camera={{ position: CAMERA_START, fov: 60 }}>
      <Lighting />
      <Room />
      <Desks />
      <Blackboard />
      <Professor />
      <NoticeBoard />
      <RoomSign />
      <ExitDoor />
      <Player />
      <RemoteAvatars />
    </Canvas>
  )
}
