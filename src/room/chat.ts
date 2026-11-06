import type { RealtimeChannel } from '@supabase/supabase-js'
import { create } from 'zustand'
import { roomChannel } from '../contract/room.ts'
import { useStore } from '../state/store.ts'
import { createRealtimeClient } from './supabase.ts'

/**
 * 같은 방 채팅. 저장하지 않고 broadcast로만 주고받는다(새로고침하면 사라진다).
 * 계약: 채널 `room:{roomId}`, 이벤트 `chat`, `{ key, nickname, text, at }`
 * 내 메시지는 연결과 상관없이 바로 내 화면에 넣는다. 연결이 없으면 나만 본다.
 */

export const CHAT_EVENT = 'chat'
export const CHAT_TEXT_MAX = 200
export const CHAT_HISTORY_MAX = 50
/** 이 시간(ms) 안에 연달아 보내면 무시한다. */
export const CHAT_MIN_INTERVAL_MS = 500

export type ChatMessage = { id: string; key: string; nickname: string; text: string; at: number; mine: boolean }

export type ChatPayload = { key: string; nickname: string; text: string; at: number }

/** 머리 위 말풍선이 보이는 시간(ms). */
export const CHAT_BUBBLE_MS = 6000

export type ChatBubble = { text: string; at: number }

type ChatState = {
  messages: ChatMessage[]
  /** 사람 key → 머리 위에 띄울 가장 최근 메시지. 시간이 지나면 지운다 */
  bubbles: Record<string, ChatBubble>
  /** 내 메시지가 들어 있는 key. startChat 전에는 'me' */
  selfKey: string
  add: (message: Omit<ChatMessage, 'id'>) => void
  reset: () => void
}

let seq = 0

export const useChat = create<ChatState>()((set, get) => ({
  messages: [],
  bubbles: {},
  selfKey: 'me',
  add: (message) => {
    const bubble = { text: message.text, at: message.at }
    set((state) => ({
      messages: [...state.messages, { ...message, id: `${message.at}-${seq++}` }].slice(-CHAT_HISTORY_MAX),
      bubbles: { ...state.bubbles, [message.key]: bubble },
    }))
    // 그 사이 새 메시지가 오지 않았을 때만 지운다.
    setTimeout(() => {
      const current = get().bubbles[message.key]
      if (current !== bubble) return
      set((state) => {
        const { [message.key]: _removed, ...rest } = state.bubbles
        return { bubbles: rest }
      })
    }, CHAT_BUBBLE_MS)
  },
  reset: () => set({ messages: [], bubbles: {}, selfKey: 'me' }),
}))

export function isValidChatText(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.length > 0 && trimmed.length <= CHAT_TEXT_MAX
}

function isChatPayload(value: unknown): value is ChatPayload {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.key === 'string' &&
    v.key.length > 0 &&
    typeof v.nickname === 'string' &&
    typeof v.text === 'string' &&
    isValidChatText(v.text) &&
    typeof v.at === 'number' &&
    Number.isFinite(v.at)
  )
}

let sender: ((text: string, at: number) => void) | null = null
let selfKey = 'me'
let selfNickname = ''
let lastSentAt = 0

/** 메시지를 보낸다. 비었거나 너무 길거나 너무 빨리 연달아 보내면 false(무시). */
export function sendChat(text: string): boolean {
  const trimmed = text.trim()
  const now = Date.now()
  if (!isValidChatText(trimmed) || now - lastSentAt < CHAT_MIN_INTERVAL_MS) return false
  lastSentAt = now
  useChat.getState().add({ key: selfKey, nickname: selfNickname, text: trimmed, at: now, mine: true })
  sender?.(trimmed, now)
  return true
}

/**
 * 채팅 받기·보내기를 시작하고, 멈추는 함수를 돌려준다.
 * 다른 broadcast와 채널이 엉키지 않도록 전용 클라이언트를 쓴다. 환경 변수가 없으면 나만 본다.
 */
export function startChat(myKey: string, nickname: string): () => void {
  useChat.getState().reset()
  useChat.setState({ selfKey: myKey })
  selfKey = myKey
  selfNickname = nickname
  lastSentAt = 0

  const client = createRealtimeClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
  if (!client) {
    sender = null
    return () => useChat.getState().reset()
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
    next.on('broadcast', { event: CHAT_EVENT }, (message) => {
      if (channel !== next) return
      const payload: unknown = message.payload
      if (!isChatPayload(payload) || payload.key === myKey) return
      useChat.getState().add({ ...payload, text: payload.text.trim(), mine: false })
    })
    next.subscribe((status) => {
      if (channel === next) joined = status === 'SUBSCRIBED'
    })
    sender = (text, at) => {
      if (channel !== next || !joined) return
      const payload: ChatPayload = { key: myKey, nickname, text, at }
      next.send({ type: 'broadcast', event: CHAT_EVENT, payload }).catch(() => {})
    }
  }

  openChannel(useStore.getState().roomId)

  // 방을 옮기면 이전 방 대화는 지우고 새 방 채널로 옮긴다.
  const unsubscribe = useStore.subscribe((state, prev) => {
    if (state.roomId !== prev.roomId) {
      useChat.getState().reset()
      openChannel(state.roomId)
    }
  })

  return () => {
    unsubscribe()
    closeChannel()
    client.realtime.disconnect()
    useChat.getState().reset()
  }
}
