import { useEffect, useState, type CSSProperties } from 'react'
import { getNotices, type NoticesResult } from '../api/notices.ts'
import { NOTICE_BOARDS, NOTICES_EMPTY_MESSAGE, NOTICES_ERROR_MESSAGE } from '../contract/notices.ts'
import { useStore } from '../state/store.ts'

const PANEL_STYLE: CSSProperties = {
  width: '100%',
}

type TabResult = { board: number; data: NoticesResult | null; failed: boolean }

export default function NoticePanel() {
  const open = useStore((s) => s.noticeOpen)
  const setOpen = useStore((s) => s.setNoticeOpen)
  const notices = useStore((s) => s.notices)
  const error = useStore((s) => s.noticeError)
  const [board, setBoard] = useState<number>(NOTICE_BOARDS[0].board)
  const [tabResult, setTabResult] = useState<TabResult | null>(null)

  useEffect(() => {
    if (!open || board === NOTICE_BOARDS[0].board) return
    let active = true
    void getNotices(board).then((data) => {
      if (active) setTabResult({ board, data, failed: false })
    }).catch(() => {
      if (active) setTabResult({ board, data: null, failed: true })
    })
    return () => { active = false }
  }, [open, board])

  function selectBoard(nextBoard: number) {
    if (nextBoard === board) return
    setTabResult(null)
    setBoard(nextBoard)
  }

  if (!open) return null
  const isDefault = board === NOTICE_BOARDS[0].board
  const result = isDefault ? notices : tabResult?.board === board ? tabResult.data : null
  const failed = isDefault ? error : tabResult?.board === board && tabResult.failed

  return (
    <section className="panel" style={PANEL_STYLE} aria-label="학교 공지">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
        <h2 className="panel-title" style={{ margin: 0 }}>
          학교 공지 {result?.isSample && <span className="badge badge-sample">샘플</span>}
        </h2>
        <button type="button" className="btn btn-secondary" onClick={() => { setOpen(false); setBoard(NOTICE_BOARDS[0].board); setTabResult(null) }}>닫기</button>
      </div>
      <div aria-label="게시판 선택" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)', marginTop: 'var(--space-2)' }}>
        {NOTICE_BOARDS.map((item) => (
          <button key={item.board} type="button" className="btn btn-secondary" aria-pressed={board === item.board} onClick={() => selectBoard(item.board)} style={{ fontWeight: board === item.board ? 'bold' : 'normal', textDecoration: board === item.board ? 'underline' : 'none' }}>
            {item.name}
          </button>
        ))}
      </div>
      {failed ? <p role="alert">{NOTICES_ERROR_MESSAGE}</p> : !result ? <p role="status">공지를 불러오는 중이에요</p> : result.items.length === 0 ? <p>{NOTICES_EMPTY_MESSAGE}</p> : (
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
      )}
    </section>
  )
}
