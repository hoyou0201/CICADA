import { useScreenShare } from '../screen/useScreenShare.ts'

export const SCREEN_SHARE_MESSAGES = {
  unsupported: 'PC Chrome에서 칠판에 띄울 수 있어요',
  denied: '화면 공유가 취소됐어요. 다시 눌러 LMS 영상 창을 골라 주세요',
  error: '화면 공유를 시작하지 못했어요. 다시 시도해 주세요',
} as const

// 내 LMS 영상 창을 칠판에 띄우는 시작·중지 버튼. 지원하지 않는 브라우저에서는 버튼 대신 안내만 보인다.
export default function ScreenShareButton() {
  const status = useScreenShare((state) => state.status)
  const start = useScreenShare((state) => state.start)
  const stop = useScreenShare((state) => state.stop)

  if (status === 'unsupported') {
    return (
      <p className="text-muted" role="status">
        {SCREEN_SHARE_MESSAGES.unsupported}
      </p>
    )
  }

  if (status === 'sharing') {
    return (
      <button type="button" className="btn btn-danger" onClick={stop}>
        공유 중지
      </button>
    )
  }

  return (
    <div>
      <button type="button" className="btn" onClick={() => void start()} disabled={status === 'requesting'}>
        {status === 'requesting' ? '공유할 창을 고르는 중…' : '칠판에 띄우기'}
      </button>
      {(status === 'denied' || status === 'error') && (
        <p className="text-muted" role="alert">
          {SCREEN_SHARE_MESSAGES[status]}
        </p>
      )}
    </div>
  )
}
