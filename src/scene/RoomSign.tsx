import { Html } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { ROOMS } from '../rooms.ts'
import { useStore } from '../state/store.ts'
import { ROOM_SIGN } from './layout.ts'

const SIGN_WIDTH = 2.0
const SIGN_HEIGHT = 0.52
const FRAME = 0.06
// 칠판 상단 테두리(y = 3.62, z = -HALF_DEPTH + 0.09)보다 위·앞쪽에 걸리도록 오프셋을 둔다.
const OFFSET: [number, number, number] = [-0.3, 0.34, 0.05]

function getRoomName(roomId: string): string {
  return ROOMS.find((room) => room.id === roomId)?.name ?? roomId
}

function makeSignTexture(name: string): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 144
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#fdfaf2'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = '#8a6a46'
    ctx.lineWidth = 8
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20)

    ctx.fillStyle = '#1e293b'
    ctx.font = "700 60px 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name, canvas.width / 2, canvas.height / 2 + 2)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// 칠판 위에 지금 강의실 이름을 걸어 보여 준다.
export default function RoomSign() {
  const roomId = useStore((state) => state.roomId)
  const roomName = getRoomName(roomId)
  const texture = useMemo(() => makeSignTexture(roomName), [roomName])

  useEffect(() => () => texture.dispose(), [texture])

  return (
    <group position={ROOM_SIGN.position}>
      <group position={OFFSET}>
        <mesh position={[0, 0, -0.01]} castShadow receiveShadow>
          <boxGeometry args={[SIGN_WIDTH + FRAME * 2, SIGN_HEIGHT + FRAME * 2, 0.05]} />
          <meshStandardMaterial color="#8a6a46" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[SIGN_WIDTH, SIGN_HEIGHT]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
        <Html center style={{ pointerEvents: 'none', opacity: 0, userSelect: 'none' }}>
          <span data-testid="room-sign">{roomName}</span>
        </Html>
      </group>
    </group>
  )
}
