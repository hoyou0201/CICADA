import { Suspense, useEffect } from 'react'
import type { Navigate } from '../App.tsx'
import Classroom from '../scene/Classroom.tsx'
import { joinPresence } from '../room/presence.ts'
import { useStore } from '../state/store.ts'
import { anonymousNumber, loadNickname, resolveNickname } from '../ui/nickname.ts'
import { statusForLecture } from '../ui/openLecture.ts'
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
  useEffect(() => {
    const presence = joinPresence({
      nickname: resolveNickname(loadNickname(), anonymousNumber()),
      status: statusForLecture(useStore.getState().selectedLecture),
    })
    const unsubscribe = useStore.subscribe((state, previous) => {
      if (state.selectedLecture !== previous.selectedLecture) {
        presence.update({ status: statusForLecture(state.selectedLecture) })
      }
    })
    return () => {
      unsubscribe()
      presence.leave()
    }
  }, [])

  return (
    <div className="screen classroom-screen">
      <WebGLGate>
        <Suspense fallback={<Loading />}>
          <Classroom />
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
