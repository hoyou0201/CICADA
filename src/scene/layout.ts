// 강의실 배치 상수. 단위는 미터, 원점은 바닥 가운데, 칠판이 있는 앞쪽이 -z.
export type Vec3 = [x: number, y: number, z: number]

export const ROOM = {
  width: 14, // x
  depth: 18, // z
  height: 4,
} as const

export const HALF_WIDTH = ROOM.width / 2
export const HALF_DEPTH = ROOM.depth / 2

// 아바타가 걸을 수 있는 사각형 경계(벽에서 조금 떨어진 안쪽).
export const WALK_BOUNDS = {
  minX: -HALF_WIDTH + 0.5,
  maxX: HALF_WIDTH - 0.5,
  minZ: -HALF_DEPTH + 2.5,
  maxZ: HALF_DEPTH - 0.5,
} as const

export const DESK_GRID = {
  rows: 4,
  cols: 3,
  spacingX: 3.5,
  spacingZ: 2.6,
  frontZ: -3.5, // 첫 줄 책상의 z
  size: [1.6, 0.75, 0.7] as Vec3, // 가로·높이·세로
} as const

// 책상 가운데 위치 목록(앞줄 왼쪽부터).
export function deskPositions(): Vec3[] {
  const { rows, cols, spacingX, spacingZ, frontZ, size } = DESK_GRID
  const positions: Vec3[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * spacingX
      positions.push([x, size[1] / 2, frontZ + r * spacingZ])
    }
  }
  return positions
}

export const BLACKBOARD = {
  position: [0, 2, -HALF_DEPTH + 0.05] as Vec3,
  size: [8, 3] as [width: number, height: number],
} as const

export const PROFESSOR = {
  position: [-4.5, 0, -HALF_DEPTH + 2] as Vec3,
  talkRadius: 2.5, // 이 거리 안에 들어오면 질문 창을 연다
} as const

export const NOTICE_BOARD = {
  // 카메라가 뒤(+z)에서 앞을 보므로, 비스듬한 옆벽 대신 정면 벽(칠판 오른쪽)에 건다.
  position: [5.6, 2.4, -HALF_DEPTH + 0.05] as Vec3,
  rotationY: 0,
  size: [2.4, 1.6] as [width: number, height: number],
} as const

export const ROOM_SIGN = {
  position: [3.5, 3.4, -HALF_DEPTH + 0.06] as Vec3,
} as const

export const EXIT_DOOR = {
  position: [-HALF_WIDTH + 0.05, 1.1, HALF_DEPTH - 2] as Vec3,
  rotationY: Math.PI / 2,
  size: [1.2, 2.2] as [width: number, height: number],
  enterRadius: 1.5,
} as const

export const PLAYER_START: Vec3 = [0, 0, HALF_DEPTH - 2]

export const CAMERA_START: Vec3 = [0, 3, HALF_DEPTH + 1]
