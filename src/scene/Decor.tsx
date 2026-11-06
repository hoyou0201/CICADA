import Prop from './Prop.tsx'
import { HALF_DEPTH, HALF_WIDTH, type Vec3 } from './layout.ts'

// 벽 쪽 소품. 모델의 앞이 +z이므로 rotationY로 방 안쪽을 보게 한다
// (앞쪽 벽 0, 뒤쪽 벽 π, 왼쪽 벽 π/2, 오른쪽 벽 -π/2).
const RIGHT = -Math.PI / 2
const LEFT = Math.PI / 2

type Item = { name: string; position: Vec3; rotationY?: number; scale?: number | Vec3 }

const ITEMS: Item[] = [
  // 칠판 앞 러그
  { name: 'rug_rectangle_A', position: [0, 0.005, -6.4], scale: [1.7, 0.25, 1.1] },
  // 칠판 양옆 현수막과 램프
  { name: 'banner_patternA_blue', position: [-5.4, 0.45, -HALF_DEPTH - 0.25], scale: 0.7 },
  { name: 'banner_patternA_blue', position: [5.4, 0.45, -HALF_DEPTH - 0.25], scale: 0.7 },
  { name: 'lamp_standing', position: [-HALF_WIDTH + 0.7, 0, -HALF_DEPTH + 0.7], scale: 0.75 },
  { name: 'lamp_standing', position: [HALF_WIDTH - 0.7, 0, -HALF_DEPTH + 0.7], scale: 0.75 },
  // 사물함(오른쪽 벽)과 책장(왼쪽 벽, 뒤쪽 벽)
  { name: 'locker_row', position: [HALF_WIDTH - 0.3, 0, 6.5], rotationY: RIGHT },
  { name: 'bookshelf_tall', position: [-HALF_WIDTH + 0.25, 0, 3.5], rotationY: LEFT },
  { name: 'bookshelf_tall', position: [-3.2, 0, HALF_DEPTH - 0.25], rotationY: Math.PI },
  { name: 'bookshelf_tall', position: [3.2, 0, HALF_DEPTH - 0.25], rotationY: Math.PI },
  // 세계지도와 액자
  { name: 'world_map', position: [-HALF_WIDTH + 0.03, 1.6, -3], rotationY: LEFT },
  { name: 'pictureframe_medium', position: [HALF_WIDTH - 0.03, 2.2, -2], rotationY: RIGHT },
]

export default function Decor() {
  return (
    <group>
      {ITEMS.map((item, i) => (
        <Prop key={i} {...item} />
      ))}
    </group>
  )
}
