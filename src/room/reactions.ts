import type { RealtimeChannel } from '@supabase/supabase-js'
import { create } from 'zustand'
import { roomChannel } from '../contract/room.ts'
import { useStore } from '../state/store.ts'
import { createRealtimeClient } from './supabase.ts'

/**
 * 리액션(끄덕·손들기·졸기) 보내기와 받기.
 * - 버튼·1·2·3 키는 ReactionBar가 맡고, 여기 `sendReaction`을 부른다.
 * - 내 리액션은 연결과 상관없이 바로 내 화면(저장소)에 넣는다. 연결이 있으면 같은 방 사람에게도
 *   채널 `room:{roomId}`의 `reaction` broadcast로 보낸다. 연결이 없으면 내 화면에서만 보인다.
 * - 받은 리액션도 같은 저장소에 넣는다. 일정 시간이 지나면 저절로 지운다.
 *
 * 계약(공통 contract/room.ts에는 아직 없어서 여기에 둔다):
 *   채널 `room:{roomId}`, 이벤트 `reaction`, `{ key: string; kind: ReactionKind; at: number }`
 *   key는 보낸 사람의 presence key(받는 쪽이 같은 방 사람 목록에서 아바타를 찾는 데 쓴다).
 */

export type ReactionKind = 'nod' | 'hand' | 'sleep'

export const REACTION_EVENT = 'reaction'

/** 버튼과 숫자 키. 순서가 1·2·3 키와 같다. */
export const REACTIONS: readonly { kind: ReactionKind; label: string; icon: string; shortcut: string }[] = [
  { kind: 'nod', label: '끄덕', icon: '🙆', shortcut: '1' },
  { kind: 'hand', label: '손들기', icon: '✋', shortcut: '2' },
  { kind: 'sleep', label: '졸기', icon: '😴', shortcut: '3' },
]

/** 리액션이 보이는 시간(ms). 지나면 저장소에서 지운다. */
export const REACTION_DURATION_MS: Readonly<Record<ReactionKind, number>> = {
  nod: 2500,
  hand: 6000,
  sleep: 6000,
}

/** 연달아 눌러도 이 시간(ms) 안에는 한 번만 보낸다. */
export const REACTION_MIN_INTERVAL_MS = 400

/** 연결 전이거나 key를 모를 때 내 리액션을 담는 이름. */
const LOCAL_KEY = 'me'

export type ActiveReaction = { kind: ReactionKind; at: number }

export type ReactionPayload = { key: string; kind: ReactionKind; at: number }

type ReactionState = {
  /** 내 리액션이 들어 있는 key. startReactions 전에는 'me' */
  selfKey: string
  /** 지금 보이는 리액션(사람 key → 리액션). 내 것도 들어 있다 */
  reactions: Record<string, ActiveReaction>
  /** 리액션을 넣는다. 같은 사람의 더 새 리액션이 이미 있으면 무시한다 */
  show: (key: string, kind: ReactionKind, at?: number) => void
  clear: (key: string) => void
  reset: () => void
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function clearTimer(key: string) {
  const timer = timers.get(key)
  if (timer !== undefined) clearTimeout(timer)
  timers.delete(key)
}

export const useReactions = create<ReactionState>()((set, get) => ({
  selfKey: LOCAL_KEY,
  reactions: {},

  show: (key, kind, at = Date.now()) => {
    const current = get().reactions[key]
    if (current && at < current.at) return
    clearTimer(key)
    set((state) => ({ reactions: { ...state.reactions, [key]: { kind, at } } }))
    timers.set(
      key,
      setTimeout(() => get().clear(key), REACTION_DURATION_MS[kind]),
    )
  },

  clear: (key) => {
    clearTimer(key)
    set((state) => {
      if (!(key in state.reactions)) return state
      const { [key]: _removed, ...rest } = state.reactions
      return { reactions: rest }
    })
  },

  reset: () => {
    for (const key of [...timers.keys()]) clearTimer(key)
    lastSentAt = 0
    set({ selfKey: LOCAL_KEY, reactions: {} })
  },
}))

const KINDS: readonly string[] = REACTIONS.map((reaction) => reaction.kind)

/** 다른 사람이 보낸 값이므로 모양을 확인한다. */
function isReactionPayload(value: unknown): value is ReactionPayload {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.key === 'string' &&
    v.key.length > 0 &&
    typeof v.kind === 'string' &&
    KINDS.includes(v.kind) &&
    typeof v.at === 'number' &&
    Number.isFinite(v.at)
  )
}

/** 지금 열려 있는 방 채널. startReactions 전이거나 연결이 없으면 null. */
let sender: ((kind: ReactionKind, at: number) => void) | null = null
let lastSentAt = 0

/**
 * 리액션을 보낸다. 내 화면에는 바로 넣고, 연결이 있으면 같은 방 사람에게도 보낸다.
 * @returns 실제로 처리했으면 true. 너무 빨리 연달아 누르면 false(무시)
 */
export function sendReaction(kind: ReactionKind): boolean {
  const now = Date.now()
  if (now - lastSentAt < REACTION_MIN_INTERVAL_MS) return false
  lastSentAt = now

  const { selfKey, show } = useReactions.getState()
  show(selfKey, kind, now)
  sender?.(kind, now)
  return true
}

/**
 * 리액션 받기·보내기를 시작하고, 멈추는 함수를 돌려준다.
 * @param myKey 내 presence key(`joinPresence`가 돌려주는 `handle.key`)
 *
 * 같은 클라이언트에서 같은 이름의 채널을 만들면 이미 있는 채널 객체가 돌아와
 * moveSender/moveReceiver와 구독·종료가 엉키므로 전용 클라이언트를 쓴다.
 * 환경 변수가 없으면 연결 없이 내 화면에서만 보인다.
 */
export function startReactions(myKey: string): () => void {
  useReactions.getState().reset()
  useReactions.setState({ selfKey: myKey })
  lastSentAt = 0

  const client = createRealtimeClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
  if (!client) {
    sender = null
    return () => {
      useReactions.getState().reset()
    }
  }

  let channel: RealtimeChannel | null = null
  let joined = false

  const closeChannel = () => {
    sender = null
    joined = false
    if (channel) client.removeChannel(channel).catch(() => {})
    channel = null
  }

  const openChannel = (roomId: string) => {
    closeChannel()
    const next = client.channel(roomChannel(roomId), { config: { broadcast: { self: false } } })
    channel = next
    next.on('broadcast', { event: REACTION_EVENT }, (message) => {
      if (channel !== next) return
      const payload: unknown = message.payload
      if (!isReactionPayload(payload) || payload.key === myKey) return
      useReactions.getState().show(payload.key, payload.kind, payload.at)
    })
    next.subscribe((status) => {
      if (channel !== next) return
      joined = status === 'SUBSCRIBED'
    })
    sender = (kind, at) => {
      if (channel !== next || !joined) return
      const payload: ReactionPayload = { key: myKey, kind, at }
      next.send({ type: 'broadcast', event: REACTION_EVENT, payload }).catch(() => {})
    }
  }

  openChannel(useStore.getState().roomId)

  // 방을 옮기면 이전 방 채널을 닫고 새 방 채널로 옮긴다. 이전 방 사람의 리액션은 지운다.
  const unsubscribe = useStore.subscribe((state, prev) => {
    if (state.roomId !== prev.roomId) {
      const { selfKey, reactions, clear } = useReactions.getState()
      for (const key of Object.keys(reactions)) if (key !== selfKey) clear(key)
      openChannel(state.roomId)
    }
  })

  return () => {
    unsubscribe()
    closeChannel()
    client.realtime.disconnect()
    useReactions.getState().reset()
  }
}
