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

// 소품을 놓을 책상 번호(앞줄 왼쪽부터 0). 겹치지 않게 흩어 둔다.
const BOOK_DESKS = new Set([0, 4, 7, 10])
const BAG_DESKS = new Set([3, 8])
// 2인용 책상이라 의자를 양옆에 하나씩 놓는다.
const SEAT_OFFSET_X = 0.65

export default function Desks() {
  const desks = useMemo(() => deskPositions(), [])
  return (
    <group>
      {desks.map(([x, , z], i) => (
        <group key={`${x}:${z}`}>
          {/* 일부 자리에만 소품을 둔다(전부 두면 어수선하다) */}
          {BOOK_DESKS.has(i) && <Prop name="open_book" position={[x - 0.6, DESK_GRID.size[1], z]} rotationY={0.15} />}
          {BAG_DESKS.has(i) && <Prop name="backpack" position={[x + 1.25, 0, z + CHAIR_OFFSET_Z]} rotationY={0.5} />}
          <Prop name="student_desk" position={[x, 0, z]} scale={DESK_SCALE} />
          {[-SEAT_OFFSET_X, SEAT_OFFSET_X].map((dx) => (
            <Prop key={dx} name="student_chair" position={[x + dx, 0, z + CHAIR_OFFSET_Z]} rotationY={Math.PI} scale={CHAIR_SCALE} />
          ))}
        </group>
      ))}
    </group>
  )
}
