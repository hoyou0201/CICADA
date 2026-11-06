import {
  PROFESSOR_ERROR_MESSAGE,
  PROFESSOR_TIMEOUT_MS,
  type ProfessorRequest,
  type ProfessorResponse,
} from '../contract/professor.ts'
import sample from '../samples/professor.json'

/** 샘플이 응답을 돌려주는 데 걸리는 시간(밀리초). */
export const SAMPLE_DELAY_MS = 500

/** 계약 응답에 샘플 표시값을 더한 결과. */
export type ProfessorResult = ProfessorResponse & { isSample: boolean }

async function sampleAnswer(request: ProfessorRequest): Promise<ProfessorResult> {
  await new Promise((resolve) => setTimeout(resolve, SAMPLE_DELAY_MS))
  const answer = sample.answers[request.question.length % sample.answers.length]
  return { answer, isSample: true }
}

/** AI 교수님 서버에 질문한다. 개발 서버에 함수가 없으면 샘플을 사용한다. */
export async function askProfessor(request: ProfessorRequest): Promise<ProfessorResult> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort()
      reject(new Error(PROFESSOR_ERROR_MESSAGE))
    }, PROFESSOR_TIMEOUT_MS)
  })

  try {
    return await Promise.race([
      (async () => {
        const response = await fetch('/api/professor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        })
        const isDevFallback = import.meta.env.DEV && (
          response.status === 404 ||
          (response.ok && response.headers.get('content-type')?.includes('text/html'))
        )
        if (isDevFallback) return sampleAnswer(request)
        if (!response.ok) throw new Error(PROFESSOR_ERROR_MESSAGE)
        const data: unknown = await response.json()
        if (typeof data !== 'object' || data === null || !('answer' in data) ||
            typeof data.answer !== 'string' || !data.answer.trim()) {
          throw new Error(PROFESSOR_ERROR_MESSAGE)
        }
        return { answer: data.answer, isSample: false }
      })(),
      timeout,
    ])
  } finally {
    clearTimeout(timer)
  }
}
