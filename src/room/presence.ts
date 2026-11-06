import type { RealtimeChannel } from '@supabase/supabase-js'
import {
  CAMPUS_CHANNEL,
  type AvatarLook,
  type PresenceState,
  type PresenceStatus,
} from '../contract/room.ts'
import { useStore } from '../state/store.ts'
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

/** campus 채널에 참여한다. 이미 참여 중이면 먼저 나간다. */
export function joinPresence(init: PresenceInit): PresenceHandle {
  active?.leave()

  const { setConnection, setRemotePlayers } = useStore.getState()
  const key = crypto.randomUUID()

  const client = createRealtimeClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )
  if (!client) {
    setConnection('offline')
    setRemotePlayers([])
    const solo: PresenceHandle = {
      key,
      update: () => {},
      leave: () => {
        if (active === solo) active = null
      },
    }
    active = solo
    return solo
  }

  let nickname = init.nickname
  let status: PresenceStatus = init.status ?? 'idle'
  let closed = false
  setConnection('connecting')

  const channel: RealtimeChannel = client.channel(CAMPUS_CHANNEL, {
    config: { presence: { key } },
  })

  const mine = (): PresenceState => {
    const { roomId, avatar } = useStore.getState()
    return { key, nickname, roomId, avatar, status }
  }

  const track = () => {
    if (closed) return
    channel.track(mine()).catch(() => {})
  }

  const refreshRemote = () => {
    const { roomId } = useStore.getState()
    useStore
      .getState()
      .setRemotePlayers(collectRemotePlayers(channel.presenceState(), key, roomId))
  }

  channel.on('presence', { event: 'sync' }, refreshRemote)

  channel.subscribe((subscribeStatus) => {
    if (closed) return
    if (subscribeStatus === 'SUBSCRIBED') {
      // 끊겼다 다시 붙을 때도 SUBSCRIBED가 오므로 그때마다 내 상태를 다시 올린다.
      setConnection('online')
      track()
    } else if (
      subscribeStatus === 'CHANNEL_ERROR' ||
      subscribeStatus === 'TIMED_OUT' ||
      subscribeStatus === 'CLOSED'
    ) {
      setConnection('offline')
    }
  })

  // 방을 옮기거나 캐릭터를 바꾸면 다시 올리고, 방이 바뀌면 목록도 다시 거른다.
  const unsubscribeStore = useStore.subscribe((state, prev) => {
    if (state.roomId !== prev.roomId || state.avatar !== prev.avatar) track()
    if (state.roomId !== prev.roomId) refreshRemote()
  })

  // 탭을 닫을 때 바로 빠지도록 한다.
  let pageHidden = false
  const onPageHide = () => {
    pageHidden = true
    channel.untrack().catch(() => {})
  }
  const onPageShow = () => {
    if (!pageHidden) return
    pageHidden = false
    track()
  }
  window.addEventListener('pagehide', onPageHide)
  window.addEventListener('pageshow', onPageShow)

  const handle: PresenceHandle = {
    key,
    update: (patch) => {
      if (patch.nickname !== undefined) nickname = patch.nickname
      if (patch.status !== undefined) status = patch.status
      track()
    },
    leave: () => {
      if (closed) return
      closed = true
      unsubscribeStore()
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
      channel.untrack().catch(() => {})
      client.removeChannel(channel).catch(() => {}).finally(() => client.realtime.disconnect())
      useStore.getState().setRemotePlayers([])
      if (active === handle) active = null
    },
  }
  active = handle
  return handle
}
