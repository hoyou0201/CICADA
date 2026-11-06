import { Suspense } from 'react'
import type { Navigate } from '../App.tsx'
import Classroom from '../scene/Classroom.tsx'
import AttendanceCard from '../ui/AttendanceCard.tsx'
import AvatarPicker from '../ui/AvatarPicker.tsx'
import ChatPanel from '../ui/ChatPanel.tsx'
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
import Sidebar from '../ui/Sidebar.tsx'
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
        {/* 패널은 사이드바 한 곳에 세로로 쌓는다. 좌표를 따로 주면 열릴 때 겹친다. */}
        <Sidebar>
          <RoomSwitcher navigate={navigate} />
          <Hud />
          <NoticePanel />
          <LecturePanel />
          <ProfessorChat />
          <AvatarPicker />
          <ScreenShareButton />
          <SoundToggle />
          <AttendanceCard />
          <InviteQr />
        </Sidebar>
        <ShareGuide />
        <ReactionBar />
        <ChatPanel />
      </div>
    </div>
  )
}
