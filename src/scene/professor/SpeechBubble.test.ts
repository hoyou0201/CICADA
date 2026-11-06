import { describe, expect, it } from 'vitest'
import { BUBBLE_MAX_CHARS, WAITING_TEXT, bubbleContent, truncateAnswer } from './SpeechBubble.tsx'

describe('bubbleContent', () => {
  it('기록이 없으면 말풍선이 없다', () => {
    expect(bubbleContent([])).toBeNull()
  })
  it('학생이 마지막이면 기다리는 말풍선', () => {
    expect(bubbleContent([{ role: 'student', text: '질문' }])).toEqual({
      kind: 'waiting',
      text: WAITING_TEXT,
    })
  })
  it('교수님이 마지막이면 그 답의 앞부분', () => {
    const history = [
      { role: 'student' as const, text: '질문' },
      { role: 'professor' as const, text: '첫 답' },
      { role: 'student' as const, text: '또 질문' },
      { role: 'professor' as const, text: '두번째 답' },
    ]
    expect(bubbleContent(history)).toEqual({ kind: 'answer', text: '두번째 답' })
  })
})

describe('truncateAnswer', () => {
  it('짧으면 그대로, 길면 앞부분만 잘라 말줄임표를 붙인다', () => {
    expect(truncateAnswer('안녕하세요')).toBe('안녕하세요')
    const cut = truncateAnswer('가'.repeat(100))
    expect(Array.from(cut)).toHaveLength(BUBBLE_MAX_CHARS + 1)
    expect(cut.endsWith('…')).toBe(true)
  })
  it('줄바꿈과 연속 공백을 한 칸으로 줄인다', () => {
    expect(truncateAnswer('가\n\n  나')).toBe('가 나')
  })
})
