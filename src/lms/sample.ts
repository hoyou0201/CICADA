import type { DeskData, LmsClient, LmsSession } from '../contract/lms.ts'
import deskEmpty from '../samples/desk-empty.json'
import desk from '../samples/desk.json'

const SAMPLE_SESSION: LmsSession = {
  token: 'sample-token',
  userId: 0,
  fullName: '샘플 학생',
  isSample: true,
}

// 샘플 LMS. 계정 없이 둘러보기용이라 어떤 입력으로도 로그인되고, 항상 isSample: true를 돌려준다.
// empty가 true면 강의·마감이 없는 빈 상태를 돌려준다.
export function createSampleLmsClient({ empty = false }: { empty?: boolean } = {}): LmsClient {
  const data = (empty ? deskEmpty : desk) as DeskData
  return {
    async login() {
      return { ...SAMPLE_SESSION }
    },
    async getDesk() {
      return structuredClone(data)
    },
  }
}

export const sampleLmsClient: LmsClient = createSampleLmsClient()
export const emptySampleLmsClient: LmsClient = createSampleLmsClient({ empty: true })
