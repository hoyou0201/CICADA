import { describe, expect, it } from 'vitest'
import { professorPose } from './ProfessorModel.tsx'

describe('professorPose', () => {
  it('말하지 않으면 끄덕임과 손짓이 없다', () => {
    for (const t of [0, 0.3, 1.7]) {
      const p = professorPose(t, 0)
      expect(p.nod).toBe(0)
      expect(p.gesture).toBe(0)
    }
  })

  it('말하는 동안 시간에 따라 움직인다', () => {
    const a = professorPose(0.1, 1)
    const b = professorPose(0.4, 1)
    expect(a.nod).not.toBe(b.nod)
    expect(a.gesture).toBeGreaterThanOrEqual(0)
  })

  it('말하는 동안에는 숨쉬기 배율이 변하지 않는다', () => {
    expect(professorPose(0.7, 1).scaleY).toBe(1)
  })
})
