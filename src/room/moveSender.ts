import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  MOVE_EVENT,
  MOVE_MAX_PER_SECOND,
  roomChannel,
  type MovePayload,
} from '../contract/room.ts'
import { useStore } from '../state/store.ts'
import { supabase } from './supabase.ts'

/**
 * 내 이동 보내기. 내 위치가 바뀌면 채널 `room:{roomId}`에 `move`를 보낸다.
 * - 초당 최대 MOVE_MAX_PER_SECOND번: 보낸 뒤 최소 간격 안에 또 움직이면 간격이 지난 뒤
 *   그때의 최신 위치 하나만 보낸다(마지막 위치는 반드시 전달된다).
 * - 방 입장 직후와 이후 2초마다 움직이지 않아도 현재 위치를 보낸다.
 * - 방이 바뀌면 이전 방 채널을 닫고 새 방 채널로 옮긴다.
 * - supabase가 null이면(혼자 모드) 아무것도 하지 않는다.
 * 채널 연결·presence는 presence.ts가 맡는다.
 */

const MIN_INTERVAL_MS = 1000 / MOVE_MAX_PER_SECOND
const POSITION_REFRESH_MS = 2000

type Pose = { x: number; z: number; rotY: number }

/** 아주 작은 흔들림은 같은 위치로 본다(소수 셋째 자리). */
function round(value: number): number {
  return Math.round(value * 1000) / 1000
}

function currentPose(): Pose {
  const { position, rotY } = useStore.getState()
  return { x: round(position.x), z: round(position.z), rotY: round(rotY) }
}

function samePose(a: Pose, b: Pose): boolean {
  return a.x === b.x && a.z === b.z && a.rotY === b.rotY
}

/**
 * 이동 보내기를 시작하고, 멈추는 함수를 돌려준다.
 * @param key 내 presence key(`joinPresence`가 돌려주는 `handle.key`)
 */
export function startMoveSender(key: string): () => void {
  if (!supabase) return () => {}
  const client = supabase

  let channel: RealtimeChannel | null = null
  let joined = false
  /** 마지막으로 보낸(또는 방에 들어갈 때의) 위치 */
  let last: Pose = currentPose()
  let lastSentAt = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  /** 방에 들어온 직후 위치는 한 번 보내야 상대가 바로 볼 수 있다 */
  let announced = false
  let refresh = false

  const closeChannel = () => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
    if (channel) client.removeChannel(channel).catch(() => {})
    channel = null
    joined = false
  }

  const flush = () => {
    timer = null
    if (!channel || !joined) return

    const wait = lastSentAt + MIN_INTERVAL_MS - Date.now()
    if (wait > 0) {
      timer = setTimeout(flush, wait)
      return
    }

    const pose = currentPose()
    if (announced && !refresh && samePose(pose, last)) return

    const payload: MovePayload = { key, ...pose, at: Date.now() }
    announced = true
    refresh = false
    channel.send({ type: 'broadcast', event: MOVE_EVENT, payload }).catch(() => {})
    last = pose
    lastSentAt = Date.now()
  }

  const schedule = () => {
    if (timer !== null) return
    const wait = lastSentAt + MIN_INTERVAL_MS - Date.now()
    if (wait <= 0) flush()
    else timer = setTimeout(flush, wait)
  }

  const openChannel = (roomId: string) => {
    closeChannel()
    last = currentPose()
    lastSentAt = 0
    announced = false
    const next = client.channel(roomChannel(roomId), {
      config: { broadcast: { self: false } },
    })
    channel = next
    next.subscribe((status) => {
      if (channel !== next) return
      joined = status === 'SUBSCRIBED'
      // 연결되는 동안 움직였다면 지금 위치를 보낸다.
      if (joined) schedule()
    })
  }

  openChannel(useStore.getState().roomId)
  // 새로 입장한 사람도 이미 멈춰 있는 참가자의 위치를 받을 수 있어야 한다.
  const refreshTimer = setInterval(() => {
    refresh = true
    schedule()
  }, POSITION_REFRESH_MS)

  const unsubscribe = useStore.subscribe((state, prev) => {
    if (state.roomId !== prev.roomId) {
      openChannel(state.roomId)
    } else if (state.position !== prev.position || state.rotY !== prev.rotY) {
      schedule()
    }
  })

  return () => {
    clearInterval(refreshTimer)
    unsubscribe()
    closeChannel()
  }
}
