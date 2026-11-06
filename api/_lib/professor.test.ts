import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handle, parseRequest, toMessages } from '../professor.ts'
import { buildSystemPrompt } from './professorPrompt.ts'

const post = (body: unknown) =>
  new Request('http://localhost/api/professor', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
const valid = { question: '미분이 뭐예요?', courseName: '미적분학', lectureTitle: '1주차', history: [] }

beforeEach(() => {
  vi.stubEnv('ANTHROPIC_API_KEY', 'secret-key-value')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('parseRequest', () => {
  it('빈 질문과 500자 초과를 거절한다', () => {
    expect(parseRequest({ ...valid, question: '   ' })).toBeNull()
    expect(parseRequest({ ...valid, question: 'a'.repeat(501) })).toBeNull()
    expect(parseRequest({ ...valid, question: 'a'.repeat(500) })).not.toBeNull()
  })
  it('형식이 틀리면 거절하고 기록은 최근 6개만 쓴다', () => {
    expect(parseRequest(null)).toBeNull()
    expect(parseRequest({ ...valid, history: [{ role: 'x', text: 'a' }] })).toBeNull()
    const history = Array.from({ length: 9 }, (_, i) => ({ role: 'student', text: `q${i}` }))
    expect(parseRequest({ ...valid, history })?.history).toHaveLength(6)
  })
})

describe('toMessages', () => {
  it('user/assistant가 번갈아 나오고 user로 시작하며 user로 끝난다', () => {
    const messages = toMessages(
      [
        { role: 'professor', text: '안녕' },
        { role: 'student', text: 'a' },
        { role: 'student', text: 'b' },
        { role: 'professor', text: 'c' },
      ],
      '질문',
    )
    expect(messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user'])
    expect(messages[0].content).toBe('a\nb')
  })
})

describe('buildSystemPrompt', () => {
  it('강의 이름과 영상 제목을 맥락으로 넣는다', () => {
    const prompt = buildSystemPrompt('미적분학', '1주차')
    expect(prompt).toContain('미적분학')
    expect(prompt).toContain('1주차')
    expect(buildSystemPrompt(null, null)).not.toContain('지금 듣는 강의')
  })
})

describe('handle', () => {
  it('정상이면 answer를 돌려준다', async () => {
    const ask = vi.fn().mockResolvedValue('좋은 질문이에요.')
    const res = await handle(post(valid), ask)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ answer: '좋은 질문이에요.' })
    expect(ask.mock.calls[0][0].timeoutMs).toBe(15_000)
  })
  it('잘못된 요청은 400이고 LLM을 부르지 않는다', async () => {
    const ask = vi.fn()
    expect((await handle(post({ ...valid, question: '' }), ask)).status).toBe(400)
    expect((await handle(post('not json'), ask)).status).toBe(400)
    expect(ask).not.toHaveBeenCalled()
  })
  it('POST 외 메서드는 405', async () => {
    const res = await handle(new Request('http://localhost/api/professor'), vi.fn())
    expect(res.status).toBe(405)
  })
  it('LLM이 실패하면 502이고 키 값은 로그에 남지 않는다', async () => {
    const ask = vi.fn().mockRejectedValue(new Error('boom secret-key-value'))
    const res = await handle(post(valid), ask)
    expect(res.status).toBe(502)
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain('secret-key-value')
  })
  it('키가 없으면 502와 로그 한 줄', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', '')
    const ask = vi.fn()
    const res = await handle(post(valid), ask)
    expect(res.status).toBe(502)
    expect(ask).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledTimes(1)
  })
})
