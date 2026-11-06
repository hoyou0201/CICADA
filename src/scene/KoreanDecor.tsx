import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { HALF_DEPTH, type Vec3 } from './layout.ts'

// 한국 교실 분위기를 내는 앞쪽 벽 장식: 태극기, 급훈, 시간표. 글과 그림은 canvas로 그려 텍스처로 쓴다.
const FONT = "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
const FRAME_COLOR = '#7a5a3a'
const FRAME_T = 0.05
const WALL_Z = -HALF_DEPTH + 0.04

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void

function drawTaegukgi(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  const cx = w / 2
  const cy = h / 2
  const r = h / 4
  // 태극: 위 반원은 빨강, 아래 반원은 파랑, 가운데 작은 원 둘로 S자 모양을 만든다.
  ctx.fillStyle = '#cd2e3a'
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.PI, 0)
  ctx.fill()
  ctx.fillStyle = '#0047a0'
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI)
  ctx.fill()
  ctx.fillStyle = '#cd2e3a'
  ctx.beginPath()
  ctx.arc(cx - r / 2, cy, r / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0047a0'
  ctx.beginPath()
  ctx.arc(cx + r / 2, cy, r / 2, 0, Math.PI * 2)
  ctx.fill()
  // 사괘: 건(왼쪽 위), 감(오른쪽 위), 리(왼쪽 아래), 곤(오른쪽 아래). true = 이어진 막대, false = 끊어진 막대.
  const trigrams: { sx: number; sy: number; bars: boolean[] }[] = [
    { sx: -1, sy: -1, bars: [true, true, true] },
    { sx: 1, sy: -1, bars: [false, true, false] },
    { sx: -1, sy: 1, bars: [true, false, true] },
    { sx: 1, sy: 1, bars: [false, false, false] },
  ]
  const barLen = h * 0.3
  const barT = h * 0.045
  const gap = h * 0.03
  for (const { sx, sy, bars } of trigrams) {
    ctx.save()
    ctx.translate(cx + sx * w * 0.3, cy + sy * h * 0.32)
    ctx.rotate(Math.atan2(sy * h, sx * w))
    ctx.fillStyle = '#000000'
    bars.forEach((solid, i) => {
      const x = (i - 1) * (barT + gap) - barT / 2
      if (solid) {
        ctx.fillRect(x, -barLen / 2, barT, barLen)
      } else {
        const piece = (barLen - gap * 2) / 2
        ctx.fillRect(x, -barLen / 2, barT, piece)
        ctx.fillRect(x, barLen / 2 - piece, barT, piece)
      }
    })
    ctx.restore()
  }
}

function drawMotto(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#fdfaf2'
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = '#b8955f'
  ctx.lineWidth = 6
  ctx.strokeRect(12, 12, w - 24, h - 24)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#a23b2e'
  ctx.font = `800 ${h * 0.2}px ${FONT}`
  ctx.fillText('급훈', w / 2, h * 0.27)
  ctx.fillStyle = '#1e293b'
  ctx.font = `700 ${h * 0.17}px ${FONT}`
  ctx.fillText('서로 존중하고', w / 2, h * 0.55)
  ctx.fillText('함께 성장하자', w / 2, h * 0.78)
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

const DAYS = ['월', '화', '수', '목', '금']
const SUBJECTS = [
  ['국어', '수학', '영어', '과학', '체육'],
  ['수학', '영어', '국어', '사회', '음악'],
  ['영어', '국어', '수학', '체육', '미술'],
  ['사회', '과학', '도덕', '국어', '수학'],
]

function drawTimetable(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#fdfaf2'
  ctx.fillRect(0, 0, w, h)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const rows = SUBJECTS.length + 1
  const titleH = h * 0.16
  const cellW = w / DAYS.length
  const cellH = (h - titleH) / rows
  ctx.fillStyle = '#2f4a40'
  ctx.fillRect(0, 0, w, titleH)
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 ${titleH * 0.6}px ${FONT}`
  ctx.fillText('시간표 (예시)', w / 2, titleH / 2)
  ctx.font = `700 ${cellH * 0.5}px ${FONT}`
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < DAYS.length; c++) {
      const x = c * cellW
      const y = titleH + r * cellH
      ctx.fillStyle = r === 0 ? '#dce9e1' : '#fdfaf2'
      ctx.fillRect(x, y, cellW, cellH)
      ctx.strokeStyle = '#9db3a6'
      ctx.lineWidth = 2
      ctx.strokeRect(x, y, cellW, cellH)
      ctx.fillStyle = '#1e293b'
      ctx.fillText(r === 0 ? DAYS[c] : SUBJECTS[r - 1][c], x + cellW / 2, y + cellH / 2)
    }
  }
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

const TAEGUKGI_PX: [number, number] = [768, 512]
const MOTTO_PX: [number, number] = [512, 384]
const CLOCK_PX: [number, number] = [256, 256]
const TIMETABLE_PX: [number, number] = [640, 560]

export default function KoreanDecor() {
  return (
    <group>
      <WallCanvas position={[-5.6, 2.5, WALL_Z]} size={[1.5, 1]} px={TAEGUKGI_PX} draw={drawTaegukgi} />
      <WallCanvas position={[-5.6, 3.5, WALL_Z]} size={[0.45, 0.45]} px={CLOCK_PX} draw={drawClock} />
      <WallCanvas position={[5.3, 3, WALL_Z]} size={[1.3, 0.97]} px={MOTTO_PX} draw={drawMotto} />
      <WallCanvas position={[5.3, 1.75, WALL_Z]} size={[1.3, 1.14]} px={TIMETABLE_PX} draw={drawTimetable} />
    </group>
  )
}
