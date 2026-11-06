import Prop from './Prop.tsx'
import { HALF_WIDTH, type Vec3 } from './layout.ts'

// 강의실 소품. 모델의 앞이 +z이다.
type Item = { name: string; position: Vec3; rotationY?: number; scale?: number | Vec3 }

const ITEMS: Item[] = [
  // 교탁(강의대)
  { name: 'teacher_desk', position: [3.2, 0, -7.4], scale: 1.1 },
  // 출입문 옆 휴지통
  { name: 'paper_trash_bin', position: [-HALF_WIDTH + 0.4, 0, 5.4] },
  // 천장에 매단 빔프로젝터(고정 막대는 LectureDecor가 그린다)
  { name: 'projector', position: [0, 3.3, -0.5], scale: 1.4 },
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
