import { useEffect, useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { ROOMS } from '../rooms.ts'
import { switchRoom } from '../room/switchRoom.ts'
import { useStore } from '../state/store.ts'

/* ---------- 초대 링크 ---------- */

/** 지금 방으로 바로 들어오는 링크. */
function inviteLink(roomId: string, base: string): string {
  const url = new URL(base)
  url.search = ''
  url.hash = ''
  url.searchParams.set('room', roomId)
  return url.toString()
}

/** 주소의 `?room=`이 아는 방이면 그 방 id, 아니면 null. */
function roomFromSearch(search: string): string | null {
  const id = new URLSearchParams(search).get('room')
  return id && ROOMS.some((room) => room.id === id) ? id : null
}

/* ---------- QR 만들기 (바이트 모드, 오류 정정 L, 버전 1~6) ---------- */

// 버전별 [전체 코드워드, 블록당 정정 코드워드, 블록 수]
const VERSIONS: [number, number, number][] = [
  [26, 7, 1],
  [44, 10, 1],
  [70, 15, 1],
  [100, 20, 1],
  [134, 26, 1],
  [172, 18, 2],
]
const ALIGN = [0, 0, 18, 22, 26, 30, 34] // 버전 2~6의 정렬 무늬 중심 좌표(x=y)

const EXP = new Array<number>(512)
const LOG = new Array<number>(256)
for (let i = 0, x = 1; i < 255; i++) {
  EXP[i] = x
  LOG[x] = i
  x <<= 1
  if (x & 0x100) x ^= 0x11d
}
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255]

function gfMul(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]
}

function reedSolomon(data: number[], degree: number): number[] {
  let gen = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(gen.length + 1).fill(0)
    gen.forEach((coef, j) => {
      next[j] ^= coef
      next[j + 1] ^= gfMul(coef, EXP[i])
    })
    gen = next
  }
  const rest = new Array<number>(degree).fill(0)
  for (const byte of data) {
    const factor = byte ^ rest.shift()!
    rest.push(0)
    for (let i = 0; i < degree; i++) rest[i] ^= gfMul(gen[i + 1], factor)
  }
  return rest
}

/**
 * 글자를 QR 격자(true = 검정)로 바꾼다. 너무 길어 버전 6에 안 들어가면 null.
 * 외부 라이브러리를 늘리지 않으려고 이 파일 안에 둔 작은 구현이다.
 */
function makeQr(text: string): boolean[][] | null {
  const bytes = Array.from(new TextEncoder().encode(text))
  const version = VERSIONS.findIndex(([total, ec, blocks]) => total - ec * blocks - 2 >= bytes.length) + 1
  if (version === 0) return null
  const [total, ecPer, blocks] = VERSIONS[version - 1]
  const dataWords = total - ecPer * blocks

  const bits: number[] = []
  const push = (value: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((value >>> i) & 1)
  }
  push(0b0100, 4)
  push(bytes.length, 8)
  bytes.forEach((b) => push(b, 8))
  push(0, Math.min(4, dataWords * 8 - bits.length))
  while (bits.length % 8) bits.push(0)
  const words: number[] = []
  for (let i = 0; i < bits.length; i += 8) words.push(parseInt(bits.slice(i, i + 8).join(''), 2))
  for (let pad = 0xec; words.length < dataWords; pad ^= 0xec ^ 0x11) words.push(pad)

  const per = dataWords / blocks
  const dataBlocks = Array.from({ length: blocks }, (_, i) => words.slice(i * per, (i + 1) * per))
  const ecBlocks = dataBlocks.map((block) => reedSolomon(block, ecPer))
  const final: number[] = []
  for (let i = 0; i < per; i++) dataBlocks.forEach((block) => final.push(block[i]))
  for (let i = 0; i < ecPer; i++) ecBlocks.forEach((block) => final.push(block[i]))

  const size = version * 4 + 17
  const grid = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const fixed = Array.from({ length: size }, () => new Array<boolean>(size).fill(false))
  const set = (x: number, y: number, dark: boolean) => {
    grid[y][x] = dark
    fixed[y][x] = true
  }

  for (let i = 0; i < size; i++) {
    set(6, i, i % 2 === 0)
    set(i, 6, i % 2 === 0)
  }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || y < 0 || x >= size || y >= size) continue
        const dist = Math.max(Math.abs(dx), Math.abs(dy))
        set(x, y, dist !== 2 && dist !== 4)
      }
    }
  }
  if (version >= 2) {
    const c = ALIGN[version] // 버전 2~6은 오른쪽 아래 정렬 무늬 하나뿐이다
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) set(c + dx, c + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
    }
  }

  const drawFormat = (mask: number) => {
    const data = (1 << 3) | mask // 오류 정정 L = 01
    let rem = data
    for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537)
    const code = ((data << 10) | rem) ^ 0x5412
    const bit = (i: number) => ((code >>> i) & 1) === 1
    for (let i = 0; i <= 5; i++) set(8, i, bit(i))
    set(8, 7, bit(6))
    set(8, 8, bit(7))
    set(7, 8, bit(8))
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i))
    set(8, size - 8, true)
  }
  drawFormat(0) // 자리만 먼저 잡아 둔다

  let index = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j
        const y = ((right + 1) & 2) === 0 ? size - 1 - vert : vert
        if (fixed[y][x] || index >= final.length * 8) continue
        grid[y][x] = ((final[index >> 3] >>> (7 - (index & 7))) & 1) === 1
        index++
      }
    }
  }

  const masks = [
    (x: number, y: number) => (x + y) % 2 === 0,
    (_x: number, y: number) => y % 2 === 0,
    (x: number) => x % 3 === 0,
    (x: number, y: number) => (x + y) % 3 === 0,
    (x: number, y: number) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
    (x: number, y: number) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x: number, y: number) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
    (x: number, y: number) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
  ]
  const apply = (mask: number) => {
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (!fixed[y][x] && masks[mask](x, y)) grid[y][x] = !grid[y][x]
      }
    }
  }
  const penalty = (): number => {
    let score = 0
    const columns = grid.map((_, x) => grid.map((row) => row[x]))
    for (const row of [...grid, ...columns]) {
      let run = 1
      for (let i = 1; i <= size; i++) {
        if (i < size && row[i] === row[i - 1]) run++
        else {
          if (run >= 5) score += run - 2
          run = 1
        }
      }
    }
    for (let y = 0; y < size - 1; y++) {
      for (let x = 0; x < size - 1; x++) {
        const c = grid[y][x]
        if (c === grid[y][x + 1] && c === grid[y + 1][x] && c === grid[y + 1][x + 1]) score += 3
      }
    }
    const dark = grid.flat().filter(Boolean).length
    return score + Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10
  }

  let best = 0
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    apply(mask)
    const score = penalty()
    if (score < bestScore) {
      best = mask
      bestScore = score
    }
    apply(mask) // 되돌린다
  }
  apply(best)
  drawFormat(best)
  return grid
}

/* ---------- 화면 ---------- */

const STYLE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 'var(--space-2)',
}

type CopyState = 'idle' | 'done' | 'failed'

export default function InviteQr() {
  const roomId = useStore((state) => state.roomId)
  const [showQr, setShowQr] = useState(false)
  const [copy, setCopy] = useState<CopyState>('idle')

  // 링크(?room=)로 들어왔으면 그 방으로 간다.
  useEffect(() => {
    const target = roomFromSearch(window.location.search)
    if (target) switchRoom(target)
  }, [])

  const link = inviteLink(roomId, window.location.href)
  const qr = useMemo(() => makeQr(link), [link])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopy('done')
    } catch {
      setCopy('failed')
    }
  }

  const quiet = 4
  const total = (qr?.length ?? 0) + quiet * 2

  return (
    <div className="panel" style={STYLE}>
      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
        <button type="button" className="btn" onClick={copyLink}>
          초대 링크 복사
        </button>
        <button type="button" className="btn" onClick={() => setShowQr((v) => !v)}>
          {showQr ? 'QR 닫기' : 'QR 보기'}
        </button>
      </div>
      <span role="status">
        {copy === 'done' && '링크를 복사했어요'}
        {copy === 'failed' && '복사하지 못했어요. 아래 주소를 직접 복사해 주세요'}
      </span>
      {copy === 'failed' && <input readOnly value={link} aria-label="초대 링크" onFocus={(e) => e.target.select()} />}
      {showQr &&
        (qr ? (
          <svg
            role="img"
            aria-label="이 강의실 초대 QR"
            width={176}
            height={176}
            viewBox={`0 0 ${total} ${total}`}
            shapeRendering="crispEdges"
          >
            <rect width={total} height={total} fill="#fff" />
            {qr.flatMap((row, y) =>
              row.map((dark, x) =>
                dark ? <rect key={`${x}-${y}`} x={x + quiet} y={y + quiet} width={1} height={1} fill="#000" /> : null,
              ),
            )}
          </svg>
        ) : (
          <span>주소가 길어 QR을 만들 수 없어요. 링크 복사를 써 주세요</span>
        ))}
    </div>
  )
}
