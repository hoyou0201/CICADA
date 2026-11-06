import { useEffect, useState, type CSSProperties } from 'react'
import { getNotices, type NoticesResult } from '../api/notices.ts'
import { NOTICE_BOARDS, NOTICES_EMPTY_MESSAGE, NOTICES_ERROR_MESSAGE } from '../contract/notices.ts'

const PANEL_STYLE: CSSProperties = {
  position: 'absolute',
  left: 'var(--space-4)',
  top: 120,
  width: 340,
  maxWidth: 'calc(100% - 32px)',
  maxHeight: '65vh',
  overflowY: 'auto',
}

export default function NoticePanel() {
  const [open, setOpen] = useState(false)
  const [board, setBoard] = useState<number>(NOTICE_BOARDS[0].board)
  const [result, setResult] = useState<NoticesResult | null>(null)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    let active = true
    void getNotices(board).then((data) => {
      if (active) setResult(data)
    }).catch(() => {
      if (active) setFailed(true)
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [open, board])

  function toggleOpen() {
    if (!open) {
      setLoading(true)
      setFailed(false)
      setResult(null)
    }
    setOpen(!open)
  }

  function selectBoard(nextBoard: number) {
    if (nextBoard === board) return
    setLoading(true)
    setFailed(false)
    setResult(null)
    setBoard(nextBoard)
  }

  return (
    <section className="panel" style={PANEL_STYLE} aria-label="학교 공지">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
        <h2 className="panel-title" style={{ margin: 0 }}>
          학교 공지 {open && result?.isSample && <span className="badge badge-sample">샘플</span>}
        </h2>
        <button type="button" className="btn btn-secondary" aria-expanded={open} onClick={toggleOpen}>
          {open ? '공지 닫기' : '공지 열기'}
        </button>
      </div>
      {open && (
        <>
          <div aria-label="게시판 선택" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-2)' }}>
            {NOTICE_BOARDS.map((item) => (
              <button key={item.board} type="button" className="btn btn-secondary" aria-pressed={board === item.board} onClick={() => selectBoard(item.board)} style={{ fontWeight: board === item.board ? 'bold' : 'normal', textDecoration: board === item.board ? 'underline' : 'none' }}>
                {item.name}
              </button>
            ))}
          </div>
          {loading && <p role="status">공지를 불러오는 중이에요</p>}
          {!loading && failed && <p role="alert">{NOTICES_ERROR_MESSAGE}</p>}
          {!loading && !failed && result && (
            result.items.length === 0 ? <p>{NOTICES_EMPTY_MESSAGE}</p> : (
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 0 }}>
                {result.items.map((item, index) => (
                  <li key={`${item.url}-${index}`} style={{ marginTop: 'var(--space-2)' }}>
                    <a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a>
                    <br />
                    <time className="text-muted" dateTime={item.publishedAt}>
                      {Number.isNaN(Date.parse(item.publishedAt)) ? item.publishedAt : new Date(item.publishedAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })}
                    </time>
                  </li>
                ))}
              </ul>
            )
          )}
        </>
      )}
    </section>
  )
}
