import { useState, type KeyboardEvent } from 'react'
import { askProfessor } from '../api/professor.ts'
import {
  isValidQuestion,
  PROFESSOR_ERROR_MESSAGE,
  PROFESSOR_HISTORY_MAX,
  PROFESSOR_QUESTION_MAX,
} from '../contract/professor.ts'
import { useStore } from '../state/store.ts'

// AI 교수님께 묻는 창. 고른 강의 이름과 영상 제목을 질문 맥락으로 함께 보낸다.
export default function ProfessorChat() {
  const history = useStore((s) => s.professorHistory)
  const addTurn = useStore((s) => s.addProfessorTurn)
  const lecture = useStore((s) => s.selectedLecture)
  const courses = useStore((s) => s.desk?.courses)

  const open = useStore((s) => s.professorChatOpen)
  const setOpen = useStore((s) => s.setProfessorChatOpen)
  const [question, setQuestion] = useState('')
  const [pending, setPending] = useState(false)
  const [failed, setFailed] = useState(false)
  const [sawSample, setSawSample] = useState(false)

  const courseName = lecture ? (courses?.find((c) => c.id === lecture.courseId)?.name ?? null) : null
  const valid = isValidQuestion(question)

  async function submit(event: { preventDefault(): void }) {
    event.preventDefault()
    if (!valid || pending) return
    const text = question.trim()
    const previous = history.slice(-PROFESSOR_HISTORY_MAX)
    setPending(true)
    setFailed(false)
    try {
      const result = await askProfessor({
        question: text,
        courseName,
        lectureTitle: lecture?.title ?? null,
        history: previous,
      })
      addTurn({ role: 'student', text })
      addTurn({ role: 'professor', text: result.answer })
      if (result.isSample) setSawSample(true)
      setQuestion('')
    } catch {
      setFailed(true)
    } finally {
      setPending(false)
    }
  }

  // Enter·Ctrl+Enter는 보내고, Shift+Enter는 줄바꿈이다. 한글 조합 중에는 건드리지 않는다.
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    if (event.shiftKey) return
    event.preventDefault()
    void submit(event)
  }

  return (
    <section
      className="panel"
      aria-label="AI 교수님"
    >
      <h2 className="panel-title">
        AI 교수님 {sawSample && <span className="badge badge-sample">샘플</span>}{' '}
        <button type="button" className="btn btn-secondary" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? '접기' : '열기'}
        </button>
      </h2>
      {open && (
        <>
          <p className="text-muted">
            {lecture ? `${courseName ? `${courseName} · ` : ''}${lecture.title}` : '고른 강의 없이 물어봐요'}
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 220, overflowY: 'auto' }}>
            {history.map((turn, i) => (
              <li key={i} className={turn.role === 'student' ? undefined : 'text-muted'}>
                <strong>{turn.role === 'student' ? '나' : '교수님'}</strong> {turn.text}
              </li>
            ))}
          </ul>
          {pending && <p className="text-muted" role="status">교수님이 생각하는 중…</p>}
          {failed && <p role="alert">{PROFESSOR_ERROR_MESSAGE}</p>}
          <form onSubmit={submit}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={onKeyDown}
              rows={2}
              placeholder="궁금한 점을 물어보세요"
              aria-label="질문"
            />
            <p className="text-muted">
              {question.length}/{PROFESSOR_QUESTION_MAX}
              {question.length > PROFESSOR_QUESTION_MAX && ' · 500자까지 보낼 수 있어요'}
            </p>
            <button type="submit" className="btn" disabled={!valid || pending}>
              보내기
            </button>
          </form>
        </>
      )}
    </section>
  )
}
