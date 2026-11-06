import { describe, expect, it } from 'vitest'
import {
  anonymousNumber,
  loadNickname,
  NICKNAME_MAX,
  resolveNickname,
  saveNickname,
} from './nickname.ts'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  }
}

describe('닉네임', () => {
  it('비우거나 공백이면 익명 학생 N', () => {
    expect(resolveNickname('', 7)).toBe('익명 학생 7')
    expect(resolveNickname('   ', 7)).toBe('익명 학생 7')
  })

  it('쓴 닉네임은 다듬어 길이를 자른다', () => {
    expect(resolveNickname('  호성  ', 7)).toBe('호성')
    expect(resolveNickname('가'.repeat(30), 7)).toHaveLength(NICKNAME_MAX)
  })

  it('저장하면 다음에 불러온다', () => {
    const s = memoryStorage()
    expect(loadNickname(s)).toBe('')
    saveNickname(' 호성 ', s)
    expect(loadNickname(s)).toBe('호성')
  })

  it('익명 번호는 한 번 정하면 유지된다', () => {
    const s = memoryStorage()
    const first = anonymousNumber(s, () => 0.5)
    expect(first).toBeGreaterThanOrEqual(1)
    expect(anonymousNumber(s, () => 0.9)).toBe(first)
  })

  it('저장소가 없어도 동작한다', () => {
    expect(loadNickname(null)).toBe('')
    expect(() => saveNickname('a', null)).not.toThrow()
    expect(anonymousNumber(null, () => 0)).toBe(1)
  })
})
