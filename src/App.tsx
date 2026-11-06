import { useEffect, useState } from 'react'
import { joinPresence } from './room/presence.ts'
import { anonymousNumber, loadNickname, resolveNickname } from './ui/nickname.ts'
import CampusScreen from './screens/CampusScreen.tsx'
import ClassroomScreen from './screens/ClassroomScreen.tsx'
import LoginScreen from './ui/LoginScreen.tsx'
import RoomListScreen from './ui/RoomListScreen.tsx'

export type ScreenName = 'login' | 'rooms' | 'classroom' | 'campus'

export type Navigate = (screen: ScreenName) => void

export default function App() {
  const [screen, setScreen] = useState<ScreenName>('login')
  const inCampus = screen === 'classroom' || screen === 'campus'

  useEffect(() => {
    if (!inCampus) return
    const presence = joinPresence({ nickname: resolveNickname(loadNickname(), anonymousNumber()) })
    return () => presence.leave()
  }, [inCampus])

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
