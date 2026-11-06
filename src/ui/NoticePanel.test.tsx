import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetStore, useStore } from '../state/store.ts'
import NoticePanel from './NoticePanel.tsx'

vi.mock('../state/store.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../state/store.ts')>()
  return { ...actual, useStore: Object.assign((selector: (state: ReturnType<typeof actual.useStore.getState>) => unknown) => selector(actual.useStore.getState()), actual.useStore) }
})

beforeEach(resetStore)

describe('공지 창', () => {
  it('닫혀 있으면 보이지 않고 열면 샘플 공지를 보여 준다', () => {
    expect(renderToStaticMarkup(<NoticePanel />)).toBe('')
    useStore.getState().setNotices({ board: 246, items: [{ title: '[샘플] 공지', url: 'https://example.com/', publishedAt: '' }], fetchedAt: '', isSample: true })
    useStore.getState().setNoticeOpen(true)
    const html = renderToStaticMarkup(<NoticePanel />)
    expect(html).toContain('[샘플] 공지')
    expect(html).toContain('샘플')
    expect(html).toContain('https://example.com/')
  })

  it('빈 결과와 오류를 구분한다', () => {
    useStore.getState().setNoticeOpen(true)
    useStore.getState().setNotices({ board: 246, items: [], fetchedAt: '', isSample: false })
    expect(renderToStaticMarkup(<NoticePanel />)).toContain('새 공지가 없어요')
    useStore.getState().setNoticeError(true)
    expect(renderToStaticMarkup(<NoticePanel />)).toContain('학교 홈페이지에 연결하지 못했어요')
  })
})
