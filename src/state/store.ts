import { create } from 'zustand'
import type { ScreenName } from '../App.tsx'
import type { DeskData, LectureItem, LmsSession } from '../contract/lms.ts'
import type { ProfessorTurn } from '../contract/professor.ts'
import type { AvatarLook, MovePayload, PresenceState } from '../contract/room.ts'
import { DEFAULT_ROOM_ID } from '../rooms.ts'

export type Position = { x: number; z: number }

export type ConnectionState = 'connecting' | 'online' | 'offline'

/** 같은 방 다른 사람. 위치는 받은 move를 보간해 쓴다. */
export type RemotePlayer = PresenceState & { position: Position | null; rotY: number }

export const DEFAULT_AVATAR: AvatarLook = { preset: 'default', color: '#4f8cff' }

export type AppState = {
  screen: ScreenName
  session: LmsSession | null
  desk: DeskData | null
  roomId: string
  /** 내 위치(y는 바닥) */
  position: Position
  rotY: number
  /** 바닥 클릭 이동 목표. 없으면 null */
  moveTarget: Position | null
  avatar: AvatarLook
  /** 화면 공유 스트림. 내 화면에서만 쓰고 네트워크로 보내지 않는다 */
  screenStream: MediaStream | null
  /** 같은 방 사람들(key로 구분, 나 제외) */
  remotePlayers: Record<string, RemotePlayer>
  connection: ConnectionState
  professorChatOpen: boolean
  professorHistory: ProfessorTurn[]
  selectedLecture: LectureItem | null

  setScreen: (screen: ScreenName) => void
  setSession: (session: LmsSession | null) => void
  setDesk: (desk: DeskData | null) => void
  setRoomId: (roomId: string) => void
  setPosition: (position: Position, rotY?: number) => void
  setMoveTarget: (target: Position | null) => void
  setAvatar: (avatar: AvatarLook) => void
  setScreenStream: (stream: MediaStream | null) => void
  /** presence 목록으로 사람 목록을 바꾼다. 이미 있던 사람의 위치는 유지한다 */
  setRemotePlayers: (presences: PresenceState[]) => void
  updateRemoteMove: (move: MovePayload) => void
  setConnection: (connection: ConnectionState) => void
  setProfessorChatOpen: (open: boolean) => void
  addProfessorTurn: (turn: ProfessorTurn) => void
  clearProfessorHistory: () => void
  setSelectedLecture: (lecture: LectureItem | null) => void
}

const initialState = {
  screen: 'login' as ScreenName,
  session: null,
  desk: null,
  roomId: DEFAULT_ROOM_ID,
  position: { x: 0, z: 0 },
  rotY: 0,
  moveTarget: null,
  avatar: DEFAULT_AVATAR,
  screenStream: null,
  remotePlayers: {},
  connection: 'connecting' as ConnectionState,
  professorChatOpen: false,
  professorHistory: [] as ProfessorTurn[],
  selectedLecture: null,
}

export const useStore = create<AppState>()((set) => ({
  ...initialState,

  setScreen: (screen) => set({ screen }),
  setSession: (session) => set({ session }),
  setDesk: (desk) => set({ desk }),
  setRoomId: (roomId) => set({ roomId }),
  setPosition: (position, rotY) =>
    set((s) => ({ position, rotY: rotY ?? s.rotY })),
  setMoveTarget: (moveTarget) => set({ moveTarget }),
  setAvatar: (avatar) => set({ avatar }),
  setScreenStream: (screenStream) => set({ screenStream }),
  setRemotePlayers: (presences) =>
    set((s) => {
      const next: Record<string, RemotePlayer> = {}
      for (const p of presences) {
        const old = s.remotePlayers[p.key]
        next[p.key] = { ...p, position: old?.position ?? null, rotY: old?.rotY ?? 0 }
      }
      return { remotePlayers: next }
    }),
  updateRemoteMove: (move) =>
    set((s) => {
      const old = s.remotePlayers[move.key]
      if (!old) return s
      return {
        remotePlayers: {
          ...s.remotePlayers,
          [move.key]: { ...old, position: { x: move.x, z: move.z }, rotY: move.rotY },
        },
      }
    }),
  setConnection: (connection) => set({ connection }),
  setProfessorChatOpen: (professorChatOpen) => set({ professorChatOpen }),
  addProfessorTurn: (turn) =>
    set((s) => ({ professorHistory: [...s.professorHistory, turn] })),
  clearProfessorHistory: () => set({ professorHistory: [] }),
  setSelectedLecture: (selectedLecture) => set({ selectedLecture }),
}))

/** 테스트와 로그아웃에서 처음 상태로 되돌린다. */
export function resetStore(): void {
  useStore.setState(initialState)
}
