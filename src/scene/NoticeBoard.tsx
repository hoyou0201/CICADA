import { useEffect, useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace } from 'three'
import { getNotices, type NoticesResult } from '../api/notices.ts'
import { NOTICES_EMPTY_MESSAGE, NOTICES_ERROR_MESSAGE } from '../contract/notices.ts'
import { useStore } from '../state/store.ts'
import { NOTICE_BOARD } from './layout.ts'

function boardTexture(notices: NoticesResult | null, error: boolean) {
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 800
  const FONT = "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#ac794b'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#fff6df'
    ctx.font = `bold 60px ${FONT}`
    ctx.fillText(notices?.isSample ? '학교 공지 · 샘플' : '학교 공지', 55, 70)
    ctx.font = `36px ${FONT}`
    ctx.textAlign = 'right'
    ctx.fillText('눌러서 열기', 1145, 70)
    ctx.textAlign = 'left'
    const lines = error ? [NOTICES_ERROR_MESSAGE] : notices ? notices.items.map((item) => item.title) : ['공지를 불러오는 중…']
    if (notices && !error && lines.length === 0) lines.push(NOTICES_EMPTY_MESSAGE)
    lines.slice(0, 3).forEach((line, i) => {
      const y = 130 + i * 215
      ctx.fillStyle = '#fffaf0'
      ctx.fillRect(55, y, 1090, 190)
      ctx.fillStyle = '#b34438'
      ctx.beginPath()
      ctx.arc(95, y + 30, 12, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#302b27'
      ctx.font = `bold 52px ${FONT}`
      const text = Array.from(line)
      while (text.length > 1 && ctx.measureText(text.join('')).width > 1000) text.pop()
      ctx.fillText(text.length < Array.from(line).length ? `${text.join('')}…` : line, 95, y + 110, 1010)
    })
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

export default function NoticeBoard() {
  const notices = useStore((s) => s.notices)
  const error = useStore((s) => s.noticeError)
  const setOpen = useStore((s) => s.setNoticeOpen)
  const texture = useMemo(() => boardTexture(notices, error), [notices, error])

  useEffect(() => () => texture.dispose(), [texture])
  useEffect(() => {
    let cancelled = false
    useStore.getState().setNotices(null)
    useStore.getState().setNoticeError(false)
    void getNotices().then((result) => {
      if (!cancelled) useStore.getState().setNotices(result)
    }).catch(() => {
      if (!cancelled) useStore.getState().setNoticeError(true)
    })
    return () => { cancelled = true }
  }, [])

  const [width, height] = NOTICE_BOARD.size
  return (
    <group position={NOTICE_BOARD.position} rotation={[0, NOTICE_BOARD.rotationY, 0]} onClick={(event) => { event.stopPropagation(); setOpen(true) }}
      onPointerOver={() => { document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}>
      <mesh>
        <boxGeometry args={[width + 0.14, height + 0.14, 0.08]} />
        <meshStandardMaterial color="#694829" />
      </mesh>
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  )
}
