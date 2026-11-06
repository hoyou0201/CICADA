// 학교 공지 계약. 생산자: api/notices.ts, 클라이언트: src/api/notices.ts.

export type NoticeItem = { title: string; url: string; publishedAt: string }

/** GET /api/notices?board=246&row=5 */
export type NoticesResponse = {
  board: number
  items: NoticeItem[]
  fetchedAt: string
}

/**
 * 게시판 번호 후보. 이름은 인천대 홈페이지에서 확인해 채운다(아직 미확인).
 * 서버에서 5분 캐시한다.
 */
export const NOTICE_BOARDS = [
  { board: 246, name: '미정' },
  { board: 247, name: '미정' },
  { board: 249, name: '미정' },
] as const

export const NOTICES_CACHE_SECONDS = 300
export const NOTICES_TIMEOUT_MS = 8_000

export const NOTICES_EMPTY_MESSAGE = '새 공지가 없어요'
export const NOTICES_ERROR_MESSAGE = '학교 홈페이지에 연결하지 못했어요'
