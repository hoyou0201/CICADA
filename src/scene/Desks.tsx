import { useMemo } from 'react'
import Prop from './Prop.tsx'
import { DESK_GRID, deskPositions } from './layout.ts'

// 소품 원본 크기: 책상 0.8×0.75×0.55m, 의자 키 0.89m. 책상은 DESK_GRID.size에 맞춰 늘이고 줄인다.
const DESK_MODEL_SIZE = [0.8, 0.75, 0.55] as const
const DESK_SCALE: [number, number, number] = [
  DESK_GRID.size[0] / DESK_MODEL_SIZE[0],
  DESK_GRID.size[1] / DESK_MODEL_SIZE[1],
  DESK_GRID.size[2] / DESK_MODEL_SIZE[2],
]
// 의자는 책상 뒤(+z)에 놓여 칠판(-z)을 본다. 모델의 앞이 +z라서 180° 돌린다.
const CHAIR_OFFSET_Z = 0.6
const CHAIR_SCALE = 1

export default function Desks() {
  const desks = useMemo(() => deskPositions(), [])
  return (
    <group>
      {desks.map(([x, , z]) => (
        <group key={`${x}:${z}`}>
          <Prop name="student_desk" position={[x, 0, z]} scale={DESK_SCALE} />
          <Prop name="student_chair" position={[x, 0, z + CHAIR_OFFSET_Z]} rotationY={Math.PI} scale={CHAIR_SCALE} />
        </group>
      ))}
    </group>
  )
}
