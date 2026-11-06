import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

// setRealLmsClient로 바꾸지 않은 기본값이 실제 LMS 클라이언트인지 확인한다.
// 모듈을 새로 불러와 기본 상태에서 시작하고, fetch만 목으로 바꾼다(실제 계정·네트워크는 쓰지 않는다).
describe('기본 실제 클라이언트', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

  async function freshLms(fetchMock: ReturnType<typeof vi.fn>) {
    vi.resetModules()
    vi.stubGlobal('fetch', fetchMock)
    return (await import('./index.ts')).lms
  }

  it('login은 기본으로 lms.inu.ac.kr에 로그인하고 실제 세션을 저장한다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ token: 'tok123' }))
      .mockResolvedValueOnce(json({ fullname: '김학생', userid: 4242 }))
    const fresh = await freshLms(fetchMock)

    const session = await fresh.login('2020001', 'secret')

    expect(session).toEqual({ token: 'tok123', userId: 4242, fullName: '김학생', isSample: false })
    expect(fetchMock.mock.calls[0][0]).toBe('https://lms.inu.ac.kr/login/token.php')
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('secret')
    expect(loadSession()?.mode).toBe('real')
  })

  it('getDesk도 기본으로 실제 LMS에서 받는다(연결 실패로 돌리지 않는다)', async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const wsfunction = (init.body as URLSearchParams).get('wsfunction')
      return json(wsfunction === 'core_calendar_get_action_events_by_timesort' ? { events: [] } : [])
    })
    const fresh = await freshLms(fetchMock as unknown as ReturnType<typeof vi.fn>)

    const desk = await fresh.getDesk({ token: 'tok', userId: 7, fullName: '김학생', isSample: false })

    expect(desk).toMatchObject({ isSample: false, partial: false, courses: [], lectures: [], deadlines: [] })
    const called = fetchMock.mock.calls.map(([, init]) => (init.body as URLSearchParams).get('wsfunction'))
    expect(called).toContain('core_enrol_get_users_courses')
  })

  it('샘플로 둘러보기는 네트워크를 쓰지 않는다', async () => {
    const fetchMock = vi.fn()
    const fresh = await freshLms(fetchMock)

    const session = await fresh.sample()
    const desk = await fresh.getDesk(session)

    expect(session.isSample).toBe(true)
    expect(desk.isSample).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
