import { beforeEach, describe, expect, it } from 'vitest'
import type { DeskData, LectureItem, LmsSession } from '../contract/lms.ts'
import type { PresenceState } from '../contract/room.ts'
import { DEFAULT_ROOM_ID } from '../rooms.ts'
import { DEFAULT_AVATAR, resetStore, useStore } from './store.ts'

const get = () => useStore.getState()

const session: LmsSession = { token: 't', userId: 1, fullName: '홍길동', isSample: true }
const desk: DeskData = {
  user: { fullName: '홍길동' },
  courses: [],
  lectures: [],
  deadlines: [],
  fetchedAt: '2026-11-06T00:00:00Z',
  isSample: true,
  partial: false,
}
const lecture: LectureItem = {
  id: 'l1',
  courseId: 1,
  title: '1주차',
  url: 'https://example.com',
  week: '1',
  dueAt: null,
  done: null,
}
const presence = (key: string, roomId = DEFAULT_ROOM_ID): PresenceState => ({
  key,
  nickname: key,
  roomId,
  avatar: DEFAULT_AVATAR,
  status: 'idle',
})

beforeEach(resetStore)

describe('store', () => {
  it('처음 상태', () => {
    expect(get().screen).toBe('login')
    expect(get().session).toBeNull()
    expect(get().roomId).toBe(DEFAULT_ROOM_ID)
    expect(get().connection).toBe('connecting')
    expect(get().professorHistory).toEqual([])
  })

  it('화면, 세션, 책상 데이터, 방', () => {
    get().setScreen('classroom')
    get().setSession(session)
    get().setDesk(desk)
    get().setRoomId('room-302')
    expect(get().screen).toBe('classroom')
    expect(get().session).toBe(session)
    expect(get().desk).toBe(desk)
    expect(get().roomId).toBe('room-302')
    get().setSession(null)
    expect(get().session).toBeNull()
  })

  it('위치는 방향을 생략하면 방향을 유지한다', () => {
    get().setPosition({ x: 1, z: 2 }, 1.5)
    get().setPosition({ x: 3, z: 4 })
    expect(get().position).toEqual({ x: 3, z: 4 })
    expect(get().rotY).toBe(1.5)
  })

  it('이동 목표, 캐릭터, 화면 공유 스트림, 고른 강의', () => {
    get().setMoveTarget({ x: 5, z: 5 })
    expect(get().moveTarget).toEqual({ x: 5, z: 5 })
    get().setMoveTarget(null)
    expect(get().moveTarget).toBeNull()

    get().setAvatar({ preset: 'cat', color: '#fff' })
    expect(get().avatar.preset).toBe('cat')

    const stream = {} as MediaStream
    get().setScreenStream(stream)
    expect(get().screenStream).toBe(stream)
    get().setScreenStream(null)
    expect(get().screenStream).toBeNull()

    get().setSelectedLecture(lecture)
    expect(get().selectedLecture).toBe(lecture)
  })

  it('같은 방 사람 목록은 위치를 유지하며 갱신된다', () => {
    get().setRemotePlayers([presence('a'), presence('b')])
    get().updateRemoteMove({ key: 'a', x: 1, z: 2, rotY: 0.5, at: 1 })
    expect(get().remotePlayers.a.position).toEqual({ x: 1, z: 2 })
    expect(get().remotePlayers.b.position).toBeNull()

    get().setRemotePlayers([presence('a'), presence('c')])
    expect(Object.keys(get().remotePlayers).sort()).toEqual(['a', 'c'])
    expect(get().remotePlayers.a.position).toEqual({ x: 1, z: 2 })
  })

  it('목록에 없는 사람의 move는 무시한다', () => {
    get().updateRemoteMove({ key: 'x', x: 1, z: 1, rotY: 0, at: 1 })
    expect(get().remotePlayers).toEqual({})
  })

  it('연결 상태와 교수님 대화 기록', () => {
    get().setConnection('offline')
    expect(get().connection).toBe('offline')
    get().addProfessorTurn({ role: 'student', text: '질문' })
    get().addProfessorTurn({ role: 'professor', text: '답' })
    expect(get().professorHistory.map((t) => t.role)).toEqual(['student', 'professor'])
    get().clearProfessorHistory()
    expect(get().professorHistory).toEqual([])
  })
})
