import { EXIT_DOOR, HALF_DEPTH, HALF_WIDTH, ROOM, type Vec3 } from './layout.ts'

const FLOOR = '#b89b72'
const WALL = '#f1ece1'
const TRIM = '#8a6a48'
const GLASS = '#bfe0f2'
const FRAME = '#e8e2d4'

const WINDOW_SIZE: [number, number] = [2.6, 1.6]
const WINDOW_Y = 2.2
const FRAME_T = 0.08

// 창문이 놓일 벽과 z 위치. 오른쪽(+x) 벽은 햇살이 들어오는 쪽이라 게시판 자리(z 0.5~3.5)를 피한다.
const WINDOWS: { x: number; z: number; rotationY: number }[] = [
  { x: HALF_WIDTH, z: -6, rotationY: -Math.PI / 2 },
  { x: HALF_WIDTH, z: 6, rotationY: -Math.PI / 2 },
  { x: -HALF_WIDTH, z: -5, rotationY: Math.PI / 2 },
  { x: -HALF_WIDTH, z: -1, rotationY: Math.PI / 2 },
]

// 벽은 안쪽에서만 보이게 한 장짜리 판으로 만든다(밖에 있는 카메라가 벽에 가리지 않도록).
function Wall({ position, rotationY, size }: { position: Vec3; rotationY: number; size: [number, number] }) {
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={WALL} />
    </mesh>
  )
}

function WindowPane({ x, z, rotationY }: { x: number; z: number; rotationY: number }) {
  const [w, h] = WINDOW_SIZE
  const inward = x > 0 ? -1 : 1
  return (
    <group position={[x + inward * 0.02, WINDOW_Y, z]} rotation={[0, rotationY, 0]}>
      <mesh>
        <planeGeometry args={WINDOW_SIZE} />
        <meshStandardMaterial color={GLASS} emissive={GLASS} emissiveIntensity={0.6} />
      </mesh>
      {/* 테두리 네 개 + 가운데 세로 살 */}
      <mesh position={[0, h / 2, 0.02]}>
        <boxGeometry args={[w + FRAME_T * 2, FRAME_T, 0.06]} />
        <meshStandardMaterial color={FRAME} />
      </mesh>
      <mesh position={[0, -h / 2, 0.02]}>
        <boxGeometry args={[w + FRAME_T * 2, FRAME_T, 0.06]} />
        <meshStandardMaterial color={FRAME} />
      </mesh>
      <mesh position={[-w / 2, 0, 0.02]}>
        <boxGeometry args={[FRAME_T, h, 0.06]} />
        <meshStandardMaterial color={FRAME} />
      </mesh>
      <mesh position={[w / 2, 0, 0.02]}>
        <boxGeometry args={[FRAME_T, h, 0.06]} />
        <meshStandardMaterial color={FRAME} />
      </mesh>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[FRAME_T, h, 0.06]} />
        <meshStandardMaterial color={FRAME} />
      </mesh>
    </group>
  )
}

// 출입문 자리: 문 자체는 ExitDoor가 그리고, 여기서는 문틀과 안쪽 어두운 틈만 만든다.
function DoorFrame() {
  const [w, h] = EXIT_DOOR.size
  const [x, , z] = EXIT_DOOR.position
  const t = 0.1
  return (
    <group position={[x + 0.02, 0, z]} rotation={[0, EXIT_DOOR.rotationY, 0]}>
      <mesh position={[0, h / 2, -0.01]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#3d3226" />
      </mesh>
      <mesh position={[-(w / 2 + t / 2), h / 2, 0.03]}>
        <boxGeometry args={[t, h + t, 0.08]} />
        <meshStandardMaterial color={TRIM} />
      </mesh>
      <mesh position={[w / 2 + t / 2, h / 2, 0.03]}>
        <boxGeometry args={[t, h + t, 0.08]} />
        <meshStandardMaterial color={TRIM} />
      </mesh>
      <mesh position={[0, h + t / 2, 0.03]}>
        <boxGeometry args={[w + t * 2, t, 0.08]} />
        <meshStandardMaterial color={TRIM} />
      </mesh>
    </group>
  )
}

export default function Room() {
  const { width, depth, height } = ROOM
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={FLOOR} />
      </mesh>
      {/* 앞(칠판) */}
      <Wall position={[0, height / 2, -HALF_DEPTH]} rotationY={0} size={[width, height]} />
      {/* 뒤 */}
      <Wall position={[0, height / 2, HALF_DEPTH]} rotationY={Math.PI} size={[width, height]} />
      {/* 왼쪽(출입문) */}
      <Wall position={[-HALF_WIDTH, height / 2, 0]} rotationY={Math.PI / 2} size={[depth, height]} />
      {/* 오른쪽(창, 게시판) */}
      <Wall position={[HALF_WIDTH, height / 2, 0]} rotationY={-Math.PI / 2} size={[depth, height]} />
      {/* 걸레받이 */}
      {[
        { p: [0, 0.06, -HALF_DEPTH + 0.01], r: 0, s: width },
        { p: [0, 0.06, HALF_DEPTH - 0.01], r: Math.PI, s: width },
        { p: [-HALF_WIDTH + 0.01, 0.06, 0], r: Math.PI / 2, s: depth },
        { p: [HALF_WIDTH - 0.01, 0.06, 0], r: -Math.PI / 2, s: depth },
      ].map(({ p, r, s }, i) => (
        <mesh key={i} position={p as Vec3} rotation={[0, r, 0]}>
          <boxGeometry args={[s, 0.12, 0.02]} />
          <meshStandardMaterial color={TRIM} />
        </mesh>
      ))}
      {WINDOWS.map((w) => (
        <WindowPane key={`${w.x}:${w.z}`} {...w} />
      ))}
      <DoorFrame />
    </group>
  )
}
