import type { ReactNode } from 'react'

type Props = { children: ReactNode }

function canUseWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

// WebGL을 못 쓰는 브라우저에서는 장면 대신 안내를 보여 준다.
export default function WebGLGate({ children }: Props) {
  if (!canUseWebGL()) {
    return (
      <div className="center-screen" role="alert" style={{ position: 'absolute', inset: 0 }}>
        <div className="panel" style={{ maxWidth: 360, textAlign: 'center' }}>
          <h2 className="panel-title">이 브라우저에서는 강의실을 열 수 없어요</h2>
          <p className="text-muted" style={{ margin: 0 }}>
            WebGL을 지원하는 최신 Chrome, Edge, Safari에서 다시 열어 주세요.
          </p>
        </div>
      </div>
    )
  }
  return <>{children}</>
}
