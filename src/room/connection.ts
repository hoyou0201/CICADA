import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { CAMPUS_CHANNEL, type PresenceState } from '../contract/room.ts'
import { useStore } from '../state/store.ts'

/** 각 시도는 전용 클라이언스를 사용해 이전 채널 정리와 새 구독이 겹치지 않게 한다. */
export function startConnection(
  createClient: () => SupabaseClient | null,
  key: string,
  mine: () => PresenceState,
  onSync: (state: Record<string, unknown[]>) => void,
): { track: () => void; stop: () => void } {
  let closed = false
  let attempts = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let current: { client: SupabaseClient; channel: RealtimeChannel } | null = null

  const dispose = () => {
    const previous = current
    current = null
    if (!previous) return
    void previous.client.removeChannel(previous.channel).catch(() => {})
    previous.client.realtime.disconnect()
  }

  const track = () => {
    if (current && useStore.getState().connection === 'online') {
      void current.channel.track(mine()).catch(() => {})
    }
  }

  const open = () => {
    if (closed) return
    const client = createClient()
    if (!client) {
      useStore.getState().setConnection('offline')
      useStore.getState().setRemotePlayers([])
      return
    }
    useStore.getState().setConnection('connecting')
    const channel = client.channel(CAMPUS_CHANNEL, { config: { presence: { key } } })
    const connection = { client, channel }
    current = connection
    channel.on('presence', { event: 'sync' }, () => {
      if (current === connection && !closed) onSync(channel.presenceState())
    })
    channel.subscribe((status) => {
      if (closed || current !== connection) return
      if (status === 'SUBSCRIBED') {
        attempts = 0
        useStore.getState().setConnection('online')
        track()
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        useStore.getState().setConnection('offline')
        useStore.getState().setRemotePlayers([])
        onSync({})
        dispose()
        const delay = Math.min(1000 * 2 ** attempts++, 10_000)
        timer = setTimeout(open, delay)
      }
    })
  }

  open()
  return {
    track,
    stop: () => {
      closed = true
      clearTimeout(timer)
      if (current) void current.channel.untrack().catch(() => {})
      dispose()
      useStore.getState().setRemotePlayers([])
    },
  }
}
