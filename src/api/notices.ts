import { NOTICE_BOARDS, NOTICES_ERROR_MESSAGE, NOTICES_TIMEOUT_MS, type NoticesResponse } from '../contract/notices.ts'
import sample from '../samples/notices.json'

/** 샘플이 응답을 돌려주는 데 걸리는 시간(밀리초). */
export const SAMPLE_DELAY_MS = 500

/** 계약 응답에 샘플 표시값을 더한 결과. */
export type NoticesResult = NoticesResponse & { isSample: boolean }

const SAMPLE_BOARDS = sample as Record<string, NoticesResponse['items']>

async function sampleNotices(board: number, row: number): Promise<NoticesResult> {
  await new Promise((resolve) => setTimeout(resolve, SAMPLE_DELAY_MS))
  const items = (SAMPLE_BOARDS[String(board)] ?? []).slice(0, row)
  return { board, items, fetchedAt: new Date().toISOString(), isSample: true }
}

function isNoticesResponse(value: unknown, board: number): value is NoticesResponse {
  if (typeof value !== 'object' || value === null) return false
  const data = value as Record<string, unknown>
  return data.board === board && typeof data.fetchedAt === 'string' && !Number.isNaN(Date.parse(data.fetchedAt)) &&
    Array.isArray(data.items) && data.items.every((item: unknown) => {
      if (typeof item !== 'object' || item === null) return false
      const notice = item as Record<string, unknown>
      if (typeof notice.title !== 'string' || !notice.title.trim() || typeof notice.url !== 'string' ||
          typeof notice.publishedAt !== 'string' || Number.isNaN(Date.parse(notice.publishedAt))) return false
      try {
        const url = new URL(notice.url)
        return url.protocol === 'https:' || url.protocol === 'http:'
      } catch {
        return false
      }
    })
}

/** 공지 서버를 호출하고 함수가 없는 경우에만 샘플을 사용한다. */
export async function getNotices(
  board: number = NOTICE_BOARDS[0].board,
  row: number = 5,
): Promise<NoticesResult> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error(NOTICES_ERROR_MESSAGE))
    }, NOTICES_TIMEOUT_MS)
  })

  try {
    return await Promise.race([
      (async () => {
        const params = new URLSearchParams({ board: String(board), row: String(row) })
        const response = await fetch(`/api/notices?${params}`, { signal: controller.signal })
        const missing = response.status === 404 || (import.meta.env.DEV && response.ok && response.headers.get('content-type')?.includes('text/html'))
        if (missing) return sampleNotices(board, row)
        if (!response.ok) throw new Error(NOTICES_ERROR_MESSAGE)
        const data: unknown = await response.json()
        if (!isNoticesResponse(data, board)) throw new Error(NOTICES_ERROR_MESSAGE)
        return { ...data, isSample: false }
      })(),
      timeout,
    ])
  } finally {
    clearTimeout(timer)
  }
}
