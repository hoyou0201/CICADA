import type { Room } from '../../contract/room.ts'
import { ROOMS } from '../../rooms.ts'
import type { Vec3 } from '../layout.ts'

export type { Vec3 }

// 캠퍼스 복도 배치 상수. 단위는 미터, 원점은 바닥 가운데, 복도 끝 큰 창쪽이 -z.
export const HALLWAY = {
  width: 7, // x
  depth: 24, // z
  height: 4,
} as const

export const HALF_WIDTH = HALLWAY.width / 2
export const HALF_DEPTH = HALLWAY.depth / 2

// 아바타가 걸을 수 있는 복도 사각형 경계(벽에서 조금 떨어진 안쪽).
export const WALK_BOUNDS = {
  minX: -HALF_WIDTH + 0.6,
  maxX: HALF_WIDTH - 0.6,
  minZ: -HALF_DEPTH + 1.0,
  maxZ: HALF_DEPTH - 1.0,
} as const

export const DOOR_SIZE: [width: number, height: number] = [1.4, 2.3]
export const DOOR_ENTER_RADIUS = 1.8

export type DoorSlot = {
  room: Room
  roomId: string
  name: string
  side: 'left' | 'right'
  position: Vec3
  rotationY: number
  size: [width: number, height: number]
  enterRadius: number
}

// 강의실 목록(src/rooms.ts) 개수만큼 복도 양쪽(왼·오 번갈아)에 문 자리를 배치한다.
export function doorSlots(rooms: readonly Room[] = ROOMS): DoorSlot[] {
  const pairCount = Math.max(1, Math.ceil(rooms.length / 2))
  const spacingZ = pairCount > 1 ? Math.min(9, (HALLWAY.depth - 8) / (pairCount - 1)) : 0
  const [, doorHeight] = DOOR_SIZE

  return rooms.map((room, index) => {
    const isLeft = index % 2 === 0
    const pairIndex = Math.floor(index / 2)
    const z = pairCount > 1 ? (pairIndex - (pairCount - 1) / 2) * spacingZ : 0
    const x = isLeft ? -HALF_WIDTH + 0.05 : HALF_WIDTH - 0.05
    const rotationY = isLeft ? Math.PI / 2 : -Math.PI / 2

    return {
      room,
      roomId: room.id,
      name: room.name,
      side: isLeft ? 'left' : 'right',
      position: [x, doorHeight / 2, z],
      rotationY,
      size: DOOR_SIZE,
      enterRadius: DOOR_ENTER_RADIUS,
    }
  })
}

export const DOOR_SLOTS: DoorSlot[] = doorSlots(ROOMS)
export const DOORS: DoorSlot[] = DOOR_SLOTS

export type HallwayWindow = {
  position: Vec3
  rotationY: number
  size: [width: number, height: number]
}

// 복도 끝 정면 큰 창과 양쪽 벽 채광창.
export const WINDOWS: HallwayWindow[] = [
  { position: [0, 2.2, -HALF_DEPTH + 0.02], rotationY: 0, size: [3.8, 2.0] },
  { position: [-HALF_WIDTH + 0.02, 2.2, -9], rotationY: Math.PI / 2, size: [2.4, 1.5] },
  { position: [HALF_WIDTH - 0.02, 2.2, -9], rotationY: -Math.PI / 2, size: [2.4, 1.5] },
  { position: [-HALF_WIDTH + 0.02, 2.2, 8.5], rotationY: Math.PI / 2, size: [2.4, 1.5] },
  { position: [HALF_WIDTH - 0.02, 2.2, 8.5], rotationY: -Math.PI / 2, size: [2.4, 1.5] },
]

export type HallwayPoster = {
  id: string
  title: string
  subtitle: string
  badge: string
  accent: string
  position: Vec3
  rotationY: number
  size: [width: number, height: number]
}

// 복도 양쪽 벽의 학교 게시판·포스터.
export const POSTERS: HallwayPoster[] = [
  {
    id: 'poster-notice',
    title: '7호관 학사 안내',
    subtitle: '사이버 강의 출석·과제 마감 확인',
    badge: 'INU 학사공지',
    accent: '#1d4ed8',
    position: [-HALF_WIDTH + 0.04, 1.85, -1.2],
    rotationY: Math.PI / 2,
    size: [2.2, 1.3],
  },
  {
    id: 'poster-festival',
    title: '창의 웹 해커톤',
    subtitle: 'AI로 다시 쓰는 대학생활',
    badge: 'CAMPUS EVENT',
    accent: '#0f766e',
    position: [-HALF_WIDTH + 0.04, 1.85, 1.4],
    rotationY: Math.PI / 2,
    size: [1.5, 1.3],
  },
  {
    id: 'poster-club',
    title: '전공 스터디 & 동아리 모집',
    subtitle: '함께 듣는 사이버캠퍼스 오픈',
    badge: '학생회 게시판',
    accent: '#b45309',
    position: [HALF_WIDTH - 0.04, 1.85, -1.2],
    rotationY: -Math.PI / 2,
    size: [2.2, 1.3],
  },
  {
    id: 'poster-guide',
    title: '강의실 이용 수칙',
    subtitle: '301호 · 302호 · 401호 · 402호',
    badge: '정보기술대학',
    accent: '#4338ca',
    position: [HALF_WIDTH - 0.04, 1.85, 1.4],
    rotationY: -Math.PI / 2,
    size: [1.5, 1.3],
  },
]

export const PLAYER_START: Vec3 = [0, 0, HALF_DEPTH - 2.5]

export const CAMERA_START: Vec3 = [0, 3, HALF_DEPTH + 1.5]
