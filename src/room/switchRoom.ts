import { ROOMS } from '../rooms.ts'
import { PLAYER_START } from '../scene/layout.ts'
import { useStore } from '../state/store.ts'

/**
 * 방 옮기기. 저장소의 `roomId`를 바꾸고 내 자리를 새 방의 시작 위치로 되돌린다.
 *
 * 나머지는 `roomId`를 따라가는 기존 모듈이 맡는다.
 * - presence.ts: presence의 roomId를 바꿔 다시 올리고, 같은 방 사람 목록을 다시 거른다.
 *   그래서 이전 방 사람은 내 목록에서, 나는 이전 방 사람들의 목록에서 빠진다.
 * - moveSender.ts / moveReceiver.ts: 이동 채널을 `room:{새 roomId}`로 바꾼다.
 *
 * 순서: roomId를 먼저 바꾸고 위치를 옮긴다. 그래야 시작 위치로 옮긴 것이
 * 이전 방이 아니라 새 방 채널로 나가 새 방 사람들이 내 자리를 안다.
 *
 * @returns 방이 실제로 바뀌었으면 true. 모르는 방이거나 이미 그 방이면 false(아무것도 바꾸지 않는다).
 */
export function switchRoom(roomId: string): boolean {
  if (!ROOMS.some((room) => room.id === roomId)) return false

  const { roomId: current, setRoomId, setMoveTarget, setPosition } = useStore.getState()
  if (roomId === current) return false

  setRoomId(roomId)
  // 연결이 끊겨 presence가 목록을 다시 거르지 못해도 이전 방 사람은 바로 지운다.
  const { remotePlayers, setRemotePlayers } = useStore.getState()
  setRemotePlayers(Object.values(remotePlayers).filter((player) => player.roomId === roomId))
  setMoveTarget(null)
  setPosition({ x: PLAYER_START[0], z: PLAYER_START[2] }, 0)
  return true
}
