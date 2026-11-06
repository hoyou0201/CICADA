import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { BLACKBOARD } from './layout.ts'

const EMPTY_TEXT = '강의를 골라 칠판에 띄우세요'
const FRAME = 0.12

// 한글 글꼴을 따로 받지 않으려고 canvas에 글을 써서 텍스처로 쓴다.
function makeEmptyTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 384
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#2f4a40'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#f2f5ef'
    ctx.font = "600 56px 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(EMPTY_TEXT, canvas.width / 2, canvas.height / 2)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// 앞쪽 벽의 칠판. 공유 화면 스트림이 없을 때는 안내 문구가 쓰여 있다.
export default function Blackboard() {
  const [width, height] = BLACKBOARD.size
  const emptyTexture = useMemo(() => makeEmptyTexture(), [])
  useEffect(() => () => emptyTexture.dispose(), [emptyTexture])

  return (
    <group position={BLACKBOARD.position}>
      <mesh position={[0, 0, -0.01]} receiveShadow>
        <boxGeometry args={[width + FRAME * 2, height + FRAME * 2, 0.06]} />
        <meshStandardMaterial color="#8a6a46" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={emptyTexture} toneMapped={false} />
      </mesh>
      <mesh position={[0, -height / 2 - FRAME / 2, 0.06]} castShadow>
        <boxGeometry args={[width * 0.8, 0.05, 0.1]} />
        <meshStandardMaterial color="#8a6a46" roughness={0.7} />
      </mesh>
    </group>
  )
}
