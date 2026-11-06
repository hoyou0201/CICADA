import type { CSSProperties } from 'react'
import type { Navigate } from '../App.tsx'
import { ROOMS } from '../rooms.ts'
import { useStore } from '../state/store.ts'

type Props = { navigate: Navigate }

const STYLE: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  alignItems: 'center',
  gap: 'var(--space-1) var(--space-2)',
}

const LABEL_STYLE: CSSProperties = { gridColumn: '1 / -1' }

const BUTTON_STYLE: CSSProperties = { whiteSpace: 'nowrap' }

export default function RoomSwitcher({ navigate }: Props) {
  const roomId = useStore((state) => state.roomId)
  const setRoomId = useStore((state) => state.setRoomId)

  return (
    <div className="panel" style={STYLE}>
      <label htmlFor="room-switcher" style={LABEL_STYLE}>강의실 이동</label>
      <select id="room-switcher" value={roomId} onChange={(event) => setRoomId(event.target.value)}>
        {ROOMS.map((room) => (
          <option key={room.id} value={room.id}>{room.name}</option>
        ))}
      </select>
      <button type="button" className="btn" style={BUTTON_STYLE} onClick={() => navigate('rooms')}>
        강의실 목록
      </button>
    </div>
  )
}
