import { Suspense } from 'react'
import type { Navigate } from '../App.tsx'
import Classroom from '../scene/Classroom.tsx'
import AttendanceCard from '../ui/AttendanceCard.tsx'
import AvatarPicker from '../ui/AvatarPicker.tsx'
import Hud from '../ui/Hud.tsx'
import InviteQr from '../ui/InviteQr.tsx'
import LecturePanel from '../ui/LecturePanel.tsx'
import Loading from '../ui/Loading.tsx'
import NoticePanel from '../ui/NoticePanel.tsx'
import ProfessorChat from '../ui/ProfessorChat.tsx'
import ReactionBar from '../ui/ReactionBar.tsx'
import RoomSwitcher from '../ui/RoomSwitcher.tsx'
import ScreenShareButton from '../ui/ScreenShareButton.tsx'
import ShareGuide from '../ui/ShareGuide.tsx'
import SoundToggle from '../ui/SoundToggle.tsx'
import WebGLGate from '../ui/WebGLGate.tsx'

type Props = { navigate: Navigate }

export default function ClassroomScreen({ navigate }: Props) {
  return (
    <div className="screen classroom-screen">
      <WebGLGate>
        <Suspense fallback={<Loading />}>
          <Classroom navigate={navigate} />
        </Suspense>
      </WebGLGate>
      <div className="overlay">
        <Hud />
        <LecturePanel />
        {/* HUD·캐릭터·소리 패널은 왼쪽 위에 겹쳐 있다. 공유 버튼은 그 아래에 둬야 눌린다. */}
        <div style={{ position: 'absolute', top: 320, left: 'var(--space-4)', zIndex: 2 }}>
          <ScreenShareButton />
        </div>
        <ShareGuide />
        <SoundToggle />
        <ProfessorChat />
        <AvatarPicker />
        <RoomSwitcher navigate={navigate} />
        <NoticePanel />
        <ReactionBar />
        <AttendanceCard />
        <InviteQr />
      </div>
    </div>
  )
}
