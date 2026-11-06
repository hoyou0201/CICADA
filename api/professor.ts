import Anthropic from '@anthropic-ai/sdk'
import { PROFESSOR_MAX_TOKENS, PROFESSOR_MODEL, buildSystemPrompt } from './_lib/professorPrompt.ts'

// 계약은 src/contract/professor.ts와 같다. 서버 함수는 src를 가져오지 않도록 값을 맞춰 둔다.
const QUESTION_MAX = 500
const HISTORY_MAX = 6
const TIMEOUT_MS = 15_000
const CONTEXT_MAX = 200
const TURN_MAX = 2000

type Turn = { role: 'student' | 'professor'; text: string }
type ChatMessage = { role: 'user' | 'assistant'; content: string }

type Parsed = {
  question: string
  courseName: string | null
  lectureTitle: string | null
  history: Turn[]
}

export type Ask = (args: {
  apiKey: string
  system: string
  messages: ChatMessage[]
  timeoutMs: number
}) => Promise<string>

function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

function optionalText(value: unknown): string | null | undefined {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') return undefined
  return value.trim().slice(0, CONTEXT_MAX) || null
}

/** 계약대로 검증한다. 잘못되면 null. */
export function parseRequest(body: unknown): Parsed | null {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  if (typeof b.question !== 'string') return null
  const question = b.question.trim()
  if (question.length < 1 || b.question.length > QUESTION_MAX) return null
  const courseName = optionalText(b.courseName)
  const lectureTitle = optionalText(b.lectureTitle)
  if (courseName === undefined || lectureTitle === undefined) return null

  const rawHistory = b.history ?? []
  if (!Array.isArray(rawHistory)) return null
  const history: Turn[] = []
  for (const item of rawHistory.slice(-HISTORY_MAX)) {
    if (typeof item !== 'object' || item === null) return null
    const { role, text } = item as Record<string, unknown>
    if ((role !== 'student' && role !== 'professor') || typeof text !== 'string') return null
    history.push({ role, text: text.slice(0, TURN_MAX) })
  }
  return { question, courseName, lectureTitle, history }
}

/** 대화 기록과 질문을 user/assistant가 번갈아 나오는 목록으로 만든다. */
export function toMessages(history: Turn[], question: string): ChatMessage[] {
  const messages: ChatMessage[] = []
  const push = (role: ChatMessage['role'], content: string) => {
    if (!content.trim()) return
    const last = messages[messages.length - 1]
    if (last && last.role === role) last.content += `\n${content}`
    else messages.push({ role, content })
  }
  for (const turn of history) push(turn.role === 'student' ? 'user' : 'assistant', turn.text)
  push('user', question)
  // 첫 메시지는 user여야 한다.
  while (messages[0]?.role === 'assistant') messages.shift()
  return messages
}

const askClaude: Ask = async ({ apiKey, system, messages, timeoutMs }) => {
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: timeoutMs })
  const response = await client.messages.create(
    { model: PROFESSOR_MODEL, max_tokens: PROFESSOR_MAX_TOKENS, system, messages },
    { signal: AbortSignal.timeout(timeoutMs) },
  )
  return response.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('')
    .trim()
}

export async function handle(request: Request, ask: Ask = askClaude): Promise<Response> {
  if (request.method !== 'POST') {
    return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { Allow: 'POST' } })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'invalid_request' })
  }
  const parsed = parseRequest(body)
  if (!parsed) return json(400, { error: 'invalid_request' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[professor] ANTHROPIC_API_KEY is not set')
    return json(502, { error: 'llm_unavailable' })
  }

  try {
    const answer = await ask({
      apiKey,
      system: buildSystemPrompt(parsed.courseName, parsed.lectureTitle),
      messages: toMessages(parsed.history, parsed.question),
      timeoutMs: TIMEOUT_MS,
    })
    if (!answer) throw new Error('empty answer')
    return json(200, { answer })
  } catch (error) {
    // 키가 들어 있을 수 있는 메시지 대신 오류 종류만 남긴다.
    console.error('[professor] LLM call failed:', error instanceof Error ? error.name : 'unknown')
    return json(502, { error: 'llm_unavailable' })
  }
}

export function POST(request: Request): Promise<Response> {
  return handle(request)
}
