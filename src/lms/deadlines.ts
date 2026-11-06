import { LmsError, type Deadline, type DeadlineKind } from '../contract/lms.ts'
import { isMoodleError, postForm, type FetchFn } from './http.ts'

const PAGE_SIZE = 50
const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60

type CalendarEvent = {
  id?: unknown
  name?: unknown
  timesort?: unknown
  course?: { id?: unknown } | null
  modulename?: unknown
  url?: unknown
}

function deadlineFromEvent(value: unknown): Deadline | null {
  if (typeof value !== 'object' || value === null) throw new LmsError('network')
  const event = value as CalendarEvent
  if (event.course == null) return null
  if (
    typeof event.id !== 'number' || !Number.isSafeInteger(event.id) || event.id <= 0 ||
    typeof event.course.id !== 'number' || !Number.isSafeInteger(event.course.id) || event.course.id <= 0 ||
    typeof event.name !== 'string' || !event.name.trim() ||
    typeof event.timesort !== 'number' || !Number.isFinite(event.timesort) ||
    typeof event.url !== 'string' || !event.url
  ) throw new LmsError('network')

  const date = new Date(event.timesort * 1000)
  if (Number.isNaN(date.getTime())) throw new LmsError('network')
  const kind: DeadlineKind = event.modulename === 'assign' || event.modulename === 'quiz' || event.modulename === 'vod'
    ? event.modulename
    : 'other'
  return {
    id: String(event.id),
    courseId: event.course.id,
    title: event.name,
    dueAt: date.toISOString(),
    url: event.url,
    kind,
  }
}

/** 지난 7일부터의 LMS 일정. Moodle의 한 페이지 제한을 넘어가면 이어서 읽는다. */
export async function getDeadlines(
  token: string,
  { fetchFn, now = Date.now() }: { fetchFn?: FetchFn; now?: number } = {},
): Promise<Deadline[]> {
  const result: Deadline[] = []
  const seenCursors = new Set<number>()
  let afterEventId = 0
  const timesortfrom = String(Math.floor(now / 1000) - SEVEN_DAYS_SECONDS)

  while (true) {
    const body = await postForm('/webservice/rest/server.php', {
      wstoken: token,
      wsfunction: 'core_calendar_get_action_events_by_timesort',
      moodlewsrestformat: 'json',
      timesortfrom,
      aftereventid: String(afterEventId),
      limitnum: String(PAGE_SIZE),
    }, fetchFn)
    if (isMoodleError(body)) {
      throw new LmsError(body.errorcode === 'invalidtoken' || body.errorcode === 'expiredtoken' ? 'expired' : 'denied')
    }
    if (typeof body !== 'object' || body === null || !('events' in body) || !Array.isArray(body.events)) {
      throw new LmsError('network')
    }
    for (const event of body.events) {
      const deadline = deadlineFromEvent(event)
      if (deadline) result.push(deadline)
    }
    if (body.events.length < PAGE_SIZE) return result
    const cursor = 'lastid' in body ? body.lastid : undefined
    if (typeof cursor !== 'number' || !Number.isSafeInteger(cursor) || cursor <= 0 || seenCursors.has(cursor)) {
      throw new LmsError('network')
    }
    seenCursors.add(cursor)
    afterEventId = cursor
  }
}
