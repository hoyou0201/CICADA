import { useEffect, useMemo, useState } from 'react'
import { CanvasTexture, SRGBColorSpace, VideoTexture } from 'three'
import { useScreenShare } from '../screen/useScreenShare.ts'
import { BLACKBOARD } from './layout.ts'

const EMPTY_TEXT = '강의를 골라 칠판에 띄우세요'
const FRAME = 0.12

// 한글 글꼴을 따로 받지 않으려고 canvas에 글을 써서 텍스처로 쓴다.
function makeEmptyTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 384
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#2f4a40'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#f2f5ef'
    ctx.font = "600 56px 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(EMPTY_TEXT, canvas.width / 2, canvas.height / 2)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

// 내 화면 공유 스트림을 칠판 안에 비율을 지켜 그린다. 소리는 없고 네트워크로 보내지 않는다.
// 스트림이 바뀌거나 끝나면 이 컴포넌트가 사라지면서 video와 텍스처를 정리한다.
function StreamScreen({ stream, width, height }: { stream: MediaStream; width: number; height: number }) {
  const [aspect, setAspect] = useState(width / height)
  const { video, texture } = useMemo(() => {
    const el = document.createElement('video')
    el.muted = true
    el.playsInline = true
    const tex = new VideoTexture(el)
    tex.colorSpace = SRGBColorSpace
    return { video: el, texture: tex }
  }, [])

  useEffect(() => {
    video.srcObject = stream
    const onMeta = () => {
      if (video.videoWidth && video.videoHeight) setAspect(video.videoWidth / video.videoHeight)
    }
    video.addEventListener('loadedmetadata', onMeta)
    void video.play().catch(() => {})
    return () => {
      video.removeEventListener('loadedmetadata', onMeta)
      video.pause()
      video.srcObject = null
      texture.dispose()
    }
  }, [video, texture, stream])

  const fitWidth = Math.min(width, height * aspect)
  const fitHeight = fitWidth / aspect
  return (
    <>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#000000" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[fitWidth, fitHeight]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </>
  )
}

// 앞쪽 벽의 칠판. 공유 화면 스트림이 있으면 영상을, 없으면 안내 문구를 보여 준다.
export default function Blackboard() {
  const [width, height] = BLACKBOARD.size
  const stream = useScreenShare((state) => state.stream)
  const emptyTexture = useMemo(() => makeEmptyTexture(), [])
  useEffect(() => () => emptyTexture.dispose(), [emptyTexture])

  return (
    <group position={BLACKBOARD.position}>
      <mesh position={[0, 0, -0.01]} receiveShadow>
        <boxGeometry args={[width + FRAME * 2, height + FRAME * 2, 0.06]} />
        <meshStandardMaterial color="#8a6a46" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0, 0.03]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={emptyTexture} toneMapped={false} />
      </mesh>
      {stream && <StreamScreen stream={stream} width={width} height={height} />}
      <mesh position={[0, -height / 2 - FRAME / 2, 0.06]} castShadow>
        <boxGeometry args={[width * 0.8, 0.05, 0.1]} />
        <meshStandardMaterial color="#8a6a46" roughness={0.7} />
      </mesh>
    </group>
  )
}
