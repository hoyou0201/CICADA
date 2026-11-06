import { describe, expect, it } from 'vitest'
import { createSampleLmsClient, sampleLmsClient } from './sample.ts'

describe('샘플 LMS 클라이언트', () => {
  it('로그인 세션이 isSample: true', async () => {
    const session = await sampleLmsClient.login('', '')
    expect(session.isSample).toBe(true)
  })

  it('강의 3개 이상, 완료·미완료·정보 없음, 마감 3개 이상', async () => {
    const session = await sampleLmsClient.login('a', 'b')
    const desk = await sampleLmsClient.getDesk(session)
    expect(desk.isSample).toBe(true)
    expect(desk.courses.length).toBeGreaterThanOrEqual(3)
    expect(desk.deadlines.length).toBeGreaterThanOrEqual(3)
    const states = new Set(desk.lectures.map((l) => l.done))
    expect(states).toEqual(new Set([true, false, null]))
    const courseIds = new Set(desk.courses.map((c) => c.id))
    for (const item of [...desk.lectures, ...desk.deadlines]) expect(courseIds.has(item.courseId)).toBe(true)
  })

  it('빈 샘플은 빈 배열', async () => {
    const client = createSampleLmsClient({ empty: true })
    const desk = await client.getDesk(await client.login('a', 'b'))
    expect(desk).toMatchObject({ courses: [], lectures: [], deadlines: [], partial: false, isSample: true })
  })
})
