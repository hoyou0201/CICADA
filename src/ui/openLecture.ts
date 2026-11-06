import type { LectureItem } from '../contract/lms.ts'
import type { PresenceStatus } from '../contract/room.ts'
import { useStore } from '../state/store.ts'

export const POPUP_BLOCKED_MESSAGE = '팝업을 허용해 주세요'

export type OpenLectureResult =
  | { opened: true }
  /** 팝업이 막혔거나 열 수 없는 주소. url은 사용자가 직접 여는 링크 */
  | { opened: false; message: string; url: string }

type OpenFn = (url: string, target: string) => Window | null

function isHttpUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * 고른 강의 상태에 맞는 내 presence 상태. 강의를 열어 둔 동안은 '수강 중'(watching)이다.
 * 저장소에 내 상태 항목이 따로 없어서 현재 강의 유무로 정한다.
 */
export function statusForLecture(lecture: LectureItem | null): PresenceStatus {
  return lecture ? 'watching' : 'idle'
}

/**
 * 영상을 새 창으로 열고 저장소의 현재 강의를 바꾼다(=수강 중).
 * 팝업이 막히면 저장소는 그대로 두고 안내 문구와 직접 여는 링크를 돌려준다.
 * 클릭 같은 사용자 동작 안에서 바로 불러야 팝업이 막히지 않는다.
 */
export function openLecture(
  lecture: LectureItem,
  open: OpenFn = (url, target) => window.open(url, target),
): OpenLectureResult {
  const blocked: OpenLectureResult = {
    opened: false,
    message: POPUP_BLOCKED_MESSAGE,
    url: lecture.url,
  }
  if (!isHttpUrl(lecture.url)) return blocked

  const popup = open(lecture.url, '_blank')
  if (!popup) return blocked
  // 열린 LMS 창이 우리 창을 건드리지 못하게 끊는다.
  popup.opener = null

  useStore.getState().setSelectedLecture(lecture)
  return { opened: true }
}
