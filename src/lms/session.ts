import type { LmsSession } from '../contract/lms.ts'

// 세션은 탭을 닫으면 사라지도록 sessionStorage에만 둔다. 학번·비밀번호는 저장하지 않는다.
const KEY = 'cicada.lms.session'

export type SessionMode = 'real' | 'sample' | 'sample-empty'

export type StoredSession = { session: LmsSession; mode: SessionMode }

function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

function isStored(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false
  const { session, mode } = value as Partial<StoredSession>
  return (
    (mode === 'real' || mode === 'sample' || mode === 'sample-empty') &&
    typeof session === 'object' &&
    session !== null &&
    typeof session.token === 'string' &&
    typeof session.userId === 'number' &&
    typeof session.fullName === 'string' &&
    typeof session.isSample === 'boolean'
  )
}

export function saveSession(stored: StoredSession) {
  try {
    storage()?.setItem(KEY, JSON.stringify(stored))
  } catch {
    // 저장 공간이 막혀 있으면 새로고침 때 복원만 안 된다.
  }
}

export function loadSession(): StoredSession | null {
  const raw = storage()?.getItem(KEY)
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isStored(parsed)) return parsed
  } catch {
    // 깨진 값은 아래에서 지운다.
  }
  clearSession()
  return null
}

export function clearSession() {
  try {
    storage()?.removeItem(KEY)
  } catch {
    // 무시
  }
}
