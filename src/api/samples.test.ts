import { afterEach, describe, expect, it, vi } from 'vitest'
import { NOTICE_BOARDS } from '../contract/notices.ts'
import { getNotices } from './notices.ts'
import { askProfessor } from './professor.ts'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('샘플 클라이언트', () => {
  it('askProfessor는 0.5초 뒤 샘플 답을 돌려준다', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })))
    const promise = getNotices(1)
    await vi.advanceTimersByTimeAsync(500)
    expect((await promise).items).toEqual([])
  })
})

describe('교수님 서버 클라이언트', () => {
  const request = { question: '질문', courseName: null, lectureTitle: null, history: [] }

  it('서버 답변을 샘플 표시 없이 반환한다', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ answer: '서버 답변' }), {
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetcher)
    expect(await askProfessor(request)).toEqual({ answer: '서버 답변', isSample: false })
    expect(fetcher).toHaveBeenCalledWith('/api/professor', expect.objectContaining({
      method: 'POST', body: JSON.stringify(request),
    }))
  })

  it('개발 서버가 HTML을 반환하면 샘플로 표시한다', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html></html>', {
      headers: { 'content-type': 'text/html' },
    })))
    const result = askProfessor(request)
    await vi.advanceTimersByTimeAsync(500)
    expect((await result).isSample).toBe(true)
  })

  it('서버 오류를 샘플로 숨기지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 502 })))
    await expect(askProfessor(request)).rejects.toThrow()
  })

  it('15초가 지나면 서버 응답을 기다리지 않는다', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => {})))
    const result = askProfessor(request)
    const rejection = expect(result).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(15_000)
    await rejection
  })
})

describe('공지 서버 클라이언트', () => {
  it('요청 게시판의 서버 결과와 빈 목록을 그대로 반환한다', async () => {
    const data = { board: 247, items: [], fetchedAt: '2026-11-06T00:00:00Z' }
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' },
    }))
    vi.stubGlobal('fetch', fetcher)
    expect(await getNotices(247, 3)).toEqual({ ...data, isSample: false })
    expect(fetcher).toHaveBeenCalledWith('/api/notices?board=247&row=3', expect.any(Object))
  })

  it('개발 서버가 HTML을 반환하면 샘플로 표시한다', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html></html>', {
      headers: { 'content-type': 'text/html' },
    })))
    const result = getNotices(246, 2)
    await vi.advanceTimersByTimeAsync(500)
    const notices = await result
    expect(notices.isSample).toBe(true)
    expect(notices.items).toHaveLength(2)
  })

  it('서버 오류와 잘못된 응답은 샘플로 숨기지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 502 })))
    await expect(getNotices()).rejects.toThrow()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ board: 246, items: 'invalid' }), {
      headers: { 'content-type': 'application/json' },
    })))
    await expect(getNotices()).rejects.toThrow()
  })

  it('8초가 지나면 서버 응답을 기다리지 않는다', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => new Promise(() => {})))
    const result = getNotices()
    const rejection = expect(result).rejects.toThrow()
    await vi.advanceTimersByTimeAsync(8_000)
    await rejection
  })
})
