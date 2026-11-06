import { create } from 'zustand'

/**
 * 화면 공유로 받은 LMS 영상 창의 MediaStream 저장소.
 * 내 화면에서만 쓰고 네트워크로 보내지 않는다(BRIEF 1-6).
 *
 * 생산자: ScreenShareButton이 start()/stop()을 부른다.
 * 소비자: Blackboard가 stream을 읽어 텍스처로 그린다. stream이 null이면 빈 칠판.
 */

export type ScreenShareStatus =
  | 'idle' // 공유 전, 또는 끝난 뒤
  | 'requesting' // 브라우저 공유 선택 창이 떠 있다
  | 'sharing' // stream이 있다
  | 'unsupported' // 이 브라우저는 getDisplayMedia가 없다(모바일 등)
  | 'denied' // 사용자가 거부하거나 선택 창을 닫았다
  | 'error' // 그 밖의 오류

interface ScreenShareState {
  stream: MediaStream | null
  status: ScreenShareStatus
  start: () => Promise<void>
  stop: () => void
}

function stopTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

export const useScreenShare = create<ScreenShareState>((set, get) => {
  // 공유 중지 버튼, 공유한 창/탭 닫힘은 트랙의 ended 이벤트로 온다.
  // 이미 다른 스트림으로 바뀐 뒤 오는 낡은 이벤트는 무시한다.
  const clearIfCurrent = (ended: MediaStream) => {
    if (get().stream !== ended) return
    stopTracks(ended)
    set({ stream: null, status: 'idle' })
  }

  return {
    stream: null,
    status: 'idle',

    start: async () => {
      if (get().status === 'requesting') return

      if (!navigator.mediaDevices?.getDisplayMedia) {
        set({ status: 'unsupported' })
        return
      }

      const previous = get().stream
      set({ status: 'requesting' })

      let next: MediaStream
      try {
        next = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 30 } },
          audio: false,
        })
      } catch (error) {
        const denied =
          error instanceof DOMException &&
          (error.name === 'NotAllowedError' || error.name === 'AbortError')
        // 취소해도 이전 공유는 그대로 유지한다.
        set({ status: previous ? 'sharing' : denied ? 'denied' : 'error' })
        return
      }

      stopTracks(previous)
      for (const track of next.getVideoTracks()) {
        track.addEventListener('ended', () => clearIfCurrent(next), { once: true })
      }
      set({ stream: next, status: 'sharing' })
    },

    stop: () => {
      stopTracks(get().stream)
      set({ stream: null, status: 'idle' })
    },
  }
})
