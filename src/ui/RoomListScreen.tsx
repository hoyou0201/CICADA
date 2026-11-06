import { useEffect, useState } from 'react'
import type { Navigate } from '../App.tsx'
import { CAMPUS_CHANNEL } from '../contract/room.ts'
import { SAMPLE_BADGE } from '../contract/lms.ts'
import { createRealtimeClient, isRealtimeConfigured } from '../room/supabase.ts'
import { ROOMS } from '../rooms.ts'
import { useStore } from '../state/store.ts'

type Props = { navigate: Navigate }
type Counts = Record<string, number>

export default function RoomListScreen({ navigate }: Props) {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>(
    isRealtimeConfigured ? 'connecting' : 'offline',
  )
  const setRoomId = useStore((s) => s.setRoomId)
  const isSample = useStore((s) => s.session?.isSample)

  useEffect(() => {
    const client = createRealtimeClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    )
    if (!client) return
    const channel = client.channel(CAMPUS_CHANNEL)
    let closed = false

    channel.on('presence', { event: 'sync' }, () => {
      const next: Counts = {}
      for (const metas of Object.values(channel.presenceState())) {
        const latest = metas[metas.length - 1] as { roomId?: unknown } | undefined
        if (typeof latest?.roomId === 'string') {
          next[latest.roomId] = (next[latest.roomId] ?? 0) + 1
        }
      }
      if (!closed) setCounts(next)
    })
    channel.subscribe((state) => {
      if (closed) return
      if (state === 'SUBSCRIBED') setStatus('online')
      else if (state === 'CHANNEL_ERROR' || state === 'TIMED_OUT' || state === 'CLOSED') {
        setStatus('offline')
        setCounts(null)
      }
    })

    return () => {
      closed = true
      void client.removeChannel(channel).catch(() => {}).finally(() => client.realtime.disconnect())
    }
  }, [])

  return (
    <main className="screen center-screen">
      <section style={{ width: 'min(600px, 90vw)' }}>
        <h1>강의실 선택</h1>
        {isSample && <span className="badge badge-sample">{SAMPLE_BADGE}</span>}
        {status === 'offline' && <p role="status">인원 정보를 불러올 수 없어요. 혼자 모드로 입장할 수 있어요.</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
          {ROOMS.map((room) => (
            <button
              key={room.id}
              type="button"
              style={{ display: 'grid', gap: 'var(--space-2)', textAlign: 'left', padding: 'var(--space-3)' }}
              onClick={() => {
                setRoomId(room.id)
                navigate('classroom')
              }}
            >
              <strong>{room.name}</strong>
              <span>{status === 'online' && counts !== null ? `${counts[room.id] ?? 0}명` : status === 'offline' ? '인원 확인 불가' : '인원 확인 중'}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
