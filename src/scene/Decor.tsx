import Prop from './Prop.tsx'
import { HALF_DEPTH, HALF_WIDTH, type Vec3 } from './layout.ts'

// 벽 쪽 소품. 모델의 앞이 +z이므로 rotationY로 방 안쪽을 보게 한다
// (앞쪽 벽 0, 뒤쪽 벽 π, 왼쪽 벽 π/2, 오른쪽 벽 -π/2).
const RIGHT = -Math.PI / 2
const LEFT = Math.PI / 2

type Item = { name: string; position: Vec3; rotationY?: number; scale?: number | Vec3 }

const ITEMS: Item[] = [
  // 칠판 양옆 램프(태극기, 급훈, 시간표는 KoreanDecor가 그린다)
  { name: 'lamp_standing', position: [-HALF_WIDTH + 0.7, 0, -HALF_DEPTH + 0.7], scale: 0.75 },
  { name: 'lamp_standing', position: [HALF_WIDTH - 0.7, 0, -HALF_DEPTH + 0.7], scale: 0.75 },
  // 사물함과 책장(창문과 겹치지 않는 벽에)
  { name: 'locker_row', position: [0, 0, HALF_DEPTH - 0.25], rotationY: Math.PI },
  { name: 'bookshelf_tall', position: [-HALF_WIDTH + 0.25, 0, 3.5], rotationY: LEFT },
  { name: 'bookshelf_tall', position: [-3.2, 0, HALF_DEPTH - 0.25], rotationY: Math.PI },
  { name: 'bookshelf_tall', position: [3.2, 0, HALF_DEPTH - 0.25], rotationY: Math.PI },
  // 교탁과 그 위의 소품
  { name: 'teacher_desk', position: [3.2, 0, -7.4], scale: 1.1 },
  { name: 'globe', position: [2.5, 0.84, -7.4], scale: 0.6 },
  { name: 'books_stack', position: [3.7, 0.84, -7.4], rotationY: 0.4 },
  { name: 'pencil_cup', position: [3.2, 0.84, -7.6] },
  // 창문 아래 수납장과 벤치, 문 옆 휴지통
  { name: 'cubby_shelf', position: [HALF_WIDTH - 0.3, 0, -6], rotationY: RIGHT, scale: 1.2 },
  { name: 'bench', position: [-HALF_WIDTH + 0.3, 0, -1], rotationY: LEFT, scale: 1.2 },
  { name: 'paper_trash_bin', position: [-HALF_WIDTH + 0.4, 0, 5.4] },
  // 세계지도와 액자
  { name: 'world_map', position: [-HALF_WIDTH + 0.03, 1.9, -3], rotationY: LEFT, scale: 0.8 },
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
