import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import {
  DOOR_SLOTS,
  HALF_DEPTH,
  HALF_WIDTH,
  HALLWAY,
  POSTERS,
  WINDOWS,
  type DoorSlot,
  type HallwayPoster,
  type HallwayWindow,
  type Vec3,
} from './layout.ts'

const FLOOR = '#c5b496'
const FLOOR_STRIP = '#b29e7d'
const WALL = '#f2eee4'
const WAINSCOT = '#e1d7c4'
const TRIM = '#7d5f41'
const DOOR_WOOD = '#5c432e'
const GLASS = '#bfe0f2'
const FRAME = '#e8e2d4'
const BOARD_CORK = '#c89d66'

const FRAME_T = 0.08
const CEILING_LIGHTS_Z = [-8, -2.5, 2.5, 8]

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
  const [w, h] = size
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <planeGeometry args={size} />
        <meshStandardMaterial color={GLASS} emissive={GLASS} emissiveIntensity={0.65} />
      </mesh>
      {/* 창틀 테두리 + 세로·가로 창살 */}
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
      <mesh position={[0, 0.15, 0.02]}>
        <boxGeometry args={[w, FRAME_T * 0.75, 0.05]} />
        <meshStandardMaterial color={FRAME} />
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

function makePosterTexture(poster: HallwayPoster) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 320
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#fdfaf2'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // 상단 배너
    ctx.fillStyle = poster.accent
    ctx.fillRect(24, 24, canvas.width - 48, 58)
    ctx.fillStyle = '#ffffff'
    ctx.font = "700 26px 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.fillText(poster.badge, 44, 53)

    // 제목·부제
    ctx.fillStyle = '#1e293b'
    ctx.font = "700 36px 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
    ctx.fillText(poster.title, 40, 145)

    ctx.fillStyle = '#475569'
    ctx.font = "500 24px 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
    ctx.fillText(poster.subtitle, 40, 198)

    // 하단 메모지 장식
    ctx.fillStyle = '#fef08a'
    ctx.fillRect(40, 232, 130, 56)
    ctx.fillStyle = '#bfdbfe'
    ctx.fillRect(190, 232, 130, 56)
    ctx.fillStyle = '#bbf7d0'
    ctx.fillRect(340, 232, 130, 56)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function PosterBoard({ poster }: { poster: HallwayPoster }) {
  const [w, h] = poster.size
  const texture = useMemo(() => makePosterTexture(poster), [poster])
  useEffect(() => () => texture.dispose(), [texture])

  return (
    <group position={poster.position} rotation={[0, poster.rotationY, 0]}>
      {/* 게시판 나무 테두리와 코르크 배경 */}
      <mesh position={[0, 0, -0.01]} receiveShadow>
        <boxGeometry args={[w + 0.14, h + 0.14, 0.05]} />
        <meshStandardMaterial color={TRIM} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.018]}>
        <planeGeometry args={[w + 0.04, h + 0.04]} />
        <meshStandardMaterial color={BOARD_CORK} roughness={0.85} />
      </mesh>
      {/* 게시물 인쇄면 */}
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[w * 0.92, h * 0.88]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}

export default function Hallway() {
  const { width, depth, height } = HALLWAY
  const wainscotH = 1.1

  return (
    <group>
      {/* 복도 바닥 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={FLOOR} roughness={0.85} />
      </mesh>
      {/* 복도 길이 방향 타일 라인 */}
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.18, depth - 0.8]} />
          <meshStandardMaterial color={FLOOR_STRIP} roughness={0.85} />
        </mesh>
      ))}

      {/* 앞쪽 끝 벽(-z), 뒤쪽 끝 벽(+z), 왼쪽 벽(-x), 오른쪽 벽(+x) */}
      <Wall position={[0, height / 2, -HALF_DEPTH]} rotationY={0} size={[width, height]} />
      <Wall position={[0, height / 2, HALF_DEPTH]} rotationY={Math.PI} size={[width, height]} />
      <Wall position={[-HALF_WIDTH, height / 2, 0]} rotationY={Math.PI / 2} size={[depth, height]} />
      <Wall position={[HALF_WIDTH, height / 2, 0]} rotationY={-Math.PI / 2} size={[depth, height]} />

      {/* 학교 복도 느낌을 주는 하단 투톤 벽(웨인스코팅)과 허리 몰딩 */}
      <mesh position={[-HALF_WIDTH + 0.008, wainscotH / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[depth, wainscotH]} />
        <meshStandardMaterial color={WAINSCOT} />
      </mesh>
      <mesh position={[HALF_WIDTH - 0.008, wainscotH / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[depth, wainscotH]} />
        <meshStandardMaterial color={WAINSCOT} />
      </mesh>

      {/* 걸레받이 */}
      {[
        { p: [0, 0.06, -HALF_DEPTH + 0.01], r: 0, s: width },
        { p: [0, 0.06, HALF_DEPTH - 0.01], r: Math.PI, s: width },
        { p: [-HALF_WIDTH + 0.015, 0.06, 0], r: Math.PI / 2, s: depth },
        { p: [HALF_WIDTH - 0.015, 0.06, 0], r: -Math.PI / 2, s: depth },
      ].map(({ p, r, s }, i) => (
        <mesh key={i} position={p as Vec3} rotation={[0, r, 0]}>
          <boxGeometry args={[s, 0.12, 0.02]} />
          <meshStandardMaterial color={TRIM} />
        </mesh>
      ))}

      {/* 천장 보와 복도 형광등 */}
      {CEILING_LIGHTS_Z.map((z) => (
        <group key={z} position={[0, height - 0.08, z]}>
          <mesh>
            <boxGeometry args={[width - 0.4, 0.12, 0.28]} />
            <meshStandardMaterial color={FRAME} />
          </mesh>
          <mesh position={[0, -0.07, 0]}>
            <boxGeometry args={[2.2, 0.04, 0.18]} />
            <meshStandardMaterial color="#fff9eb" emissive="#fff3d1" emissiveIntensity={0.7} />
          </mesh>
        </group>
      ))}

      {/* 창문 */}
      {WINDOWS.map((win, idx) => (
        <WindowPane key={idx} {...win} />
      ))}

      {/* 학교 게시판·포스터 */}
      {POSTERS.map((poster) => (
        <PosterBoard key={poster.id} poster={poster} />
      ))}

      {/* 강의실 문틀 (src/rooms.ts 개수만큼 양쪽 배치) */}
      {DOOR_SLOTS.map((slot) => (
        <DoorFrame key={slot.roomId} slot={slot} />
      ))}
    </group>
  )
}
