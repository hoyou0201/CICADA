import {
  PROFESSOR_ERROR_MESSAGE,
  PROFESSOR_TIMEOUT_MS,
  type ProfessorRequest,
  type ProfessorResponse,
} from '../contract/professor.ts'
import sample from '../samples/professor.json'

/** 샘플이 응답을 돌려주는 데 걸리는 시간(밀리초). 실제 호출처럼 기다림을 보여 준다. */
export const SAMPLE_DELAY_MS = 500

/** 계약 응답에 샘플 표시값을 더한 결과. */
export type ProfessorResult = ProfessorResponse & { isSample: boolean }

export class ProfessorError extends Error {
  constructor(options?: ErrorOptions) {
    super(PROFESSOR_ERROR_MESSAGE, options)
    this.name = 'ProfessorError'
  }
}

async function sampleAnswer(request: ProfessorRequest): Promise<ProfessorResult> {
  await new Promise((resolve) => setTimeout(resolve, SAMPLE_DELAY_MS))
  const answers = sample.answers
  // 같은 질문에는 같은 답이 나오게 질문 길이로 고른다.
  const answer = answers[request.question.length % answers.length]
  return { answer, isSample: true }
}

// 개발 서버(vite)에는 서버 함수가 없어서 연결 실패, 404, JSON이 아닌 응답(index.html)이 온다.
class FunctionMissing extends Error {}

async function callServer(request: ProfessorRequest): Promise<ProfessorResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PROFESSOR_TIMEOUT_MS)
  try {
    let response: Response
    try {
      response = await fetch('/api/professor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal,
      })
    } catch (error) {
      if (controller.signal.aborted) throw new ProfessorError({ cause: error })
      throw new FunctionMissing('연결 실패', { cause: error })
    }
    if (response.status === 404) throw new FunctionMissing('404')
    if (!response.ok) throw new ProfessorError()
    let data: unknown
    try {
      data = await response.json()
    } catch (error) {
      if (controller.signal.aborted) throw new ProfessorError({ cause: error })
      throw new FunctionMissing('JSON이 아님', { cause: error })
    }
    const answer = (data as Partial<ProfessorResponse> | null)?.answer
    if (typeof answer !== 'string' || !answer) throw new ProfessorError()
    return { answer, isSample: false }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * AI 교수님에게 묻는다. `/api/professor`를 부르고 15초 안에 답이 없으면 실패한다.
 * 개발 환경에서 서버 함수가 없을 때만 샘플 답(isSample: true)으로 대신한다.
 * 실패하면 ProfessorError(사용자 문구 포함)를 던진다.
 */
export async function askProfessor(request: ProfessorRequest): Promise<ProfessorResult> {
  try {
    return await callServer(request)
  } catch (error) {
    if (error instanceof FunctionMissing && import.meta.env.DEV) return sampleAnswer(request)
    if (error instanceof ProfessorError) throw error
    throw new ProfessorError({ cause: error })
  }
}
