import { useLayoutEffect, useMemo, useRef } from 'react'
import { Object3D, type InstancedMesh } from 'three'
import { DESK_GRID, deskPositions, type Vec3 } from './layout.ts'

const DESK_COLOR = '#c9a26b'
const CHAIR_COLOR = '#4a6fa5'

// 책상 중심 기준 상대 위치와 크기. 의자는 책상 뒤(+z)에 놓여 칠판(-z)을 본다.
const TOP_THICKNESS = 0.06
const CHAIR_OFFSET_Z = 0.75
const SEAT_SIZE: Vec3 = [0.5, 0.06, 0.5]
const SEAT_Y = 0.45
const BACK_SIZE: Vec3 = [0.5, 0.5, 0.06]
const BACK_Y = 0.75

type Part = { size: Vec3; color: string; place: (desk: Vec3) => Vec3 }

const [DESK_W, DESK_H, DESK_D] = DESK_GRID.size

const PARTS: Part[] = [
  {
    size: [DESK_W, TOP_THICKNESS, DESK_D],
    color: DESK_COLOR,
    place: ([x, , z]) => [x, DESK_H - TOP_THICKNESS / 2, z],
  },
  {
    // 책상 몸통(앞 패널)
    size: [DESK_W - 0.1, DESK_H - TOP_THICKNESS, 0.05],
    color: DESK_COLOR,
    place: ([x, , z]) => [x, (DESK_H - TOP_THICKNESS) / 2, z - DESK_D / 2 + 0.05],
  },
  {
    size: SEAT_SIZE,
    color: CHAIR_COLOR,
    place: ([x, , z]) => [x, SEAT_Y, z + CHAIR_OFFSET_Z],
  },
  {
    size: BACK_SIZE,
    color: CHAIR_COLOR,
    place: ([x, , z]) => [x, BACK_Y, z + CHAIR_OFFSET_Z + SEAT_SIZE[2] / 2],
  },
]

function Instances({ part, desks }: { part: Part; desks: Vec3[] }) {
  const ref = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    const dummy = new Object3D()
    desks.forEach((desk, i) => {
      dummy.position.set(...part.place(desk))
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [part, desks])

  return (
    <instancedMesh ref={ref} args={[undefined, undefined, desks.length]} castShadow receiveShadow>
      <boxGeometry args={part.size} />
      <meshStandardMaterial color={part.color} />
    </instancedMesh>
  )
}

export default function Desks() {
  const desks = useMemo(() => deskPositions(), [])
  return (
    <group>
      {PARTS.map((part, i) => (
        <Instances key={i} part={part} desks={desks} />
      ))}
    </group>
  )
}
