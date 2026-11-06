import type { Room } from './contract/room.ts'

export const ROOMS: Room[] = [
  { id: 'room-301', name: '7호관 301호' },
  { id: 'room-302', name: '7호관 302호' },
  { id: 'room-401', name: '7호관 401호' },
  { id: 'room-402', name: '7호관 402호' },
]

export const DEFAULT_ROOM_ID = ROOMS[0].id
