import { NOTICES_EMPTY_MESSAGE, NOTICES_ERROR_MESSAGE } from '../contract/notices.ts'
import { useStore } from '../state/store.ts'

export default function NoticePanel() {
  const open = useStore((s) => s.noticeOpen)
  const setOpen = useStore((s) => s.setNoticeOpen)
  const notices = useStore((s) => s.notices)
  const error = useStore((s) => s.noticeError)

  if (!open) return null
  return (
    <section className="panel" aria-label="학교 공지" style={{ position: 'absolute', top: 80, right: 16, width: 360, maxWidth: 'calc(100% - 32px)' }}>
      <h2 className="panel-title">
        학교 공지 {notices?.isSample && <span className="badge badge-sample">샘플</span>}
        {' '}<button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>닫기</button>
      </h2>
      {error ? <p role="alert">{NOTICES_ERROR_MESSAGE}</p> : !notices ? <p>공지를 불러오는 중…</p> : notices.items.length === 0 ? <p>{NOTICES_EMPTY_MESSAGE}</p> : (
        <ul>{notices.items.map((item) => <li key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.title}</a></li>)}</ul>
      )}
    </section>
  )
}
