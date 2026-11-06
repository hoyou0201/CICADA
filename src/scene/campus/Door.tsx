import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import type { Navigate } from '../../App.tsx'
import { CAMPUS_CHANNEL } from '../../contract/room.ts'
import { createRealtimeClient } from '../../room/supabase.ts'
import { switchRoom } from '../../room/switchRoom.ts'
import { useStore } from '../../state/store.ts'
import { isTypingTarget } from '../player/usePlayerControls.ts'
import type { DoorSlot } from './layout.ts'

/**
 * 복도의 강의실 문 하나. 문 위에 강의실 이름과 인원 수를 보여 주고,
 * 가까이 가면 '들어가기' 표시를 띄운다. 문을 누르거나 가까이서 E를 누르면
 * 그 방으로 들어간다(방을 바꾸고 강의실 화면으로 이동).
 * 문틀과 문짝은 Hallway.tsx가 그린다. 여기서는 표지판·표시·상호작용만 맡는다.
 */

const SIGN_SIZE: [number, number] = [1.3, 0.46]
const PROMPT_SIZE: [number, number] = [1.0, 0.26]
const FONT = "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"

// ───────────────────────── 방별 인원 수 ─────────────────────────
// presence(채널 campus)를 읽기만 하고 올리지는 않는다. 같은 클라이언트에서 같은 이름의
// 채널을 만들면 presence.ts가 쓰는 채널과 겹치므로 전용 클라이언트를 쓰고,
// 문이 하나라도 화면에 있는 동안만 연결한다.

type Counts = Readonly<Record<string, number>>

const NO_COUNTS: Counts = {}
let counts: Counts = NO_COUNTS
let references = 0
let teardown: (() => void) | null = null
const listeners = new Set<() => void>()

/** presenceState()에서 roomId별 사람 수를 센다. key마다 마지막 값 하나만 본다. */
function countByRoom(state: Record<string, unknown[]>): Counts {
  const result: Record<string, number> = {}
  for (const metas of Object.values(state)) {
    const latest = metas[metas.length - 1] as { roomId?: unknown } | undefined
    if (latest && typeof latest.roomId === 'string') {
      result[latest.roomId] = (result[latest.roomId] ?? 0) + 1
    }
  }
  return result
}

function startCounting(): () => void {
  const client = createRealtimeClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
  if (!client) return () => {} // 혼자 모드: 모두 0명으로 보인다
  const channel = client.channel(CAMPUS_CHANNEL)
  channel.on('presence', { event: 'sync' }, () => {
    counts = countByRoom(channel.presenceState())
    listeners.forEach((notify) => notify())
  })
  channel.subscribe()
  return () => {
    client.removeChannel(channel).catch(() => {})
    client.realtime.disconnect()
  }
}

function subscribeCounts(notify: () => void): () => void {
  listeners.add(notify)
  if (references++ === 0) teardown = startCounting()
  return () => {
    listeners.delete(notify)
    if (--references === 0) {
      teardown?.()
      teardown = null
      counts = NO_COUNTS
    }
  }
}

const getCounts = () => counts

// ───────────────────────── 글씨 그리기 ─────────────────────────
// 한글 글꼴을 따로 받지 않으려고 canvas에 글을 써서 텍스처로 쓴다(Blackboard와 같은 방식).

function roundRect(ctx: CanvasRenderingContext2D, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.arcTo(w, 0, w, h, r)
  ctx.arcTo(w, h, 0, h, r)
  ctx.arcTo(0, h, 0, 0, r)
  ctx.arcTo(0, 0, w, 0, r)
  ctx.closePath()
}

function makeTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) draw(ctx)
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

function makeSignTexture(name: string, count: number) {
  return makeTexture(520, 184, (ctx) => {
    ctx.fillStyle = '#3b2b1d'
    roundRect(ctx, 520, 184, 24)
    ctx.fill()
    ctx.strokeStyle = '#8a6a49'
    ctx.lineWidth = 6
    roundRect(ctx, 520, 184, 24)
    ctx.stroke()
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#f6efe0'
    ctx.font = `700 60px ${FONT}`
    ctx.fillText(name, 260, 66)
    ctx.fillStyle = count > 0 ? '#9be3a8' : '#bfae94'
    ctx.font = `600 46px ${FONT}`
    ctx.fillText(`${count}명`, 260, 135)
  })
}

function makePromptTexture() {
  return makeTexture(420, 112, (ctx) => {
    ctx.fillStyle = '#2f6f4f'
    roundRect(ctx, 420, 112, 56)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = `700 46px ${FONT}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('들어가기 (E)', 210, 58)
  })
}

/** 내 위치가 문 앞(enterRadius 안)인가. */
function isNear(slot: DoorSlot, position: { x: number; z: number }): boolean {
  return Math.hypot(position.x - slot.position[0], position.z - slot.position[2]) <= slot.enterRadius
}

// ───────────────────────── 문 ─────────────────────────

type Props = {
  slot: DoorSlot
  navigate: Navigate
}

export default function Door({ slot, navigate }: Props) {
  const count = useSyncExternalStore(subscribeCounts, getCounts)[slot.roomId] ?? 0
  const near = useStore((state) => isNear(slot, state.position))
  const [doorWidth, doorHeight] = slot.size

  const sign = useMemo(() => makeSignTexture(slot.name, count), [slot.name, count])
  useEffect(() => () => sign.dispose(), [sign])
  const prompt = useMemo(() => makePromptTexture(), [])
  useEffect(() => () => prompt.dispose(), [prompt])

  const enter = useMemo(
    () => () => {
      switchRoom(slot.roomId)
      navigate('classroom')
    },
    [slot.roomId, navigate],
  )

  // 가까이 있는 동안만 E 키로 들어간다. 입력창에 글을 쓰는 중에는 무시한다.
  useEffect(() => {
    if (!near) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyE' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      enter()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [near, enter])

  const setCursor = (value: string) => {
    document.body.style.cursor = value
  }
  useEffect(() => () => setCursor(''), [])

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation() // 바닥 클릭 이동으로 넘어가지 않게
    enter()
  }

  return (
    <group position={slot.position} rotation={[0, slot.rotationY, 0]}>
      {/* 문 위 표지판: 강의실 이름과 인원 수 */}
      <mesh position={[0, doorHeight / 2 + 0.38, 0.12]}>
        <planeGeometry args={SIGN_SIZE} />
        <meshBasicMaterial map={sign} transparent toneMapped={false} />
      </mesh>

      {/* 눌러서 들어가는 영역(문짝 전체) */}
      <mesh
        position={[0, 0, 0.1]}
        onClick={onClick}
        onPointerOver={() => setCursor('pointer')}
        onPointerOut={() => setCursor('')}
      >
        <planeGeometry args={[doorWidth, doorHeight]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* 가까이 가면 뜨는 '들어가기' 표시 */}
      {near && (
        <mesh position={[0, -doorHeight / 2 + 1.1, 0.14]} renderOrder={2}>
          <planeGeometry args={PROMPT_SIZE} />
          <meshBasicMaterial map={prompt} transparent depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  )
}
