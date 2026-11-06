import { useState, type ReactNode } from 'react'

/** 강의실 화면의 패널을 한 창에 모은 사이드바. 전체를 접으면 제목 줄만 남는다. */
export default function Sidebar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <aside className="sidebar" aria-label="강의실 사이드바">
      <div className="panel sidebar-window" data-open={open}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">강의실</h2>
          <button
            type="button"
            className="btn btn-secondary"
            aria-expanded={open}
            aria-controls="sidebar-body"
            onClick={() => setOpen(!open)}
          >
            {open ? '접기' : '펴기'}
          </button>
        </div>
        <div id="sidebar-body" className="sidebar-body" hidden={!open}>
          {children}
        </div>
      </div>
    </aside>
  )
}
