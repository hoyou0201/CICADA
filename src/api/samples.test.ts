import { afterEach, describe, expect, it, vi } from 'vitest'
import { PROFESSOR_ERROR_MESSAGE, PROFESSOR_TIMEOUT_MS } from '../contract/professor.ts'
import { NOTICE_BOARDS } from '../contract/notices.ts'
import { getNotices } from './notices.ts'
import { askProfessor } from './professor.ts'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('샘플 클라이언트', () => {
  it('askProfessor는 서버 함수가 없으면 0.5초 뒤 샘플 답을 돌려준다', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const promise = askProfessor({ question: '이게 뭐예요?', courseName: null, lectureTitle: null, history: [] })
    let done = false
    void promise.then(() => (done = true))
    await vi.advanceTimersByTimeAsync(499)
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    const result = await promise
    expect(result.isSample).toBe(true)
    expect(result.answer.length).toBeGreaterThan(0)
  })

  it('getNotices는 게시판 3개 모두 5개씩 샘플을 돌려준다', async () => {
    vi.useFakeTimers()
    for (const { board } of NOTICE_BOARDS) {
      const promise = getNotices(board, 5)
      await vi.advanceTimersByTimeAsync(500)
      const result = await promise
      expect(result.board).toBe(board)
      expect(result.isSample).toBe(true)
      expect(result.items).toHaveLength(5)
      expect(result.items[0]).toEqual(
        expect.objectContaining({ title: expect.any(String), url: expect.any(String), publishedAt: expect.any(String) }),
      )
    }
  })

  it('모르는 게시판은 빈 목록이다', async () => {
    vi.useFakeTimers()
    const promise = getNotices(1)
    await vi.advanceTimersByTimeAsync(500)
    expect((await promise).items).toEqual([])
  })
})

describe('askProfessor 실제 호출', () => {
  const request = { question: '이게 뭐예요?', courseName: '자료구조', lectureTitle: '트리', history: [] }

  it('서버 답을 isSample: false로 돌려준다', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ answer: '서버 답' }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await askProfessor(request)).toEqual({ answer: '서버 답', isSample: false })
    expect(fetchMock.mock.calls[0][0]).toBe('/api/professor')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(request)
  })

  it('개발 서버가 index.html을 돌려주면 샘플로 대체한다', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html></html>', { status: 200 })))
    const promise = askProfessor(request)
    await vi.advanceTimersByTimeAsync(500)
    expect((await promise).isSample).toBe(true)
  })

  it('서버가 502면 샘플로 숨기지 않고 실패한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 502 })))
    await expect(askProfessor(request)).rejects.toThrow(PROFESSOR_ERROR_MESSAGE)
  })

  it('15초 안에 답이 없으면 실패한다', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
      ),
    )
    const promise = askProfessor(request)
    const assertion = expect(promise).rejects.toThrow(PROFESSOR_ERROR_MESSAGE)
    await vi.advanceTimersByTimeAsync(PROFESSOR_TIMEOUT_MS)
    await assertion
  })
})
