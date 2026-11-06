import { LmsError, type DeskData, type LmsClient, type LmsSession } from '../contract/lms.ts'
import { emptySampleLmsClient, sampleLmsClient } from './sample.ts'
import { clearSession, loadSession, saveSession, type SessionMode } from './session.ts'

// 실제 LMS 클라이언트(T19)가 생기기 전까지는 연결 실패로 돌려서 "샘플로 둘러보기"로 안내한다.
// 실제 구현이 생기면 setRealLmsClient로 끼운다.
let realClient: LmsClient = {
  async login() {
    throw new LmsError('network')
  },
  async getDesk() {
    throw new LmsError('network')
  },
}

export function setRealLmsClient(client: LmsClient) {
  realClient = client
}

function clientFor(mode: SessionMode): LmsClient {
  if (mode === 'sample') return sampleLmsClient
  if (mode === 'sample-empty') return emptySampleLmsClient
  return realClient
}

// 화면이 쓰는 LMS 진입점. 어떤 구현인지는 여기서만 고르고, 세션은 sessionStorage에만 둔다.
export const lms = {
  /** 학번·비밀번호로 실제 LMS에 로그인한다. 실패하면 LmsError를 던진다. */
  async login(username: string, password: string): Promise<LmsSession> {
    const session = await realClient.login(username, password)
    saveSession({ session, mode: 'real' })
    return session
  },

  /** "샘플로 둘러보기". empty면 강의·마감이 없는 빈 상태. */
  async sample({ empty = false }: { empty?: boolean } = {}): Promise<LmsSession> {
    const mode: SessionMode = empty ? 'sample-empty' : 'sample'
    const session = await clientFor(mode).login('', '')
    saveSession({ session, mode })
    return session
  },

  /** 세션에 맞는 구현으로 책상 데이터를 받는다. 세션이 만료되면 지우고 expired를 던진다. */
  async getDesk(session: LmsSession): Promise<DeskData> {
    const stored = loadSession()
    const mode: SessionMode = session.isSample ? (stored?.mode === 'sample-empty' ? 'sample-empty' : 'sample') : 'real'
    try {
      return await clientFor(mode).getDesk(session)
    } catch (error) {
      if (error instanceof LmsError && error.code === 'expired') clearSession()
      throw error
    }
  },

  /**
   * 새로고침 뒤 세션을 복원한다. 저장된 세션이 없으면 null.
   * 만료됐으면 세션을 지우고 expired를 던지므로, 호출한 쪽이 로그인 화면으로 보내고 안내를 띄운다.
   * 연결 오류는 세션을 남긴 채 그대로 던진다.
   */
  async restore(): Promise<{ session: LmsSession; desk: DeskData } | null> {
    const stored = loadSession()
    if (!stored) return null
    const desk = await lms.getDesk(stored.session)
    return { session: stored.session, desk }
  },

  logout() {
    clearSession()
  },
}
