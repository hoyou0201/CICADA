import { Html } from '@react-three/drei'
import { useEffect, useState } from 'react'
import type { ProfessorTurn } from '../../contract/professor.ts'
import { useStore } from '../../state/store.ts'
import { PROFESSOR_HEIGHT } from './ProfessorModel.tsx'

export const WAITING_TEXT = '음…'
export const BUBBLE_MAX_CHARS = 60
export const BUBBLE_VISIBLE_MS = 6000

export type BubbleContent = { kind: 'waiting' | 'answer'; text: string }

/** 답의 앞부분만 자른다. 잘렸으면 말줄임표를 붙인다. */
export function truncateAnswer(text: string, max: number = BUBBLE_MAX_CHARS): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  const chars = Array.from(flat)
  return chars.length <= max ? flat : `${chars.slice(0, max).join('').trimEnd()}…`
}

/**
 * 대화 기록의 마지막 턴으로 말풍선 내용을 정한다.
 * 학생이 마지막이면 답을 기다리는 중이고, 교수님이 마지막이면 그 답의 앞부분이다.
 */
export function bubbleContent(history: ProfessorTurn[]): BubbleContent | null {
  const last = history[history.length - 1]
  if (!last) return null
  if (last.role === 'student') return { kind: 'waiting', text: WAITING_TEXT }
  const text = truncateAnswer(last.text)
  return text ? { kind: 'answer', text } : null
}

type Props = {
  /** 교수님 group 기준 위치. 기본은 머리 위 */
  position?: [number, number, number]
}

/** 교수님 머리 위 말풍선. 답은 몇 초 뒤 사라지고, 기다리는 동안은 '음…'을 보인다. */
export default function SpeechBubble({ position = [0, PROFESSOR_HEIGHT + 0.3, 0] }: Props) {
  const history = useStore((s) => s.professorHistory)
  const content = bubbleContent(history)
  // 이 길이의 기록에서 숨기기로 한 답. 새 턴이 오면 길이가 달라져 다시 보인다.
  const [hiddenAt, setHiddenAt] = useState(-1)
  const length = history.length
  const isAnswer = content?.kind === 'answer'

  useEffect(() => {
    if (!isAnswer) return
    const timer = setTimeout(() => setHiddenAt(length), BUBBLE_VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [isAnswer, length])

  if (!content || (isAnswer && hiddenAt === length)) return null

  return (
    <Html position={position} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
      <div
        role="status"
        style={{
          maxWidth: 260,
          padding: '8px 12px',
          borderRadius: 12,
          background: '#fff',
          color: '#1c1c22',
          fontSize: 15,
          lineHeight: 1.4,
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          wordBreak: 'keep-all',
        }}
      >
        {content.text}
      </div>
    </Html>
  )
}
