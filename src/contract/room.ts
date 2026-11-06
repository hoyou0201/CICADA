// 같은 방 계약. Supabase Realtime 채널 `campus`(presence)와 `room:{roomId}`(broadcast).

export type Room = { id: string; name: string }

export type PresenceStatus = 'idle' | 'watching' | 'away'

export type AvatarLook = { preset: string; color: string }

/** 채널 `campus` 하나, 모든 방 공통. 방별 인원 수는 roomId로 세어 구한다. */
export type PresenceState = {
  /** 탭마다 임의 값 */
  key: string
  nickname: string
  roomId: string
  avatar: AvatarLook
  status: PresenceStatus
}

/** 채널 `room:{roomId}`, 이벤트 `move`, 초당 최대 10번. 받는 쪽은 보간한다. */
export type MovePayload = {
  key: string
  x: number
  z: number
  rotY: number
  at: number
}

export const CAMPUS_CHANNEL = 'campus'
export const MOVE_EVENT = 'move'
export const MOVE_MAX_PER_SECOND = 10

export function roomChannel(roomId: string): string {
  return `room:${roomId}`
}

export const ROOM_ALONE_MESSAGE = '아직 혼자예요. 링크를 보내 같이 들어요'
export const ROOM_OFFLINE_MESSAGE = '혼자 모드'
