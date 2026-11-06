import { beforeEach, describe, expect, it } from 'vitest'
import { LmsError, type LmsClient } from '../contract/lms.ts'
import { lms, setRealLmsClient } from './index.ts'
import { loadSession } from './session.ts'

class MemoryStorage {
  private map = new Map<string, string>()
  getItem(k: string) { return this.map.get(k) ?? null }
  setItem(k: string, v: string) { this.map.set(k, v) }
  removeItem(k: string) { this.map.delete(k) }
}

const realSession = { token: 'tok', userId: 7, fullName: '실제 학생', isSample: false }

function fakeReal(overrides: Partial<LmsClient> = {}): LmsClient {
  return {
    login: async () => realSession,
    getDesk: async (s) => ({
      user: { fullName: s.fullName }, courses: [], lectures: [], deadlines: [],
      fetchedAt: '2026-11-06T00:00:00.000Z', isSample: false, partial: false,
    }),
    ...overrides,
  }
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'sessionStorage', { value: new MemoryStorage(), configurable: true })
  setRealLmsClient(fakeReal())
})

describe('lms 진입점', () => {
  it('login은 실제 클라이언트를 쓰고 세션을 저장한다', async () => {
    expect(await lms.login('u', 'p')).toEqual(realSession)
    expect(loadSession()?.mode).toBe('real')
  })

  it('sample은 샘플 세션을 만든다', async () => {
    const session = await lms.sample()
    expect(session.isSample).toBe(true)
    expect(loadSession()?.mode).toBe('sample')
  })

  it('restore는 저장된 세션과 책상 데이터를 돌려준다', async () => {
    await lms.login('u', 'p')
    const restored = await lms.restore()
    expect(restored?.session).toEqual(realSession)
    expect(restored?.desk.isSample).toBe(false)
  })

  it('빈 샘플도 새로고침 뒤에 빈 채로 복원된다', async () => {
    await lms.sample({ empty: true })
    const restored = await lms.restore()
    expect(restored?.desk.courses).toEqual([])
  })

  it('저장된 세션이 없으면 restore는 null', async () => {
    expect(await lms.restore()).toBeNull()
  })

  it('expired면 세션을 지우고 오류를 던진다', async () => {
    await lms.login('u', 'p')
    setRealLmsClient(fakeReal({ getDesk: async () => { throw new LmsError('expired') } }))
    await expect(lms.restore()).rejects.toMatchObject({ code: 'expired' })
    expect(loadSession()).toBeNull()
  })

  it('연결 오류는 세션을 남긴다', async () => {
    await lms.login('u', 'p')
    setRealLmsClient(fakeReal({ getDesk: async () => { throw new LmsError('network') } }))
    await expect(lms.restore()).rejects.toMatchObject({ code: 'network' })
    expect(loadSession()).not.toBeNull()
  })

  it('logout은 세션을 지운다', async () => {
    await lms.sample()
    lms.logout()
    expect(loadSession()).toBeNull()
  })

  it('깨진 저장값은 지우고 null', async () => {
    sessionStorage.setItem('cicada.lms.session', '{oops')
    expect(await lms.restore()).toBeNull()
  })
})
