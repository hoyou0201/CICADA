import {
  DOOR_SLOTS,
  HALF_DEPTH,
  HALF_WIDTH,
  HALLWAY,
  WINDOWS,
  type DoorSlot,
  type HallwayWindow,
  type Vec3,
} from './layout.ts'

const FLOOR = '#c5b496'
const WALL = '#f2eee4'
const TRIM = '#7d5f41'
const DOOR_WOOD = '#5c432e'
const GLASS = '#bfe0f2'


// 벽은 안쪽에서만 보이게 한 장짜리 판으로 만든다(밖에 있는 카메라가 벽에 가리지 않도록).
function Wall({ position, rotationY, size }: { position: Vec3; rotationY: number; size: [number, number] }) {
  return (
    <mesh position={position} rotation={[0, rotationY, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial color={WALL} />
    </mesh>
  )
}

function WindowPane({ position, rotationY, size }: HallwayWindow) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial color={GLASS} emissive={GLASS} emissiveIntensity={0.65} />
      </mesh>
    </group>
  )
}

// 강의실 문틀과 안쪽 문짝. 상호작용·표지판(Door.tsx)이 앞쪽(slot.position)에 겹쳐도 자연스럽게 어우러진다.
function DoorFrame({ slot }: { slot: DoorSlot }) {
  const [w, h] = slot.size
  const [, , z] = slot.position
  const wallX = slot.side === 'left' ? -HALF_WIDTH + 0.02 : HALF_WIDTH - 0.02
  const t = 0.1

  return (
    <group position={[wallX, 0, z]} rotation={[0, slot.rotationY, 0]}>
      {/* 문 안쪽 배경 판 */}
      <mesh position={[0, h / 2, -0.01]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={DOOR_WOOD} roughness={0.75} />
      </mesh>
      {/* 문 상단 작은 채광 유리창 */}
      <mesh position={[0, h - 0.45, -0.005]}>
        <planeGeometry args={[w * 0.55, 0.38]} />
        <meshStandardMaterial color={GLASS} emissive={GLASS} emissiveIntensity={0.35} />
      </mesh>
      {/* 문틀 기둥·상인방 */}
      <mesh position={[-(w / 2 + t / 2), h / 2, 0.02]} castShadow>
        <boxGeometry args={[t, h + t, 0.08]} />
        <meshStandardMaterial color={TRIM} />
      </mesh>
      <mesh position={[w / 2 + t / 2, h / 2, 0.02]} castShadow>
        <boxGeometry args={[t, h + t, 0.08]} />
        <meshStandardMaterial color={TRIM} />
      </mesh>
      <mesh position={[0, h + t / 2, 0.02]} castShadow>
        <boxGeometry args={[w + t * 2, t, 0.08]} />
        <meshStandardMaterial color={TRIM} />
      </mesh>
    </group>
  )
}

export default function Hallway() {
  const { width, depth, height } = HALLWAY

  return (
    <group>
      {/* 복도 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={FLOOR} roughness={0.85} />
      </mesh>
      {/* 앞쪽 끝 벽(-z), 뒤쪽 끝 벽(+z), 왼쪽 벽(-x), 오른쪽 벽(+x) */}
      <Wall position={[0, height / 2, -HALF_DEPTH]} rotationY={0} size={[width, height]} />
      <Wall position={[0, height / 2, HALF_DEPTH]} rotationY={Math.PI} size={[width, height]} />
      <Wall position={[-HALF_WIDTH, height / 2, 0]} rotationY={Math.PI / 2} size={[depth, height]} />
      <Wall position={[HALF_WIDTH, height / 2, 0]} rotationY={-Math.PI / 2} size={[depth, height]} />

      {/* 창문 */}
      {WINDOWS.map((win, idx) => (
        <WindowPane key={idx} {...win} />
      ))}

      {/* 강의실 문틀 (src/rooms.ts 개수만큼 양쪽 배치) */}
      {DOOR_SLOTS.map((slot) => (
        <DoorFrame key={slot.roomId} slot={slot} />
      ))}
    </group>
  )
}
