import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetStore, useStore } from '../state/store.ts'

const fake = vi.hoisted(() => {
  const clients: Array<{ channel: ReturnType<typeof vi.fn>; removeChannel: ReturnType<typeof vi.fn>; realtime: { disconnect: ReturnType<typeof vi.fn> }; tracked: unknown[]; untracked: boolean }> = []
  return { clients }
})

vi.mock('./supabase.ts', () => ({
  supabase: null,
  createRealtimeClient: () => {
    const client = {
      channel: vi.fn(),
      removeChannel: vi.fn().mockResolvedValue('ok'),
      realtime: { disconnect: vi.fn() },
      tracked: [] as unknown[],
      untracked: false,
    }
    const channel = {
      on: () => channel,
      presenceState: () => ({}),
      subscribe: (callback: (status: string) => void) => { callback('SUBSCRIBED'); return channel },
      track: (state: unknown) => { client.tracked.push(state); return Promise.resolve('ok') },
      untrack: () => { client.untracked = true; return Promise.resolve('ok') },
    }
    client.channel.mockReturnValue(channel)
    fake.clients.push(client)
    return client
  },
}))

import { joinPresence } from './presence.ts'

describe('강의실 presence', () => {
  beforeEach(() => {
    resetStore()
    fake.clients.length = 0
    vi.stubGlobal('window', new EventTarget())
  })
  afterEach(() => vi.unstubAllGlobals())

  it('입장한 방을 등록하고 방이 바뀌면 갱신하며 나갈 때 해제한다', async () => {
    useStore.getState().setRoomId('room-302')
    const handle = joinPresence({ nickname: '학생' })
    const client = fake.clients[0]
    expect(client?.tracked[0]).toMatchObject({ nickname: '학생', roomId: 'room-302' })
    useStore.getState().setRoomId('room-401')
    expect(client.tracked.at(-1)).toMatchObject({ roomId: 'room-401' })
    handle.leave()
    expect(client.untracked).toBe(true)
    await vi.waitFor(() => expect(client.realtime.disconnect).toHaveBeenCalled())
  })

  it('페이지가 복원되면 presence를 다시 등록한다', () => {
    const handle = joinPresence({ nickname: '학생' })
    const client = fake.clients[0]
    window.dispatchEvent(new Event('pagehide'))
    expect(client.untracked).toBe(true)
    window.dispatchEvent(new Event('pageshow'))
    expect(client.tracked).toHaveLength(2)
    handle.leave()
  })

  it('즉시 다시 입장해도 이전 연결 종료가 새 연결을 해제하지 않는다', async () => {
    const first = joinPresence({ nickname: '첫 입장' })
    first.leave()
    const second = joinPresence({ nickname: '재입장' })
    expect(fake.clients).toHaveLength(2)
    expect(fake.clients[1].tracked[0]).toMatchObject({ nickname: '재입장' })
    await vi.waitFor(() => expect(fake.clients[0].realtime.disconnect).toHaveBeenCalled())
    expect(fake.clients[1].untracked).toBe(false)
    second.leave()
  })
})
