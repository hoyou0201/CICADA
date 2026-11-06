import type { CSSProperties } from 'react'
import { SAMPLE_BADGE } from '../contract/lms.ts'
import { ROOM_ALONE_MESSAGE, ROOM_OFFLINE_MESSAGE } from '../contract/room.ts'
import { ROOMS } from '../rooms.ts'
import { useStore } from '../state/store.ts'

const HUD_STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-1)',
}

const ROW_STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--space-2)',
}

/** 화면 위쪽 정보: 내 이름, 방 이름과 인원 수, 샘플 배지, 혼자·연결 끊김 안내. */
export default function Hud() {
  const session = useStore((s) => s.session)
  const roomId = useStore((s) => s.roomId)
  const connection = useStore((s) => s.connection)
  const others = useStore((s) => Object.keys(s.remotePlayers).length)

  const roomName = ROOMS.find((r) => r.id === roomId)?.name ?? roomId
  const offline = connection === 'offline'
  const alone = connection === 'online' && others === 0

  return (
    <div className="panel" style={HUD_STYLE} role="status">
      <div style={ROW_STYLE}>
        <strong>{session?.fullName ?? '이름 없음'}</strong>
        {session?.isSample && <span className="badge badge-sample">{SAMPLE_BADGE}</span>}
      </div>
      <div style={ROW_STYLE}>
        <span>{roomName}</span>
        {!offline && <span className="badge">{others + 1}명</span>}
        {offline && <span className="badge badge-warning">{ROOM_OFFLINE_MESSAGE}</span>}
      </div>
      {alone && <span className="text-muted">{ROOM_ALONE_MESSAGE}</span>}
    </div>
  )
}
