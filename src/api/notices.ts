import { NOTICE_BOARDS, type NoticesResponse } from '../contract/notices.ts'
import sample from '../samples/notices.json'

/** 샘플이 응답을 돌려주는 데 걸리는 시간(밀리초). */
export const SAMPLE_DELAY_MS = 500

/** 계약 응답에 샘플 표시값을 더한 결과. */
export type NoticesResult = NoticesResponse & { isSample: boolean }

const SAMPLE_BOARDS = sample as Record<string, NoticesResponse['items']>

/**
 * 게시판의 공지를 가져온다. 실제 서버 연결 전까지는 샘플 공지를 0.5초 뒤 돌려준다.
 * 모르는 게시판 번호는 빈 목록이다.
 */
export async function getNotices(
  board: number = NOTICE_BOARDS[0].board,
  row: number = 5,
): Promise<NoticesResult> {
  await new Promise((resolve) => setTimeout(resolve, SAMPLE_DELAY_MS))
  const items = (SAMPLE_BOARDS[String(board)] ?? []).slice(0, row)
  return { board, items, fetchedAt: new Date().toISOString(), isSample: true }
}
