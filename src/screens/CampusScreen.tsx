import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import type { Navigate } from '../App.tsx'
import Door from '../scene/campus/Door.tsx'
import Hallway from '../scene/campus/Hallway.tsx'
import { DOOR_SLOTS } from '../scene/campus/layout.ts'
import Lighting from '../scene/Lighting.tsx'
import Loading from '../ui/Loading.tsx'
import WebGLGate from '../ui/WebGLGate.tsx'

type Props = { navigate: Navigate }

/**
 * 복도 화면. 복도 배경과 강의실 문을 보여 주고,
 * 지금 강의실로 바로 돌아가거나 다른 문으로는 그 강의실에 들어간다.
 */
export default function CampusScreen({ navigate }: Props) {
  return (
    <div className="screen classroom-screen">
      <WebGLGate>
        <Suspense fallback={<Loading />}>
          <Canvas
            className="scene-canvas"
            shadows
            camera={{ position: [0, 2.6, 9.5], fov: 55 }}
            onCreated={({ camera }) => camera.lookAt(0, 1.3, 0)}
          >
            <Lighting />
            <Hallway />
            {DOOR_SLOTS.map((slot) => (
              <Door key={slot.roomId} slot={slot} navigate={navigate} />
            ))}
          </Canvas>
        </Suspense>
      </WebGLGate>
      <div className="overlay">
        <button
          type="button"
          className="btn"
          style={{ position: 'absolute', top: 'var(--space-4)', left: 'var(--space-4)' }}
          onClick={() => navigate('classroom')}
        >
          강의실로 돌아가기
        </button>
      </div>
    </div>
  )
}
