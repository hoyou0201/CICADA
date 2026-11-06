import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { MOVE_MAX_PER_SECOND } from '../contract/room.ts'

/**
 * Supabase Realtime 클라이언트(같은 방 presence/broadcast 전용).
 * DB·로그인은 쓰지 않는다. 환경 변수가 없거나 잘못되면 `null`이고,
 * 소비자는 연결하지 않고 '혼자 모드'로 동작한다(오류로 멈추지 않는다).
 */

/** URL과 키로 클라이언트를 만든다. 값이 비었거나 URL이 잘못되면 null. */
export function createRealtimeClient(
  url: string | undefined,
  anonKey: string | undefined,
): SupabaseClient | null {
  const trimmedUrl = url?.trim()
  const trimmedKey = anonKey?.trim()
  if (!trimmedUrl || !trimmedKey) return null

  try {
    const { protocol } = new URL(trimmedUrl)
    if (protocol !== 'https:' && protocol !== 'http:') return null

    return createClient(trimmedUrl, trimmedKey, {
      // 로그인하지 않으므로 세션을 저장하거나 갱신하지 않는다.
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      realtime: { params: { eventsPerSecond: MOVE_MAX_PER_SECOND } },
    })
  } catch {
    return null
  }
}

/** 앱 전체가 공유하는 클라이언트. null이면 혼자 모드. */
export const supabase: SupabaseClient | null = createRealtimeClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

/** 실시간 연결을 시도할 수 있는가. false면 혼자 모드. */
export const isRealtimeConfigured = supabase !== null
