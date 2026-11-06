import { LMS_TIMEOUT_MS, LmsError } from '../contract/lms.ts'

export const LMS_BASE_URL = 'https://lms.inu.ac.kr'

export type FetchFn = typeof fetch

/** Moodle이 200으로 돌려주는 오류 본문. */
export type MoodleErrorBody = {
  error?: string
  exception?: string
  errorcode?: string
  message?: string
}

/**
 * LMS로 form 본문을 POST하고 JSON을 받는다. 브라우저에서 LMS로 직접 보내고 우리 서버를 거치지 않는다.
 * 비밀번호가 주소(로그에 남을 수 있는 곳)에 들어가지 않도록 값은 본문에 담는다.
 * 연결 실패·HTTP 오류·JSON이 아닌 응답은 network, 시간 초과는 timeout으로 던진다.
 */
export async function postForm(
  path: string,
  params: Record<string, string>,
  fetchFn: FetchFn = (input, init) => fetch(input, init),
  timeoutMs: number = LMS_TIMEOUT_MS,
): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchFn(`${LMS_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params),
      signal: controller.signal,
    })
    if (!response.ok) throw new LmsError('network')
    return await response.json()
  } catch (error) {
    if (error instanceof LmsError) throw error
    if (controller.signal.aborted) throw new LmsError('timeout', { cause: error })
    throw new LmsError('network', { cause: error })
  } finally {
    clearTimeout(timer)
  }
}

export function isMoodleError(body: unknown): body is MoodleErrorBody {
  if (typeof body !== 'object' || body === null) return false
  return 'error' in body || 'exception' in body || 'errorcode' in body
}
