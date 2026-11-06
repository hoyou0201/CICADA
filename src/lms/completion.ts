import { LmsError, type LectureItem } from '../contract/lms.ts'
import { isMoodleError, postForm, type FetchFn, type MoodleErrorBody } from './http.ts'

const PATH = '/webservice/rest/server.php'
const EXPIRED_CODES = new Set(['invalidtoken', 'expiredtoken'])
// 웹 서비스에 함수가 없거나 사용자에게 완료 조회 권한이 없을 때의 Moodle 오류.
const PERMISSION_CODES = new Set(['accessexception', 'nopermissions', 'accessdenied'])
const PERMISSION_EXCEPTIONS = new Set(['webservice_access_exception', 'required_capability_exception'])

type ActivityStatus = {
  cmid?: unknown
  state?: unknown
  tracking?: unknown
}

function isPermissionError(body: MoodleErrorBody): boolean {
  if (body.errorcode != null && PERMISSION_CODES.has(body.errorcode)) return true
  return body.exception != null && PERMISSION_EXCEPTIONS.has(body.exception)
}

/** Moodle state: 0 미완료, 1 완료, 2 완료(통과), 3 완료(미달). tracking 0은 완료를 추적하지 않는다. */
function doneFromStatus(status: ActivityStatus): boolean | null {
  if (status.tracking === 0) return null
  if (typeof status.state !== 'number' || !Number.isInteger(status.state)) return null
  if (status.state === 0) return false
  if (status.state === 1 || status.state === 2 || status.state === 3) return true
  return null
}

/**
 * 한 강의의 활동별 완료. 권한 오류면 'denied'(예외 없음).
 * 키는 cmid 문자열. 값이 null이면 그 활동은 완료 정보가 없는 것이다.
 */
async function completionByCmid(
  token: string,
  userId: number,
  courseId: number,
  fetchFn?: FetchFn,
): Promise<Map<string, boolean | null> | 'denied'> {
  const body = await postForm(PATH, {
    wstoken: token,
    wsfunction: 'core_completion_get_activities_completion_status',
    moodlewsrestformat: 'json',
    courseid: String(courseId),
    userid: String(userId),
  }, fetchFn)

  if (isMoodleError(body)) {
    if (EXPIRED_CODES.has(body.errorcode ?? '')) throw new LmsError('expired')
    if (isPermissionError(body)) return 'denied'
    throw new LmsError('denied')
  }
  if (typeof body !== 'object' || body === null || !('statuses' in body) || !Array.isArray(body.statuses)) {
    throw new LmsError('network')
  }

  const byCmid = new Map<string, boolean | null>()
  for (const item of body.statuses) {
    if (typeof item !== 'object' || item === null) continue
    const status = item as ActivityStatus
    if (typeof status.cmid !== 'number' || !Number.isSafeInteger(status.cmid) || status.cmid <= 0) continue
    byCmid.set(String(status.cmid), doneFromStatus(status))
  }
  return byCmid
}

function withDone(lectures: readonly LectureItem[], done: boolean | null): LectureItem[] {
  return lectures.map((lecture) => ({ ...lecture, done }))
}

/**
 * `core_completion_get_activities_completion_status`로 영상별 done을 채운다.
 * 응답에 없거나 state를 읽을 수 없으면 null. 입력 배열은 바꾸지 않는다.
 * 권한 오류면 모든 done을 null로 두고 예외를 던지지 않는다.
 * 토큰 만료는 expired, 그 밖 응답 오류는 denied 또는 network로 던진다.
 */
export async function fillLectureCompletion(
  token: string,
  userId: number,
  lectures: readonly LectureItem[],
  fetchFn?: FetchFn,
): Promise<LectureItem[]> {
  if (lectures.length === 0) return []

  const courseIds: number[] = []
  for (const lecture of lectures) {
    if (!courseIds.includes(lecture.courseId)) courseIds.push(lecture.courseId)
  }

  const byLecture = new Map<string, boolean | null>()
  for (const courseId of courseIds) {
    const result = await completionByCmid(token, userId, courseId, fetchFn)
    // 함수 권한이 없으면 일부 강의만 채우지 않고 완료 정보 전체를 비운다.
    if (result === 'denied') return withDone(lectures, null)
    for (const [cmid, done] of result) byLecture.set(`${courseId}:${cmid}`, done)
  }

  return lectures.map((lecture) => ({
    ...lecture,
    done: byLecture.get(`${lecture.courseId}:${lecture.id}`) ?? null,
  }))
}
