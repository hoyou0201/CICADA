import { EXIT_DOOR, WALK_BOUNDS } from '../layout.ts'

export type Point = { x: number; z: number }

/** 이 거리보다 가까우면 겹친 것으로 본다(미터). */
export const SPAWN_CLEARANCE = 1

const SPAWN_STEP = 0.8
const SPAWN_RINGS = 6

// 문 앞(방 안쪽) 기준점.
const DOOR_FRONT: Point = {
  x: EXIT_DOOR.position[0] + 1.5,
  z: EXIT_DOOR.position[2],
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function inBounds(p: Point): boolean {
  return (
    p.x >= WALK_BOUNDS.minX &&
    p.x <= WALK_BOUNDS.maxX &&
    p.z >= WALK_BOUNDS.minZ &&
    p.z <= WALK_BOUNDS.maxZ
  )
}

function nearestDistance(p: Point, others: Point[]): number {
  let best = Infinity
  for (const o of others) best = Math.min(best, Math.hypot(p.x - o.x, p.z - o.z))
  return best
}

// 기준점에서 가까운 순서로 후보를 만든다. 같은 입력이면 항상 같은 순서다.
function candidates(origin: Point): Point[] {
  const list: Point[] = []
  for (let dx = -SPAWN_RINGS; dx <= SPAWN_RINGS; dx++) {
    for (let dz = -SPAWN_RINGS; dz <= SPAWN_RINGS; dz++) {
      const p = { x: origin.x + dx * SPAWN_STEP, z: origin.z + dz * SPAWN_STEP }
      if (inBounds(p)) list.push(p)
    }
  }
  const dist = (p: Point) => Math.hypot(p.x - origin.x, p.z - origin.z)
  return list.sort((a, b) => dist(a) - dist(b))
}

/**
 * 다른 사람과 겹치지 않는 문 근처 빈 자리를 고른다.
 * 문 앞에서 가까운 순으로 clearance 이상 떨어진 첫 자리를 돌려주고,
 * 빈 자리가 없으면 후보 중 가장 가까운 사람과 가장 멀리 떨어진 자리를 돌려준다.
 */
/**
 * 지금 자리가 나보다 키가 작은 사람과 겹치면 비킨다.
 * 키가 더 작은 쪽이 그 자리에 남으므로 둘이 동시에 들어와도 한 쪽만 움직인다.
 */
export function shouldYieldSpawn(
  myKey: string,
  here: Point,
  others: { key: string; position: Point | null }[],
  clearance: number = SPAWN_CLEARANCE,
): boolean {
  return others.some(
    (other) =>
      other.position !== null &&
      other.key < myKey &&
      Math.hypot(other.position.x - here.x, other.position.z - here.z) < clearance,
  )
}

export function pickSpawn(others: Point[], clearance: number = SPAWN_CLEARANCE): Point {
  const origin = {
    x: clamp(DOOR_FRONT.x, WALK_BOUNDS.minX, WALK_BOUNDS.maxX),
    z: clamp(DOOR_FRONT.z, WALK_BOUNDS.minZ, WALK_BOUNDS.maxZ),
  }
  const list = candidates(origin)
  let fallback = origin
  let fallbackDistance = -1
  for (const p of list) {
    const d = nearestDistance(p, others)
    if (d >= clearance) return p
    if (d > fallbackDistance) {
      fallback = p
      fallbackDistance = d
    }
  }
  return fallback
}
