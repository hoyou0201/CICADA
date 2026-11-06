import type { Navigate } from '../App.tsx'

type Props = { navigate: Navigate }

export default function RoomListScreen({ navigate }: Props) {
  return (
    <main className="screen center-screen">
      <button type="button" onClick={() => navigate('classroom')}>
        기본 강의실 입장
      </button>
    </main>
  )
}
