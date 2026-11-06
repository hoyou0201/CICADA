import type { RealtimeChannel } from '@supabase/supabase-js'
import { MOVE_EVENT, roomChannel, type MovePayload } from '../contract/room.ts'
import { useStore } from '../state/store.ts'
import { createRealtimeClient } from './supabase.ts'

/**
 * 다른 사람 이동 받기. 채널 `room:{roomId}`의 `move`를 받아 저장소의 그 사람 목표 위치를 갱신한다.
 * - 오래된 메시지(같은 사람의 마지막 `at`보다 작은 것)는 버린다.
 * - 내가 보낸 것, 같은 방 목록(presence)에 없는 사람의 것, 모양이 틀린 것은 버린다.
 * - 방이 바뀌면 이전 방 채널을 닫고 새 방 채널을 듣는다.
 * - 환경 변수가 없으면(혼자 모드) 아무것도 하지 않는다.
 *
 * 같은 클라이언트에서 같은 이름의 채널을 만들면 이미 있는 채널 객체가 돌아와서,
 * 보내는 쪽(moveSender.ts)과 구독·종료가 서로 엉킨다. 그래서 받는 쪽은 전용 클라이언트를 쓴다.
 */

function isMovePayload(value: unknown): value is MovePayload {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.key === 'string' &&
    typeof v.x === 'number' &&
    typeof v.z === 'number' &&
    typeof v.rotY === 'number' &&
    typeof v.at === 'number' &&
    Number.isFinite(v.x) &&
    Number.isFinite(v.z) &&
    Number.isFinite(v.rotY) &&
    Number.isFinite(v.at)
  )
}

/**
 * 이동 받기를 시작하고, 멈추는 함수를 돌려준다.
 * @param myKey 내 presence key(`joinPresence`가 돌려주는 `handle.key`). 내 것은 무시한다.
 */
export function startMoveReceiver(myKey: string): () => void {
  const client = createRealtimeClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
  if (!client) return () => {}

  let channel: RealtimeChannel | null = null
  /** 사람(key)별로 마지막에 적용한 at */
  const lastAt = new Map<string, number>()

  const handle = (payload: unknown) => {
    if (!isMovePayload(payload) || payload.key === myKey) return
    const { remotePlayers, updateRemoteMove } = useStore.getState()
    if (!remotePlayers[payload.key]) return
    const previous = lastAt.get(payload.key)
    if (previous !== undefined && payload.at < previous) return
    lastAt.set(payload.key, payload.at)
    updateRemoteMove(payload)
  }

  const closeChannel = () => {
    if (channel) client.removeChannel(channel).catch(() => {})
    channel = null
    lastAt.clear()
  }

  const openChannel = (roomId: string) => {
    closeChannel()
    const next = client.channel(roomChannel(roomId))
    channel = next
    next.on('broadcast', { event: MOVE_EVENT }, (message) => {
      if (channel === next) handle(message.payload)
    })
    next.subscribe()
  }

  openChannel(useStore.getState().roomId)

  const unsubscribe = useStore.subscribe((state, prev) => {
    if (state.roomId !== prev.roomId) {
      openChannel(state.roomId)
    } else if (state.remotePlayers !== prev.remotePlayers) {
      // 나간 사람의 기록은 지운다.
      for (const key of lastAt.keys()) {
        if (!state.remotePlayers[key]) lastAt.delete(key)
      }
    }
  })

  return () => {
    unsubscribe()
    closeChannel()
    client.realtime.disconnect()
  }
}
