import { afterEach, describe, expect, it, vi } from 'vitest'
import { NOTICE_BOARDS } from '../contract/notices.ts'
import { getNotices } from './notices.ts'
import { askProfessor } from './professor.ts'

afterEach(() => vi.useRealTimers())

describe('샘플 클라이언트', () => {
  it('askProfessor는 0.5초 뒤 샘플 답을 돌려준다', async () => {
    vi.useFakeTimers()
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
