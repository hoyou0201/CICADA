export const NICKNAME_KEY = 'cicada.nickname'
export const ANON_NUMBER_KEY = 'cicada.anonNumber'
export const NICKNAME_MAX = 20

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>

// 사생활 보호 모드 등으로 localStorage를 못 쓰면 저장 없이 동작한다.
function defaultStorage(): KeyValueStorage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** 저장된 닉네임(없으면 빈 문자열). */
export function loadNickname(storage: KeyValueStorage | null = defaultStorage()): string {
  try {
    return storage?.getItem(NICKNAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveNickname(raw: string, storage: KeyValueStorage | null = defaultStorage()): void {
  try {
    storage?.setItem(NICKNAME_KEY, raw.trim().slice(0, NICKNAME_MAX))
  } catch {
    // 저장 실패는 무시한다.
  }
}

/** 익명 학생 번호. 처음 한 번 정해 저장해 두고 다음에도 같은 번호를 쓴다. */
export function anonymousNumber(
  storage: KeyValueStorage | null = defaultStorage(),
  random: () => number = Math.random,
): number {
  try {
    const saved = Number(storage?.getItem(ANON_NUMBER_KEY))
    if (Number.isInteger(saved) && saved > 0) return saved
  } catch {
    // 읽기 실패면 새로 정한다.
  }
  const n = 1 + Math.floor(random() * 999)
  try {
    storage?.setItem(ANON_NUMBER_KEY, String(n))
  } catch {
    // 저장 실패는 무시한다.
  }
  return n
}

/** 앞뒤 공백을 지우고 비었으면 '익명 학생 N'으로 바꾼다. */
export function resolveNickname(raw: string, anonNumber: number): string {
  const name = raw.trim().slice(0, NICKNAME_MAX)
  return name || `익명 학생 ${anonNumber}`
}
