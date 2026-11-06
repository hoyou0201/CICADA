import type { CSSProperties } from 'react'
import type { Navigate } from '../App.tsx'
import { ROOMS } from '../rooms.ts'
import { useStore } from '../state/store.ts'

type Props = { navigate: Navigate }

const STYLE: CSSProperties = {
  position: 'absolute',
  top: 'var(--space-4)',
  right: 'var(--space-4)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
}

export default function RoomSwitcher({ navigate }: Props) {
  const roomId = useStore((state) => state.roomId)
  const setRoomId = useStore((state) => state.setRoomId)

  return (
    <div className="panel" style={STYLE}>
      <label htmlFor="room-switcher">강의실 이동</label>
      <select id="room-switcher" value={roomId} onChange={(event) => setRoomId(event.target.value)}>
        {ROOMS.map((room) => (
          <option key={room.id} value={room.id}>{room.name}</option>
        ))}
      </select>
      <button type="button" className="btn" onClick={() => navigate('rooms')}>
        강의실 목록
      </button>
    </div>
  )
}
