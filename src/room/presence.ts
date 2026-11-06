import {
  type AvatarLook,
  type PresenceState,
  type PresenceStatus,
} from '../contract/room.ts'
import { useStore } from '../state/store.ts'
import { startConnection } from './connection.ts'
import { createRealtimeClient } from './supabase.ts'

/**
 * 채널 `campus`(모든 방 공통) presence 참여와 이탈.
 * 내 닉네임·방·캐릭터·상태를 올리고, 같은 방 사람 목록을 전역 저장소에 넣는다.
 * 강의명·영상 제목 등 PresenceState 밖의 값은 보내지 않는다.
 * supabase가 null이면 연결하지 않고 '혼자 모드'(connection = 'offline')로 둔다.
 */

const PRESENCE_STATUSES: readonly string[] = ['idle', 'watching', 'away']

function isAvatar(value: unknown): value is AvatarLook {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.preset === 'string' && typeof v.color === 'string'
}

/** 다른 사람이 보낸 값이므로 모양을 확인한다. */
function isPresenceState(value: unknown): value is PresenceState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.nickname === 'string' &&
    typeof v.roomId === 'string' &&
    typeof v.status === 'string' &&
    PRESENCE_STATUSES.includes(v.status) &&
    isAvatar(v.avatar)
  )
}

/**
 * presenceState() 결과에서 내가 아닌, 같은 방 사람만 뽑는다.
 * 한 key에 값이 여러 개면 마지막 것을 쓴다. 알려진 필드만 다시 만들어 담는다.
 */
export function collectRemotePlayers(
  state: Record<string, unknown[]>,
  myKey: string,
  roomId: string,
): PresenceState[] {
  const players: PresenceState[] = []
  for (const [key, metas] of Object.entries(state)) {
    if (key === myKey) continue
    const latest = metas[metas.length - 1]
    if (!isPresenceState(latest) || latest.roomId !== roomId) continue
    players.push({
      key,
      nickname: latest.nickname,
      roomId: latest.roomId,
      avatar: { preset: latest.avatar.preset, color: latest.avatar.color },
      status: latest.status,
    })
  }
  return players
}

export type PresenceHandle = {
  /** 이 탭의 key */
  key: string
  /** 닉네임이나 상태를 바꿔 다시 올린다 */
  update: (patch: { nickname?: string; status?: PresenceStatus }) => void
  /** 목록에서 빠지고 연결을 닫는다 */
  leave: () => void
}

export type PresenceInit = { nickname: string; status?: PresenceStatus }

let active: PresenceHandle | null = null

/** 이 탭의 presence key. 입장 위치가 겹칠 때 누가 비켜 설지 정할 때 쓴다. */
export function currentPresenceKey(): string | null {
  return active?.key ?? null
}

/** campus 채널에 참여한다. 이미 참여 중이면 먼저 나간다. */
export function joinPresence(init: PresenceInit): PresenceHandle {
  active?.leave()

  const key = crypto.randomUUID()
  let nickname = init.nickname
  let status: PresenceStatus = init.status ?? 'idle'

  const mine = (): PresenceState => {
    const { roomId, avatar } = useStore.getState()
    return { key, nickname, roomId, avatar, status }
  }

  let lastPresence: Record<string, unknown[]> = {}
  const refreshRemote = () => {
    const { roomId, setRemotePlayers } = useStore.getState()
    setRemotePlayers(collectRemotePlayers(lastPresence, key, roomId))
  }
  const connection = startConnection(
    () => createRealtimeClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY),
    key,
    mine,
    (state) => {
      lastPresence = state
      refreshRemote()
    },
  )

  const unsubscribeStore = useStore.subscribe((state, prev) => {
    if (state.roomId !== prev.roomId || state.avatar !== prev.avatar) connection.track()
    if (state.roomId !== prev.roomId && state.connection === 'online') refreshRemote()
  })
  let closed = false

  const handle: PresenceHandle = {
    key,
    update: (patch) => {
      if (patch.nickname !== undefined) nickname = patch.nickname
      if (patch.status !== undefined) status = patch.status
      connection.track()
    },
    leave: () => {
      if (closed) return
      closed = true
      unsubscribeStore()
      connection.stop()
      if (active === handle) active = null
    },
  }
  active = handle
  return handle
}
