import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { SAMPLE_BADGE } from '../contract/lms.ts'
import { useStore } from '../state/store.ts'

const EMPTY_ATTENDANCE_MESSAGE = '오늘은 자리만 지켰어요'
const STORAGE_KEY = 'cicada.attendance'
const TICK_MS = 1000
/** 탭이 오래 잠들어 있어도 한 번에 하루치가 쌓이지 않게 막는다. */
const MAX_TICK_MS = 60_000
const CARD_W = 720
const CARD_H = 960

const FONT = 'Pretendard, system-ui, "Apple SD Gothic Neo", "Noto Sans KR", sans-serif'

const CARD_COLORS = {
  background: '#f4f6f2',
  surface: '#ffffff',
  text: '#1d2b24',
  muted: '#55655c',
  primary: '#1f6f54',
  sample: '#6b4fc4',
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

type AttendanceRecord = {
  date: string
  userId: number | null
  stayedMs: number
  lectureIds: string[]
}

type AttendanceCopy = {
  title: string
  dateLabel: string
  name: string | null
  sample: boolean
  stayedLabel: string
  openedLabel: string
  emptyMessage: string | null
}

const ROOT_STYLE: CSSProperties = {
  position: 'absolute',
  left: 'var(--space-4)',
  bottom: 'var(--space-4)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 'var(--space-2)',
  width: 280,
  maxWidth: 'calc(100% - var(--space-5))',
}

const CARD_STYLE: CSSProperties = {
  display: 'grid',
  gap: 'var(--space-2)',
  width: '100%',
}

function defaultStorage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

function localDateKey(now: Date): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function formatStayed(ms: number): string {
  const safe = Number.isFinite(ms) ? Math.max(0, ms) : 0
  const minutes = Math.floor(safe / 60_000)
  if (minutes < 1) return '1분 미만'
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${minutes}분`
  if (rest === 0) return `${hours}시간`
  return `${hours}시간 ${rest}분`
}

function dateLabel(date: string): string {
  const [year, month, day] = date.split('-')
  if (!year || !month || !day) return date
  return `${Number(year)}년 ${Number(month)}월 ${Number(day)}일`
}

/** 카드와 저장 이미지가 같이 쓰는 문구. 연 영상이 없으면 빈 카드 문장을 붙인다. */
function attendanceCopy(input: {
  date: string
  stayedMs: number
  openedCount: number
  name?: string | null
  sample?: boolean
}): AttendanceCopy {
  const openedCount = Number.isFinite(input.openedCount) ? Math.max(0, Math.floor(input.openedCount)) : 0
  const name = input.name?.trim() ? input.name.trim() : null
  return {
    title: '출석 카드',
    dateLabel: dateLabel(input.date),
    name,
    sample: input.sample === true,
    stayedLabel: `강의실에 머문 시간 ${formatStayed(input.stayedMs)}`,
    openedLabel: `연 영상 ${openedCount}개`,
    emptyMessage: openedCount === 0 ? EMPTY_ATTENDANCE_MESSAGE : null,
  }
}

function emptyRecord(date: string, userId: number | null): AttendanceRecord {
  return { date, userId, stayedMs: 0, lectureIds: [] }
}

function sameDay(record: AttendanceRecord, now: Date, userId: number | null): AttendanceRecord {
  const date = localDateKey(now)
  if (record.date === date && record.userId === userId) return record
  return emptyRecord(date, userId)
}

function loadAttendance(storage: StorageLike | null, now: Date, userId: number | null): AttendanceRecord {
  const date = localDateKey(now)
  if (!storage) return emptyRecord(date, userId)
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return emptyRecord(date, userId)
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return emptyRecord(date, userId)
    const rec = parsed as Partial<AttendanceRecord>
    if (rec.date !== date || rec.userId !== userId) return emptyRecord(date, userId)
    const stayedMs = typeof rec.stayedMs === 'number' && Number.isFinite(rec.stayedMs) ? Math.max(0, rec.stayedMs) : 0
    const lectureIds = Array.isArray(rec.lectureIds)
      ? [...new Set(rec.lectureIds.filter((id): id is string => typeof id === 'string' && id.length > 0))]
      : []
    return { date, userId, stayedMs, lectureIds }
  } catch {
    return emptyRecord(date, userId)
  }
}

function saveAttendance(storage: StorageLike | null, record: AttendanceRecord): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(record))
  } catch {
    // 저장이 막혀도 이번 방문의 카드는 보여 준다.
  }
}

function noteLecture(
  record: AttendanceRecord,
  lectureId: string | null,
  now: Date,
  userId: number | null,
): AttendanceRecord {
  const base = sameDay(record, now, userId)
  if (!lectureId || base.lectureIds.includes(lectureId)) return base
  return { ...base, lectureIds: [...base.lectureIds, lectureId] }
}

function addStay(record: AttendanceRecord, deltaMs: number, now: Date, userId: number | null): AttendanceRecord {
  const base = sameDay(record, now, userId)
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return base
  const added = Math.min(deltaMs, MAX_TICK_MS)
  return { ...base, stayedMs: base.stayedMs + added }
}

function readColors(): typeof CARD_COLORS {
  if (typeof document === 'undefined') return CARD_COLORS
  const style = getComputedStyle(document.documentElement)
  const pick = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  return {
    background: pick('--color-bg', CARD_COLORS.background),
    surface: pick('--color-surface', CARD_COLORS.surface),
    text: pick('--color-text', CARD_COLORS.text),
    muted: pick('--color-text-muted', CARD_COLORS.muted),
    primary: pick('--color-primary', CARD_COLORS.primary),
    sample: pick('--color-sample', CARD_COLORS.sample),
  }
}

/** 화면에 보이는 문구와 같은 내용의 출석 카드 이미지. */
function drawAttendanceCard(
  ctx: CanvasRenderingContext2D,
  copy: AttendanceCopy,
  colors: typeof CARD_COLORS = CARD_COLORS,
): void {
  ctx.clearRect(0, 0, CARD_W, CARD_H)
  ctx.fillStyle = colors.background
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  ctx.fillStyle = colors.surface
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') ctx.roundRect(36, 36, CARD_W - 72, CARD_H - 72, 28)
  else ctx.rect(36, 36, CARD_W - 72, CARD_H - 72)
  ctx.fill()
  ctx.fillStyle = colors.primary
  ctx.fillRect(36, 36, CARD_W - 72, 18)

  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = colors.text
  ctx.font = `700 52px ${FONT}`
  ctx.fillText(copy.title, 72, 150, CARD_W - 144)

  ctx.fillStyle = colors.muted
  ctx.font = `400 28px ${FONT}`
  ctx.fillText(copy.dateLabel, 72, 204, CARD_W - 144)

  let y = 280
  if (copy.name) {
    ctx.fillStyle = colors.text
    ctx.font = `700 40px ${FONT}`
    ctx.fillText(copy.name, 72, y, CARD_W - 144)
    y += 64
  }
  if (copy.sample) {
    ctx.fillStyle = colors.sample
    ctx.font = `700 24px ${FONT}`
    ctx.fillText(SAMPLE_BADGE, 72, y, CARD_W - 144)
    y += 52
  }

  ctx.fillStyle = colors.text
  ctx.font = `700 34px ${FONT}`
  ctx.fillText(copy.stayedLabel, 72, y, CARD_W - 144)
  y += 64
  ctx.fillText(copy.openedLabel, 72, y, CARD_W - 144)

  if (copy.emptyMessage) {
    y += 96
    ctx.fillStyle = colors.primary
    ctx.font = `700 36px ${FONT}`
    ctx.fillText(copy.emptyMessage, 72, y, CARD_W - 144)
  }
}

function attendancePng(copy: AttendanceCopy): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return Promise.resolve(null)
  drawAttendanceCard(ctx, copy, readColors())
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * 강의실에 머문 시간과 오늘 연 영상 수를 카드로 보여주고 이미지로 저장한다.
 * 이 카드가 강의실 화면에 떠 있는 동안만 시간을 센다. 연 영상이 없으면 빈 카드 문장을 보여 준다.
 */
export default function AttendanceCard() {
  const userId = useStore((s) => s.session?.userId ?? null)
  const name = useStore((s) => s.session?.fullName ?? null)
  const sample = useStore((s) => s.session?.isSample === true)
  const lectureId = useStore((s) => s.selectedLecture?.id ?? null)
  const [open, setOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [record, setRecord] = useState<AttendanceRecord>(() =>
    noteLecture(loadAttendance(defaultStorage(), new Date(), userId), lectureId, new Date(), userId),
  )
  const [seen, setSeen] = useState(`${userId ?? ''}|${lectureId ?? ''}`)
  const lastTick = useRef(0)

  // 강의실 화면만 이 카드를 올린다. 앱의 화면 값은 저장소에 들어가지 않아서, 떠 있는 동안을 머문 시간으로 센다.
  const seenNow = `${userId ?? ''}|${lectureId ?? ''}`
  if (seenNow !== seen) {
    setSeen(seenNow)
    setRecord((prev) => noteLecture(prev, lectureId, new Date(), userId))
  }

  useEffect(() => {
    saveAttendance(defaultStorage(), record)
  }, [record])

  useEffect(() => {
    lastTick.current = Date.now()
    const timer = window.setInterval(() => {
      const nowMs = Date.now()
      const delta = nowMs - lastTick.current
      lastTick.current = nowMs
      const now = new Date()
      setRecord((prev) => addStay(prev, delta, now, userId))
    }, TICK_MS)
    return () => window.clearInterval(timer)
  }, [userId])

  const copy = attendanceCopy({
    date: record.date,
    stayedMs: record.stayedMs,
    openedCount: record.lectureIds.length,
    name,
    sample,
  })

  async function onSave() {
    setSaveError(null)
    try {
      const blob = await attendancePng(copy)
      if (!blob) {
        setSaveError('이미지를 저장하지 못했어요')
        return
      }
      downloadBlob(blob, `출석카드-${record.date}.png`)
    } catch {
      setSaveError('이미지를 저장하지 못했어요')
    }
  }

  return (
    <div style={ROOT_STYLE}>
      {open && (
        <section className="panel" style={CARD_STYLE} role="dialog" aria-label="출석 카드">
          <h2 className="panel-title" style={{ margin: 0 }}>{copy.title}</h2>
          <p className="text-muted" style={{ margin: 0 }}>{copy.dateLabel}</p>
          {copy.name && <strong>{copy.name}</strong>}
          {copy.sample && <span className="badge badge-sample">{SAMPLE_BADGE}</span>}
          <p style={{ margin: 0 }}>{copy.stayedLabel}</p>
          <p style={{ margin: 0 }}>{copy.openedLabel}</p>
          {copy.emptyMessage && <p style={{ margin: 0, fontWeight: 'var(--font-weight-bold)' }}>{copy.emptyMessage}</p>}
          {saveError && <p role="alert" style={{ margin: 0 }}>{saveError}</p>}
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" className="btn" onClick={() => void onSave()}>이미지로 저장</button>
            <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>닫기</button>
          </div>
        </section>
      )}
      <button
        type="button"
        className="btn btn-secondary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        출석 카드
      </button>
    </div>
  )
}
