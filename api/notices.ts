import { NOTICE_BOARDS, NOTICES_CACHE_SECONDS, NOTICES_TIMEOUT_MS, type NoticeItem, type NoticesResponse } from '../src/contract/notices.ts'

const SOURCE = 'https://www.inu.ac.kr'
const MAX_ROWS = 50

type CacheEntry = { data: NoticesResponse; expiresAt: number }

function decodeXml(value: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>|&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (match, cdata: string | undefined, entity: string | undefined) => {
    if (cdata !== undefined) return cdata
    if (!entity) return match
    if (entity[0] !== '#') return entities[entity.toLowerCase()] ?? match
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10)
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : match
  }).trim()
}

function parseRss(xml: string): NoticeItem[] {
  if (!/<rss\b[^>]*>[\s\S]*<channel\b[^>]*>[\s\S]*<\/channel\s*>[\s\S]*<\/rss\s*>/i.test(xml)) throw new Error('invalid RSS')
  const items: NoticeItem[] = []
  for (const match of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item\s*>/gi)) {
    const field = (tag: string) => {
      const raw = match[1].match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, 'i'))?.[1]
      if (raw === undefined) throw new Error('missing RSS field')
      return decodeXml(raw)
    }
    const title = field('title')
    const url = new URL(field('link'), SOURCE)
    const date = new Date(field('pubDate'))
    if (!title || url.protocol !== 'https:' || url.hostname !== 'www.inu.ac.kr' || Number.isNaN(date.getTime())) throw new Error('invalid RSS item')
    items.push({ title, url: url.href, publishedAt: date.toISOString() })
  }
  return items
}

export function createNoticesHandler(fetchFn: typeof fetch = fetch) {
  const cache = new Map<string, CacheEntry>()
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'GET') return Response.json({ error: 'method_not_allowed' }, { status: 405, headers: { Allow: 'GET' } })
    const params = new URL(request.url).searchParams
    const boardText = params.get('board') ?? '246'
    const rowText = params.get('row') ?? '5'
    const board = Number(boardText)
    const row = Number(rowText)
    if (!/^\d+$/.test(boardText) || !NOTICE_BOARDS.some((entry) => entry.board === board) || !/^\d+$/.test(rowText) || !Number.isInteger(row) || row < 1 || row > MAX_ROWS) {
      return Response.json({ error: 'invalid_request' }, { status: 400 })
    }
    const key = `${board}:${row}`
    const cached = cache.get(key)
    if (cached && cached.expiresAt > Date.now()) return Response.json(cached.data)

    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('timeout')) }, NOTICES_TIMEOUT_MS)
      })
      const getFeed = async () => {
        const response = await fetchFn(`${SOURCE}/bbs/inu/${board}/rssList.do?row=${row}`, { signal: controller.signal })
        if (!response.ok) throw new Error('RSS unavailable')
        return parseRss(await response.text()).slice(0, row)
      }
      const items = await Promise.race([getFeed(), timeout])
      const data: NoticesResponse = { board, items, fetchedAt: new Date().toISOString() }
      cache.set(key, { data, expiresAt: Date.now() + NOTICES_CACHE_SECONDS * 1000 })
      return Response.json(data)
    } catch {
      return Response.json({ error: 'notices_unavailable' }, { status: 502 })
    } finally {
      clearTimeout(timer)
    }
  }
}

export const GET = createNoticesHandler()
