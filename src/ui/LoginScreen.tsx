import { useState, type FormEvent } from 'react'
import type { Navigate } from '../App.tsx'
import { LmsError, LMS_ERROR_MESSAGES } from '../contract/lms.ts'
import { lms } from '../lms/index.ts'
import { useStore } from '../state/store.ts'
import NicknameField from './NicknameField.tsx'

type Props = { navigate: Navigate }

export const PASSWORD_NOTICE = '비밀번호는 학교 LMS로만 보내고 우리 서버에는 보내지 않아요'

function errorMessage(error: unknown): string {
  return error instanceof LmsError ? error.message : LMS_ERROR_MESSAGES.network
}

function Spinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" role="img" aria-label="처리 중" style={{ verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="42 100" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

export default function LoginScreen({ navigate }: Props) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const setSession = useStore((s) => s.setSession)
  const setDesk = useStore((s) => s.setDesk)

  const canSubmit = username.trim() !== '' && password !== '' && !busy

  async function enter(start: () => Promise<Awaited<ReturnType<typeof lms.sample>>>) {
    setBusy(true)
    setError(null)
    try {
      const session = await start()
      const desk = await lms.getDesk(session)
      setSession(session)
      setDesk(desk)
      setPassword('')
      navigate('rooms')
    } catch (e) {
      setPassword('')
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    void enter(() => lms.login(username.trim(), password))
  }

  return (
    <main className="screen center-screen">
      <form
        onSubmit={onSubmit}
        style={{ display: 'grid', gap: 'var(--space-3)', width: 'min(360px, 90vw)' }}
      >
        <h1 style={{ margin: 0, fontSize: 'var(--font-size-xl)' }}>같이 듣는 강의실</h1>
        <label style={{ display: 'grid', gap: 'var(--space-1)' }}>
          <span>학번</span>
          <input
            type="text"
            value={username}
            autoComplete="username"
            inputMode="numeric"
            disabled={busy}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label style={{ display: 'grid', gap: 'var(--space-1)' }}>
          <span>비밀번호</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            disabled={busy}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p role="alert" style={{ margin: 0, color: 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>
            {error}
          </p>
        )}
        <NicknameField />
        <button type="submit" disabled={!canSubmit}>
          {busy ? <Spinner /> : '로그인'}
        </button>
        <button
          type="button"
          disabled={busy}
          style={{ background: 'var(--color-surface-2)' }}
          onClick={() => void enter(() => lms.sample())}
        >
          샘플로 둘러보기
        </button>
        <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
          {PASSWORD_NOTICE}
        </p>
      </form>
    </main>
  )
}
