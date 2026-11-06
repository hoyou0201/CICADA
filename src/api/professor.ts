import type { ProfessorRequest, ProfessorResponse } from '../contract/professor.ts'
import sample from '../samples/professor.json'

/** 샘플이 응답을 돌려주는 데 걸리는 시간(밀리초). 실제 호출처럼 기다림을 보여 준다. */
export const SAMPLE_DELAY_MS = 500

/** 계약 응답에 샘플 표시값을 더한 결과. */
export type ProfessorResult = ProfessorResponse & { isSample: boolean }

/** AI 교수님에게 묻는다. 실제 서버 연결 전까지는 샘플 답을 0.5초 뒤 돌려준다. */
export async function askProfessor(request: ProfessorRequest): Promise<ProfessorResult> {
  await new Promise((resolve) => setTimeout(resolve, SAMPLE_DELAY_MS))
  const answers = sample.answers
  // 같은 질문에는 같은 답이 나오게 질문 길이로 고른다.
  const answer = answers[request.question.length % answers.length]
  return { answer, isSample: true }
}
