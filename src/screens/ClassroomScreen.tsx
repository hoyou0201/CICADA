import { Suspense } from 'react'
import type { Navigate } from '../App.tsx'
import Classroom from '../scene/Classroom.tsx'
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
        <ScreenShareButton />
        <ShareGuide />
        <ProfessorChat />
        <AvatarPicker />
        <RoomSwitcher navigate={navigate} />
        <NoticePanel />
        <ReactionBar />
        <InviteQr />
      </div>
    </div>
  )
}
