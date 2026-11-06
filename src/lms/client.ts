import { LmsError, type DeskData, type LmsClient, type LmsSession } from '../contract/lms.ts'
import { isMoodleError, postForm, type FetchFn } from './http.ts'

const SERVICE = 'moodle_mobile_app'

// 토큰이 틀렸거나 만료됐을 때 Moodle이 주는 errorcode.
const EXPIRED_CODES = new Set(['invalidtoken', 'expiredtoken'])

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/** token.php 응답에서 토큰을 꺼낸다. 아이디·비밀번호가 틀리면 invalid_login. */
function readToken(body: unknown): string {
  if (isMoodleError(body)) {
    // invalidlogin 말고는 웹 서비스가 막혀 있는 등 우리가 어쩔 수 없는 경우다.
    throw new LmsError(body.errorcode === 'invalidlogin' ? 'invalid_login' : 'denied')
  }
  const token = str((body as { token?: unknown } | null)?.token)
  if (!token) throw new LmsError('network')
  return token
}

/** core_webservice_get_site_info 응답에서 이름과 userId를 꺼낸다. */
function readSiteInfo(body: unknown): { userId: number; fullName: string } {
  if (isMoodleError(body)) {
    throw new LmsError(EXPIRED_CODES.has(body.errorcode ?? '') ? 'expired' : 'denied')
  }
  const info = body as { userid?: unknown; fullname?: unknown } | null
  const fullName = str(info?.fullname)
  if (typeof info?.userid !== 'number' || !fullName) throw new LmsError('network')
  return { userId: info.userid, fullName }
}

/**
 * 실제 LMS(Moodle 모바일 웹 서비스) 클라이언트.
 * 비밀번호와 토큰은 브라우저에서 LMS로만 보내고, 로그나 저장소에 남기지 않는다.
 */
export function createRealLmsClient({ fetchFn }: { fetchFn?: FetchFn } = {}): LmsClient {
  return {
    async login(username: string, password: string): Promise<LmsSession> {
      const token = readToken(
        await postForm('/login/token.php', { username, password, service: SERVICE }, fetchFn),
      )
      const { userId, fullName } = readSiteInfo(
        await postForm(
          '/webservice/rest/server.php',
          {
            wstoken: token,
            wsfunction: 'core_webservice_get_site_info',
            moodlewsrestformat: 'json',
          },
          fetchFn,
        ),
      )
      return { token, userId, fullName, isSample: false }
    },

    // 강의·영상·마감 변환(T20~T23)이 생길 때까지는 연결 실패로 돌린다.
    async getDesk(): Promise<DeskData> {
      throw new LmsError('network')
    },
  }
}

export const realLmsClient: LmsClient = createRealLmsClient()
