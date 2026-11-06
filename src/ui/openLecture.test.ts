import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LectureItem } from '../contract/lms.ts'
import { resetStore, useStore } from '../state/store.ts'
import { openLecture, POPUP_BLOCKED_MESSAGE, statusForLecture } from './openLecture.ts'

const lecture: LectureItem = {
  id: 'l1',
  courseId: 1,
  title: '1주차 영상',
  url: 'https://lms.example.com/mod/vod/view.php?id=1',
  week: '1주차',
  dueAt: null,
  done: null,
}

beforeEach(() => resetStore())

describe('openLecture', () => {
  it('새 창으로 열고 현재 강의를 바꾼다', () => {
    const popup = { opener: {} } as unknown as Window
    const open = vi.fn(() => popup)
    expect(openLecture(lecture, open)).toEqual({ opened: true })
    expect(open).toHaveBeenCalledWith(lecture.url, '_blank')
    expect(popup.opener).toBeNull()
    expect(useStore.getState().selectedLecture).toEqual(lecture)
  })

  it('팝업이 막히면 안내와 직접 여는 링크를 돌려주고 상태는 그대로다', () => {
    expect(openLecture(lecture, () => null)).toEqual({
      opened: false,
      message: POPUP_BLOCKED_MESSAGE,
      url: lecture.url,
    })
    expect(useStore.getState().selectedLecture).toBeNull()
  })

  it('http(s)가 아닌 주소는 열지 않는다', () => {
    const open = vi.fn()
    const result = openLecture({ ...lecture, url: 'javascript:alert(1)' }, open)
    expect(result.opened).toBe(false)
    expect(open).not.toHaveBeenCalled()
  })
})

describe('statusForLecture', () => {
  it('강의가 있으면 수강 중', () => {
    expect(statusForLecture(lecture)).toBe('watching')
    expect(statusForLecture(null)).toBe('idle')
  })
})
