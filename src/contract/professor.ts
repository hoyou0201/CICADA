// AI 교수님 계약. 생산자: api/professor.ts, 클라이언트: src/api/professor.ts.
// 강의명·영상 제목은 AI 교수님 질문 맥락으로만 쓰고 다른 사람에게 보내지 않는다.

export type ProfessorTurn = { role: 'student' | 'professor'; text: string }

/** POST /api/professor */
export type ProfessorRequest = {
  /** 필수, 1~500자 */
  question: string
  courseName: string | null
  lectureTitle: string | null
  /** 최근 6개까지 */
  history: ProfessorTurn[]
}

export type ProfessorResponse = { answer: string }

export const PROFESSOR_QUESTION_MIN = 1
export const PROFESSOR_QUESTION_MAX = 500
export const PROFESSOR_HISTORY_MAX = 6
export const PROFESSOR_TIMEOUT_MS = 15_000

export const PROFESSOR_ERROR_MESSAGE = '교수님이 잠시 자리를 비웠어요. 다시 물어봐 주세요'

/** 400(빈 질문·길이 초과)은 보내기 전에 막는다. */
export function isValidQuestion(question: string): boolean {
  const length = question.trim().length
  return length >= PROFESSOR_QUESTION_MIN && question.length <= PROFESSOR_QUESTION_MAX
}
