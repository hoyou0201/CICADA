// 장면을 불러오는 동안 화면 가운데에 보이는 로딩 표시.
export default function Loading() {
  return (
    <div
      className="center-screen"
      role="status"
      aria-live="polite"
      style={{ position: 'absolute', inset: 0, flexDirection: 'column' }}
    >
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="16" fill="none" stroke="var(--color-border)" strokeWidth="4" />
        <path d="M20 4a16 16 0 0 1 16 16" fill="none" stroke="var(--color-primary)" strokeWidth="4" strokeLinecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="0.9s" repeatCount="indefinite" />
        </path>
      </svg>
      <span className="text-muted">강의실을 불러오는 중이에요…</span>
    </div>
  )
}
