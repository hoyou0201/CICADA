import { useState, type CSSProperties } from 'react'
import {
  LMS_EMPTY_LECTURES_MESSAGE,
  LMS_PARTIAL_MESSAGE,
  SAMPLE_BADGE,
  type DeadlineKind,
  type LectureItem,
} from '../contract/lms.ts'
import { useStore } from '../state/store.ts'
import { openLecture, type OpenLectureResult } from './openLecture.ts'

// 오른쪽 위 강의실 이동 바(약 64px)와 오른쪽 아래 AI 교수님 패널을 피해 그 사이에 둔다.
const TOP_OFFSET = 88
const CHAT_CLOSED_RESERVE = 88
const CHAT_OPEN_RESERVE = 400

const PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  top: TOP_OFFSET,
  right: 'var(--space-4)',
  width: 340,
  maxWidth: 'calc(100% - var(--space-5))',
  overflowY: 'auto',
}

const HEADER_STYLE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--space-2)',
}

const LIST_STYLE: CSSProperties = { listStyle: 'none', margin: 0, padding: 0 }
const SECTION_TITLE_STYLE: CSSProperties = {
  margin: 'var(--space-3) 0 var(--space-1)',
  fontSize: 'var(--font-size-sm)',
  fontWeight: 'var(--font-weight-bold)',
}
const LECTURE_BUTTON_STYLE: CSSProperties = {
  width: '100%',
  justifyContent: 'space-between',
  textAlign: 'left',
}

const DEADLINE_KIND_LABELS: Record<DeadlineKind, string> = {
  vod: '영상',
  assign: '과제',
  quiz: '퀴즈',
  other: '기타',
}

function formatDue(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function doneBadge(done: boolean | null) {
  if (done === true) return <span className="badge badge-success">완료</span>
  if (done === false) return <span className="badge badge-warning">미완료</span>
  return null
}

// 내 LMS 정보를 보여 주는 접이식 패널. 영상을 누르면 새 창으로 열고 수강 중이 된다.
export default function LecturePanel() {
  const desk = useStore((s) => s.desk)
  const chatOpen = useStore((s) => s.professorChatOpen)
  const [open, setOpen] = useState(true)
  const [blocked, setBlocked] = useState<Extract<OpenLectureResult, { opened: false }> | null>(null)

  if (!desk) return null

  const courseName = (id: number) => desk.courses.find((c) => c.id === id)?.name ?? ''
  const lecturesByCourse = desk.courses
    .map((course) => ({
      course,
      lectures: desk.lectures.filter((l) => l.courseId === course.id),
    }))
    .filter((group) => group.lectures.length > 0)

  const onOpen = (lecture: LectureItem) => {
    const result = openLecture(lecture)
    setBlocked(result.opened ? null : result)
  }

  return (
    <section
      className="panel"
      style={{
        ...PANEL_STYLE,
        maxHeight: `calc(100% - ${TOP_OFFSET + (chatOpen ? CHAT_OPEN_RESERVE : CHAT_CLOSED_RESERVE)}px)`,
      }}
      aria-label="내 강의"
    >
      <div style={HEADER_STYLE}>
        <h2 className="panel-title" style={{ margin: 0 }}>
          내 강의{' '}
          {desk.isSample && <span className="badge badge-sample">{SAMPLE_BADGE}</span>}
        </h2>
        <button
          type="button"
          className="btn btn-secondary"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? '접기' : '펼치기'}
        </button>
      </div>

      {open && (
        <>
          {desk.partial && (
            <p className="text-muted" role="alert">
              {LMS_PARTIAL_MESSAGE}
            </p>
          )}
          {blocked && (
            <p role="alert">
              {blocked.message}{' '}
              <a href={blocked.url} target="_blank" rel="noopener noreferrer">
                직접 열기
              </a>
            </p>
          )}

          <h3 style={SECTION_TITLE_STYLE}>수강 강의</h3>
          <p>{desk.courses.map((c) => c.name).join(' · ') || '수강 중인 강의가 없어요'}</p>

          <h3 style={SECTION_TITLE_STYLE}>이번 주 영상</h3>
          {desk.lectures.length === 0 ? (
            <p className="text-muted">{LMS_EMPTY_LECTURES_MESSAGE}</p>
          ) : (
            lecturesByCourse.map(({ course, lectures }) => (
              <div key={course.id}>
                <div className="text-muted">{course.name}</div>
                <ul style={LIST_STYLE}>
                  {lectures.map((lecture) => (
                    <li key={lecture.id}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={LECTURE_BUTTON_STYLE}
                        onClick={() => onOpen(lecture)}
                      >
                        <span>{lecture.title}</span>
                        {doneBadge(lecture.done)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}

          <h3 style={SECTION_TITLE_STYLE}>다가오는 마감</h3>
          {desk.deadlines.length === 0 ? (
            <p className="text-muted">다가오는 마감이 없어요</p>
          ) : (
            <ul style={LIST_STYLE}>
              {desk.deadlines.map((d) => (
                <li key={d.id}>
                  <span className="badge">{DEADLINE_KIND_LABELS[d.kind]}</span> {d.title}
                  <span className="text-muted">
                    {' '}
                    · {courseName(d.courseId)} · {formatDue(d.dueAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
