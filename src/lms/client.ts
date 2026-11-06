import {
  LmsError,
  type Course,
  type DeskData,
  type Deadline,
  type LectureItem,
  type LmsClient,
  type LmsSession,
} from '../contract/lms.ts'
import { fillLectureCompletion } from './completion.ts'
import { getDeadlines } from './deadlines.ts'
import { isMoodleError, postForm, type FetchFn } from './http.ts'
import { getCourses, getLectures } from './lectures.ts'

const SERVICE = 'moodle_mobile_app'

// 토큰이 틀렸거나 만료됐을 때 Moodle이 주는 errorcode.
const EXPIRED_CODES = new Set(['invalidtoken', 'expiredtoken'])

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** token.php 응답에서 토큰을 꺼낸다. 아이디·비밀번호가 틀리면 invalid_login. */
function readToken(body: unknown): string {
  if (isMoodleError(body)) {
    // invalidlogin 말고는 웹 서비스가 막혀 있는 등 우리가 어쩔 수 없는 경우다.
    throw new LmsError(body.errorcode === 'invalidlogin' ? 'invalid_login' : 'denied')
  }
  const token = str((body as { token?: unknown } | null)?.token)
  if (!token) throw new LmsError('network')
  return token
}

/** core_webservice_get_site_info 응답에서 이름과 userId를 꺼낸다. */
function readSiteInfo(body: unknown): { userId: number; fullName: string } {
  if (isMoodleError(body)) {
    throw new LmsError(EXPIRED_CODES.has(body.errorcode ?? '') ? 'expired' : 'denied')
  }
  const info = body as { userid?: unknown; fullname?: unknown } | null
  const fullName = str(info?.fullname)
  if (typeof info?.userid !== 'number' || !fullName) throw new LmsError('network')
  return { userId: info.userid, fullName }
}

const isExpired = (error: unknown) => error instanceof LmsError && error.code === 'expired'

function toLmsError(error: unknown): LmsError {
  return error instanceof LmsError ? error : new LmsError('network', { cause: error })
}

/** 토큰이 만료됐으면 일부만 보여 주지 않고 바로 알린다(다시 로그인해야 한다). */
function throwIfExpired(results: readonly PromiseSettledResult<unknown>[]): void {
  for (const result of results) {
    if (result.status === 'rejected' && isExpired(result.reason)) throw result.reason
  }
}

const dueTime = (dueAt: string | null) => (dueAt === null ? Infinity : new Date(dueAt).getTime())

const normalizeTitle = (title: string) => title.replace(/\s+/g, ' ').trim()

/**
 * 영상(`LectureItem.dueAt`)에 같은 영상의 마감 시각을 채운다.
 * 영상 주소가 같은 'vod' 마감을 먼저 찾고, 없으면 같은 강의의 같은 제목으로 찾는다.
 * 여러 개면 가장 이른 마감을 쓴다.
 */
function withDueDates(lectures: readonly LectureItem[], deadlines: readonly Deadline[]): LectureItem[] {
  const vod = deadlines.filter((deadline) => deadline.kind === 'vod')
  const earliest = (matches: readonly Deadline[]) =>
    matches.reduce<string | null>(
      (best, deadline) => (best === null || dueTime(deadline.dueAt) < dueTime(best) ? deadline.dueAt : best),
      null,
    )
  return lectures.map((lecture) => {
    const byUrl = vod.filter((deadline) => deadline.url === lecture.url)
    const matches =
      byUrl.length > 0
        ? byUrl
        : vod.filter(
            (deadline) =>
              deadline.courseId === lecture.courseId &&
              normalizeTitle(deadline.title) === normalizeTitle(lecture.title),
          )
    return { ...lecture, dueAt: earliest(matches) ?? lecture.dueAt }
  })
}

/**
 * 강의·영상·마감·완료 정보를 합쳐 DeskData를 만든다.
 * - 토큰 만료(expired)는 그대로 던진다.
 * - 일부 호출만 실패하면 가져온 것만 담고 `partial: true`. 강의 목록과 마감을 둘 다 못 받으면 던진다.
 * - 마감과 영상은 마감이 빠른 순으로 정렬한다(마감 없는 영상은 뒤에, 원래 순서 유지).
 */
async function buildDesk(session: LmsSession, fetchFn: FetchFn | undefined, now: () => number): Promise<DeskData> {
  const { token, userId } = session

  const [coursesResult, deadlinesResult] = await Promise.allSettled([
    getCourses(token, userId, fetchFn),
    getDeadlines(token, { fetchFn, now: now() }),
  ])
  throwIfExpired([coursesResult, deadlinesResult])
  if (coursesResult.status === 'rejected' && deadlinesResult.status === 'rejected') {
    throw toLmsError(coursesResult.reason)
  }

  let partial = false
  let courses: Course[] = []
  if (coursesResult.status === 'fulfilled') courses = coursesResult.value
  else partial = true
  let deadlines: Deadline[] = []
  if (deadlinesResult.status === 'fulfilled') deadlines = deadlinesResult.value
  else partial = true

  const lectureResults = await Promise.allSettled(courses.map((course) => getLectures(token, course.id, fetchFn)))
  throwIfExpired(lectureResults)
  let lectures: LectureItem[] = []
  for (const result of lectureResults) {
    if (result.status === 'fulfilled') lectures.push(...result.value)
    else partial = true
  }

  if (lectures.length > 0) {
    try {
      const filled = await fillLectureCompletion(token, userId, lectures, fetchFn)
      // 완료 조회에 없는 영상은 목록에서 받은 완료 정보를 그대로 둔다.
      lectures = lectures.map((lecture, index) => ({ ...lecture, done: filled[index].done ?? lecture.done }))
    } catch (error) {
      if (isExpired(error)) throw error
      partial = true
    }
  }

  const order = new Map(lectures.map((lecture, index) => [lecture.id + ':' + lecture.courseId, index]))
  const orderOf = (lecture: LectureItem) => order.get(lecture.id + ':' + lecture.courseId) ?? 0
  const dated = withDueDates(lectures, deadlines).sort(
    (a, b) => dueTime(a.dueAt) - dueTime(b.dueAt) || orderOf(a) - orderOf(b),
  )

  return {
    user: { fullName: session.fullName },
    courses,
    lectures: dated,
    deadlines: [...deadlines].sort((a, b) => dueTime(a.dueAt) - dueTime(b.dueAt)),
    fetchedAt: new Date(now()).toISOString(),
    isSample: false,
    partial,
  }
}

/**
 * 실제 LMS(Moodle 모바일 웹 서비스) 클라이언트.
 * 비밀번호와 토큰은 브라우저에서 LMS로만 보내고, 로그나 저장소에 남기지 않는다.
 */
export function createRealLmsClient({
  fetchFn,
  now = Date.now,
}: { fetchFn?: FetchFn; now?: () => number } = {}): LmsClient {
  return {
    async login(username: string, password: string): Promise<LmsSession> {
      const token = readToken(
        await postForm('/login/token.php', { username, password, service: SERVICE }, fetchFn),
      )
      const { userId, fullName } = readSiteInfo(
        await postForm(
          '/webservice/rest/server.php',
          {
            wstoken: token,
            wsfunction: 'core_webservice_get_site_info',
            moodlewsrestformat: 'json',
          },
          fetchFn,
        ),
      )
      return { token, userId, fullName, isSample: false }
    },

    async getDesk(session: LmsSession): Promise<DeskData> {
      return buildDesk(session, fetchFn, now)
    },
  }
}

export const realLmsClient: LmsClient = createRealLmsClient()
