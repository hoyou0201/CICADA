// LMS 계약. 생산자: src/lms/client.ts(실제), src/lms/sample.ts(샘플).
// Moodle 응답 구조는 실제 계정 확인 뒤 확정한다(BRIEF 참고).

export type LmsSession = {
  token: string
  userId: number
  fullName: string
  isSample: boolean
}

export type Course = { id: number; name: string }

export type LectureItem = {
  id: string
  courseId: number
  title: string
  url: string
  week: string | null
  dueAt: string | null
  /** 완료 정보가 없으면 null */
  done: boolean | null
}

export type DeadlineKind = 'vod' | 'assign' | 'quiz' | 'other'

export type Deadline = {
  id: string
  courseId: number
  title: string
  dueAt: string
  url: string
  kind: DeadlineKind
}

export type DeskData = {
  user: { fullName: string }
  courses: Course[]
  lectures: LectureItem[]
  deadlines: Deadline[]
  fetchedAt: string
  isSample: boolean
  /** 일부 정보만 받았으면 true */
  partial: boolean
}

export interface LmsClient {
  login(username: string, password: string): Promise<LmsSession>
  getDesk(session: LmsSession): Promise<DeskData>
}

export type LmsErrorCode = 'invalid_login' | 'network' | 'timeout' | 'denied' | 'expired'

export const LMS_TIMEOUT_MS = 10_000

export const LMS_ERROR_MESSAGES: Record<LmsErrorCode, string> = {
  invalid_login: '학번이나 비밀번호가 맞지 않아요',
  network: 'LMS에 연결하지 못했어요. 샘플로 둘러볼 수 있어요',
  timeout: 'LMS에 연결하지 못했어요. 샘플로 둘러볼 수 있어요',
  denied: 'LMS가 이 정보를 열어 주지 않았어요',
  expired: '다시 로그인해 주세요',
}

export class LmsError extends Error {
  readonly code: LmsErrorCode

  constructor(code: LmsErrorCode, options?: ErrorOptions) {
    super(LMS_ERROR_MESSAGES[code], options)
    this.name = 'LmsError'
    this.code = code
  }
}

export const LMS_PARTIAL_MESSAGE = '일부 정보를 불러오지 못했어요'
export const LMS_EMPTY_LECTURES_MESSAGE = '이번 주에 들을 강의가 없어요'
export const POPUP_BLOCKED_MESSAGE = '팝업을 허용해 주세요'
export const SAMPLE_BADGE = '샘플 데이터'
