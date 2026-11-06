import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetStore, useStore } from '../state/store.ts'
import { startConnection } from './connection.ts'

const makeClient = () => {
  let listener: ((status: string) => void) | undefined
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn((callback: (status: string) => void) => { listener = callback; return channel }),
    track: vi.fn().mockResolvedValue('ok'),
    presenceState: vi.fn().mockReturnValue({}),
    untrack: vi.fn().mockResolvedValue('ok'),
  }
  return {
    channel,
    client: { channel: vi.fn().mockReturnValue(channel), removeChannel: vi.fn().mockResolvedValue('ok'), realtime: { disconnect: vi.fn() } },
    emit: (status: string) => listener?.(status),
  }
}

beforeEach(() => { vi.useFakeTimers(); resetStore() })
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

describe('방 연결', () => {
  it('끊기면 혼자 모드로 바꾸고 다시 접속해 최신 presence를 올린다', async () => {
    const first = makeClient()
    const second = makeClient()
    const factory = vi.fn().mockReturnValueOnce(first.client).mockReturnValueOnce(second.client)
    let nickname = '처음'
    const stop = startConnection(factory as never, 'my-key', () => ({ key: 'my-key', nickname, roomId: 'room', avatar: { preset: 'default', color: 'blue' }, status: 'idle' }), () => {})
    first.emit('SUBSCRIBED')
    expect(useStore.getState().connection).toBe('online')
    first.emit('CLOSED')
    expect(useStore.getState().connection).toBe('offline')
    nickname = '변경'
    await vi.advanceTimersByTimeAsync(1000)
    expect(factory).toHaveBeenCalledTimes(2)
    second.emit('SUBSCRIBED')
    expect(useStore.getState().connection).toBe('online')
    expect(second.channel.track).toHaveBeenCalledWith(expect.objectContaining({ nickname: '변경' }))
    first.emit('SUBSCRIBED')
    expect(first.channel.track).toHaveBeenCalledTimes(1)
    stop.stop()
  })

  it('정리하면 예약된 재접속을 취소한다', async () => {
    const first = makeClient()
    const factory = vi.fn().mockReturnValue(first.client)
    const stop = startConnection(factory as never, 'key', () => ({ key: 'key', nickname: '학생', roomId: 'room', avatar: { preset: 'default', color: 'blue' }, status: 'idle' }), () => {})
    first.emit('CHANNEL_ERROR')
    stop.stop()
    await vi.advanceTimersByTimeAsync(30_000)
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('시간 초과가 반복되면 재시도 간격을 늘린다', async () => {
    const first = makeClient()
    const second = makeClient()
    const third = makeClient()
    const factory = vi.fn().mockReturnValueOnce(first.client).mockReturnValueOnce(second.client).mockReturnValue(third.client)
    const connection = startConnection(factory as never, 'key', () => ({ key: 'key', nickname: '학생', roomId: 'room', avatar: { preset: 'default', color: 'blue' }, status: 'idle' }), () => {})
    first.emit('TIMED_OUT')
    await vi.advanceTimersByTimeAsync(1000)
    second.emit('TIMED_OUT')
    await vi.advanceTimersByTimeAsync(1999)
    expect(factory).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(factory).toHaveBeenCalledTimes(3)
    connection.stop()
  })

  it('설정이 없으면 혼자 모드가 된다', () => {
    const stop = startConnection(() => null, 'key', () => ({ key: 'key', nickname: '학생', roomId: 'room', avatar: { preset: 'default', color: 'blue' }, status: 'idle' }), () => {})
    expect(useStore.getState().connection).toBe('offline')
    stop.stop()
  })
})
