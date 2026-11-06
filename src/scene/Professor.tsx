import { Html } from '@react-three/drei'
import { useEffect } from 'react'
import { useStore } from '../state/store.ts'
import { PROFESSOR } from './layout.ts'
import ProfessorModel, { PROFESSOR_HEIGHT } from './professor/ProfessorModel.tsx'
import SpeechBubble from './professor/SpeechBubble.tsx'

export default function Professor() {
  const position = useStore((s) => s.position)
  const setOpen = useStore((s) => s.setProfessorChatOpen)
  const chatOpen = useStore((s) => s.professorChatOpen)
  const near = Math.hypot(position.x - PROFESSOR.position[0], position.z - PROFESSOR.position[2]) <= PROFESSOR.talkRadius

  useEffect(() => {
    if (near) setOpen(true)
  }, [near, setOpen])

  return (
    <group position={PROFESSOR.position} onClick={(event) => { event.stopPropagation(); setOpen(true) }}>
      <ProfessorModel />
      <SpeechBubble />
      {near && !chatOpen && (
        <Html position={[0, PROFESSOR_HEIGHT + 0.65, 0]} center distanceFactor={8}>
          <button type="button" className="btn" style={{ whiteSpace: 'nowrap' }} onClick={() => setOpen(true)}>물어보기</button>
        </Html>
      )}
    </group>
  )
}
