import { afterEach, describe, expect, it, vi } from 'vitest'
import { LmsError, type LmsErrorCode } from '../contract/lms.ts'
import { createRealLmsClient } from './client.ts'
import type { FetchFn } from './http.ts'

afterEach(() => vi.useRealTimers())

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function client(fetchMock: ReturnType<typeof vi.fn>) {
  return createRealLmsClient({ fetchFn: fetchMock as unknown as FetchFn })
}

async function codeOf(promise: Promise<unknown>): Promise<LmsErrorCode | 'no-error'> {
  try {
    await promise
    return 'no-error'
  } catch (error) {
    if (error instanceof LmsError) return error.code
    throw error
  }
}

describe('실제 LMS 로그인', () => {
  it('토큰을 받고 사이트 정보로 이름과 userId를 채운다', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ token: 'tok123' }))
      .mockResolvedValueOnce(json({ fullname: '김학생', userid: 4242 }))
    const session = await client(fetchMock).login('2020001', 'secret')

    expect(session).toEqual({ token: 'tok123', userId: 4242, fullName: '김학생', isSample: false })
    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0]
    expect(tokenUrl).toBe('https://lms.inu.ac.kr/login/token.php')
    expect(String(tokenUrl)).not.toContain('secret')
    expect((tokenInit.body as URLSearchParams).get('service')).toBe('moodle_mobile_app')
    expect((tokenInit.body as URLSearchParams).get('username')).toBe('2020001')
    const [infoUrl, infoInit] = fetchMock.mock.calls[1]
    expect(infoUrl).toBe('https://lms.inu.ac.kr/webservice/rest/server.php')
    expect((infoInit.body as URLSearchParams).get('wsfunction')).toBe('core_webservice_get_site_info')
    expect((infoInit.body as URLSearchParams).get('wstoken')).toBe('tok123')
  })

  it('아이디·비밀번호가 틀리면 invalid_login', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ error: 'Invalid login', errorcode: 'invalidlogin' }))
    expect(await codeOf(client(fetchMock).login('a', 'b'))).toBe('invalid_login')
  })

  it('연결 실패와 HTTP 오류는 network', async () => {
    const down = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    expect(await codeOf(client(down).login('a', 'b'))).toBe('network')
    const serverError = vi.fn().mockResolvedValue(json({}, 503))
    expect(await codeOf(client(serverError).login('a', 'b'))).toBe('network')
  })

  it('10초 안에 응답이 없으면 timeout', async () => {
    vi.useFakeTimers()
    const hanging = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () =>
            reject(new DOMException('aborted', 'AbortError')),
          )
        }),
    )
    const result = codeOf(client(hanging).login('a', 'b'))
    await vi.advanceTimersByTimeAsync(9_999)
    expect(hanging).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(await result).toBe('timeout')
  })

  it('웹 서비스 권한이 없으면 denied', async () => {
    const tokenDenied = vi.fn().mockResolvedValue(json({ error: 'Web services are not enabled', errorcode: 'enablewsdescription' }))
    expect(await codeOf(client(tokenDenied).login('a', 'b'))).toBe('denied')
    const infoDenied = vi
      .fn()
      .mockResolvedValueOnce(json({ token: 't' }))
      .mockResolvedValueOnce(json({ exception: 'webservice_access_exception', errorcode: 'accessexception' }))
    expect(await codeOf(client(infoDenied).login('a', 'b'))).toBe('denied')
  })

  it('토큰이 만료·무효면 expired', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ token: 't' }))
      .mockResolvedValueOnce(json({ exception: 'moodle_exception', errorcode: 'invalidtoken' }))
    expect(await codeOf(client(fetchMock).login('a', 'b'))).toBe('expired')
  })

  it('예상 밖의 응답 모양은 network', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ unexpected: true }))
    expect(await codeOf(client(fetchMock).login('a', 'b'))).toBe('network')
  })
})
