import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { HALF_DEPTH, type Vec3 } from './layout.ts'

// 한국 대학 강의실 분위기를 내는 앞쪽 벽 장식(칠판 왼쪽; 오른쪽은 학교 공지 게시판 자리): 벽시계, 강의실 이용 안내, 빔프로젝터 고정 막대. 글과 그림은 canvas로 그려 텍스처로 쓴다.
const FONT = "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
const FRAME_COLOR = '#7a5a3a'
const FRAME_T = 0.05
const WALL_Z = -HALF_DEPTH + 0.04

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

const NOTICE_LINES = ['음식물 반입 금지', '휴대전화는 무음으로', '퇴실 시 자리 정리', '출석은 수업 시작 후 10분 이내']

function drawNotice(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#fdfaf2'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#1f3a5f'
  const titleH = h * 0.2
  ctx.fillRect(0, 0, w, titleH)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 ${titleH * 0.6}px ${FONT}`
  ctx.fillText('강의실 이용 안내', w / 2, titleH / 2)
  ctx.fillStyle = '#1e293b'
  ctx.font = `600 ${h * 0.075}px ${FONT}`
  const lineH = (h - titleH) / NOTICE_LINES.length
  NOTICE_LINES.forEach((line, i) => ctx.fillText(line, w / 2, titleH + lineH * (i + 0.5)))
  ctx.strokeStyle = '#1f3a5f'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, w - 6, h - 6)
}

// 10시 10분을 가리키는 둥근 벽시계(장식이라 시간은 고정).
function drawClock(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const c = w / 2
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = '#3b3b3b'
  ctx.beginPath()
  ctx.arc(c, c, c, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fdfaf2'
  ctx.beginPath()
  ctx.arc(c, c, c * 0.88, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#1e293b'
  ctx.lineCap = 'round'
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6
    ctx.lineWidth = i % 3 === 0 ? w * 0.03 : w * 0.015
    ctx.beginPath()
    ctx.moveTo(c + Math.sin(a) * c * 0.72, c - Math.cos(a) * c * 0.72)
    ctx.lineTo(c + Math.sin(a) * c * 0.82, c - Math.cos(a) * c * 0.82)
    ctx.stroke()
  }
  const hand = (angle: number, length: number, width: number) => {
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(c, c)
    ctx.lineTo(c + Math.sin(angle) * c * length, c - Math.cos(angle) * c * length)
    ctx.stroke()
  }
  hand(((10 + 10 / 60) * Math.PI) / 6, 0.5, w * 0.035)
  hand((10 * Math.PI) / 30, 0.72, w * 0.022)
  ctx.fillStyle = '#a23b2e'
  ctx.beginPath()
  ctx.arc(c, c, w * 0.03, 0, Math.PI * 2)
  ctx.fill()
}

function WallCanvas({ position, size, px, draw }: { position: Vec3; size: [number, number]; px: [number, number]; draw: Draw }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = px[0]
    canvas.height = px[1]
    const ctx = canvas.getContext('2d')
    if (ctx) draw(ctx, px[0], px[1])
    const tex = new CanvasTexture(canvas)
    tex.colorSpace = SRGBColorSpace
    tex.anisotropy = 8
    return tex
  }, [draw, px])
  useEffect(() => () => texture.dispose(), [texture])
  const [w, h] = size
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.01]} castShadow receiveShadow>
        <boxGeometry args={[w + FRAME_T * 2, h + FRAME_T * 2, 0.04]} />
        <meshStandardMaterial color={FRAME_COLOR} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={size} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}

const NOTICE_PX: [number, number] = [512, 400]
const CLOCK_PX: [number, number] = [256, 256]
const ROD_COLOR = '#5b6470'

// 빔프로젝터를 천장(방 높이)에서 매다는 막대. 프로젝터 위치는 Decor의 `projector`와 맞춘다.
function ProjectorRod() {
  return (
    <mesh position={[0, 3.65, -0.5]}>
      <cylinderGeometry args={[0.03, 0.03, 0.7, 8]} />
      <meshStandardMaterial color={ROD_COLOR} />
    </mesh>
  )
}

export default function LectureDecor() {
  return (
    <group>
      <WallCanvas position={[-5.4, 3, WALL_Z]} size={[0.6, 0.6]} px={CLOCK_PX} draw={drawClock} />
      <WallCanvas position={[-5.4, 1.85, WALL_Z]} size={[1.3, 1.02]} px={NOTICE_PX} draw={drawNotice} />
      <ProjectorRod />
    </group>
  )
}
