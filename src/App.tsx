import { useEffect, useRef, useState } from 'react'
import { startChat } from './room/chat.ts'
import { startMoveReceiver } from './room/moveReceiver.ts'
import { startMoveSender } from './room/moveSender.ts'
import { joinPresence } from './room/presence.ts'
import { startReactions } from './room/reactions.ts'
import { anonymousNumber, loadNickname, resolveNickname } from './ui/nickname.ts'
import CampusScreen from './screens/CampusScreen.tsx'
import ClassroomScreen from './screens/ClassroomScreen.tsx'
import LoginScreen from './ui/LoginScreen.tsx'
import RoomListScreen from './ui/RoomListScreen.tsx'

export type ScreenName = 'login' | 'rooms' | 'classroom' | 'campus'

export type Navigate = (screen: ScreenName) => void

export default function App() {
  const [screen, setScreen] = useState<ScreenName>('login')
  const presenceKey = useRef<string | null>(null)
  const inCampus = screen === 'classroom' || screen === 'campus'

  useEffect(() => {
    if (!inCampus) return
    const presence = joinPresence({ nickname: resolveNickname(loadNickname(), anonymousNumber()) })
    presenceKey.current = presence.key
    return () => {
      presence.leave()
      presenceKey.current = null
    }
  }, [inCampus])

  useEffect(() => {
    if (screen !== 'classroom' || !presenceKey.current) return
    const stopSender = startMoveSender(presenceKey.current)
    const stopReceiver = startMoveReceiver(presenceKey.current)
    const stopReactions = startReactions(presenceKey.current)
    const stopChat = startChat(presenceKey.current, resolveNickname(loadNickname(), anonymousNumber()))
    return () => {
      stopChat()
      stopReactions()
      stopReceiver()
      stopSender()
    }
  }, [screen])

  switch (screen) {
    case 'login':
      return <LoginScreen navigate={setScreen} />
    case 'rooms':
      return <RoomListScreen navigate={setScreen} />
    case 'classroom':
      return <ClassroomScreen navigate={setScreen} />
    case 'campus':
      return <CampusScreen navigate={setScreen} />
  }
}
