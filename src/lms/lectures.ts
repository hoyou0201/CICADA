import { LmsError, type Course, type LectureItem } from '../contract/lms.ts'
import { isMoodleError, postForm, type FetchFn } from './http.ts'

const PATH = '/webservice/rest/server.php'
const VIDEO_MODULES = new Set(['vod', 'xncommons', 'url'])

type MoodleCourse = { id: number; fullname: string }
type MoodleModule = {
  id: number
  name: string
  modname: string
  url?: string
  completiondata?: { state?: number }
}
type MoodleSection = { name?: string; modules?: MoodleModule[] }

async function callMoodle(
  token: string,
  wsfunction: string,
  params: Record<string, string>,
  fetchFn?: FetchFn,
): Promise<unknown[]> {
  const response = await postForm(PATH, {
    wstoken: token,
    wsfunction,
    moodlewsrestformat: 'json',
    ...params,
  }, fetchFn)
  if (isMoodleError(response)) {
    throw new LmsError(['invalidtoken', 'expiredtoken'].includes(response.errorcode ?? '') ? 'expired' : 'denied')
  }
  if (!Array.isArray(response)) throw new LmsError('network')
  return response
}

export async function getCourses(token: string, userId: number, fetchFn?: FetchFn): Promise<Course[]> {
  const courses = await callMoodle(token, 'core_enrol_get_users_courses', { userid: String(userId) }, fetchFn)
  return (courses as MoodleCourse[]).map((course) => ({ id: course.id, name: course.fullname }))
}

export async function getLectures(token: string, courseId: number, fetchFn?: FetchFn): Promise<LectureItem[]> {
  const sections = await callMoodle(token, 'core_course_get_contents', { courseid: String(courseId) }, fetchFn)
  return (sections as MoodleSection[]).flatMap((section) =>
    (section.modules ?? [])
      .filter((module) => VIDEO_MODULES.has(module.modname) && typeof module.url === 'string' && module.url.length > 0)
      .map((module) => ({
        id: String(module.id),
        courseId,
        title: module.name,
        url: module.url!,
        week: section.name || null,
        dueAt: null,
        done: module.completiondata?.state == null ? null : module.completiondata.state !== 0,
      })),
  )
}
