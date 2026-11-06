import { useState } from 'react'
import CampusScreen from './screens/CampusScreen.tsx'
import ClassroomScreen from './screens/ClassroomScreen.tsx'
import LoginScreen from './ui/LoginScreen.tsx'
import RoomListScreen from './ui/RoomListScreen.tsx'

export type ScreenName = 'login' | 'rooms' | 'classroom' | 'campus'

export type Navigate = (screen: ScreenName) => void

export default function App() {
  const [screen, setScreen] = useState<ScreenName>('login')

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
