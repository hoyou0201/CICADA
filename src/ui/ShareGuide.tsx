import { useState, type CSSProperties } from 'react'
import { useScreenShare } from '../screen/useScreenShare.ts'
import { useStore } from '../state/store.ts'
import ScreenShareButton from './ScreenShareButton.tsx'

export const SHARE_GUIDE_MESSAGE = '방금 열린 LMS 창을 공유하면 칠판에 떠요'

const GUIDE_STYLE: CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: 'var(--space-5)',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-3)',
  maxWidth: 'calc(100% - var(--space-5))',
}

// 영상을 연 뒤 화면 공유로 이어 주는 안내. 공유를 시작하거나 닫으면 사라진다.
export default function ShareGuide() {
  const lecture = useStore((s) => s.selectedLecture)
  const status = useScreenShare((s) => s.status)
  // 닫은 강의를 기억해 두면 다른 영상을 열 때 안내가 다시 뜬다.
  const [dismissedId, setDismissedId] = useState<string | null>(null)

  if (!lecture || lecture.id === dismissedId || status === 'sharing') return null

  return (
    <div className="panel" style={GUIDE_STYLE} role="status">
      <span>{SHARE_GUIDE_MESSAGE}</span>
      <ScreenShareButton />
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setDismissedId(lecture.id)}
        aria-label="안내 닫기"
      >
        닫기
      </button>
    </div>
  )
}
