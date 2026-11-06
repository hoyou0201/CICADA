import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { OrthographicCamera, PerspectiveCamera, Vector3, type Camera, type Group } from 'three'

/**
 * 3D 장면 위의 한 지점에 HTML(이름표·버튼·말풍선)을 붙인다. drei의 `Html`(비변환 모드)과 같은 모양으로
 * 쓰되 `position`, `center`, `distanceFactor`, `zIndexRange`, `style`만 지원한다.
 *
 * drei `Html`은 정리할 때 자기 React root를 그 자리에서 바로 닫는다(`root.unmount()`). React가 화면을
 * 그리는 도중(StrictMode가 효과를 한 번 껐다 켜는 때, 가까이 가면 나타나는 버튼이 사라지는 때 등)에
 * 불리면 `Attempted to synchronously unmount a root while React was already rendering` 오류가 나고,
 * 이미 떼어진 노드를 또 떼려다 `removeChild` 오류가 나기도 한다. 여기서는 root 닫기를 렌더가 끝난
 * 뒤(microtask)로 미루고 노드는 `remove()`로 안전하게 뗀다.
 */

const objectPos = new Vector3()
const cameraPos = new Vector3()
const cameraDir = new Vector3()

type Props = {
  /** 부모 group 기준 위치 */
  position?: [number, number, number]
  /** true면 위치를 HTML의 가운데에 맞춘다 */
  center?: boolean
  /** 있으면 카메라와의 거리에 따라 크기를 줄이고 키운다(클수록 크게 보인다) */
  distanceFactor?: number
  /** [가장 가까울 때, 가장 멀 때]의 z-index */
  zIndexRange?: [number, number]
  style?: CSSProperties
  children: ReactNode
}

function isBehindCamera(object: Group, camera: Camera): boolean {
  objectPos.setFromMatrixPosition(object.matrixWorld)
  cameraPos.setFromMatrixPosition(camera.matrixWorld)
  camera.getWorldDirection(cameraDir)
  return objectPos.sub(cameraPos).angleTo(cameraDir) > Math.PI / 2
}

function objectScale(object: Group, camera: Camera): number {
  if (camera instanceof OrthographicCamera) return camera.zoom
  if (camera instanceof PerspectiveCamera) {
    objectPos.setFromMatrixPosition(object.matrixWorld)
    cameraPos.setFromMatrixPosition(camera.matrixWorld)
    const distance = objectPos.distanceTo(cameraPos)
    return 1 / (2 * Math.tan((camera.fov * Math.PI) / 360) * distance)
  }
  return 1
}

function objectZIndex(object: Group, camera: Camera, range: [number, number]): number | undefined {
  if (!(camera instanceof PerspectiveCamera || camera instanceof OrthographicCamera)) return undefined
  objectPos.setFromMatrixPosition(object.matrixWorld)
  cameraPos.setFromMatrixPosition(camera.matrixWorld)
  const distance = objectPos.distanceTo(cameraPos)
  const a = (range[1] - range[0]) / (camera.far - camera.near)
  const b = range[1] - a * camera.far
  return Math.round(a * distance + b)
}

export default function SafeHtml({
  position,
  center,
  distanceFactor,
  zIndexRange = [16777271, 0],
  style,
  children,
}: Props) {
  const { gl, camera, size, events } = useThree()
  const group = useRef<Group>(null)
  const element = useRef<HTMLDivElement | null>(null)
  const root = useRef<Root | null>(null)
  const target = events.connected || gl.domElement.parentNode

  // 장면과 같은 부모 아래에 HTML을 담을 div와 React root를 만든다.
  useLayoutEffect(() => {
    const el = document.createElement('div')
    el.style.cssText = 'position:absolute;top:0;left:0;transform-origin:0 0;'
    const currentRoot = createRoot(el)
    element.current = el
    root.current = currentRoot
    target?.appendChild(el)
    return () => {
      element.current = null
      root.current = null
      el.remove()
      // 렌더·커밋 도중에 root를 닫으면 React가 오류를 내므로 끝난 뒤에 닫는다.
      queueMicrotask(() => currentRoot.unmount())
    }
  }, [target])

  // 렌더할 때마다 내용을 다시 그린다.
  useLayoutEffect(() => {
    root.current?.render(
      <div style={{ position: 'absolute', transform: center ? 'translate3d(-50%,-50%,0)' : 'none', ...style }}>
        {children}
      </div>,
    )
  })

  // 매 프레임, 3D 위치를 화면 좌표로 바꿔 HTML을 옮긴다.
  useFrame(() => {
    const object = group.current
    const el = element.current
    if (!object || !el) return
    camera.updateMatrixWorld()
    object.updateWorldMatrix(true, false)

    const display = isBehindCamera(object, camera) ? 'none' : 'block'
    if (el.style.display !== display) el.style.display = display

    objectPos.setFromMatrixPosition(object.matrixWorld).project(camera)
    const x = objectPos.x * (size.width / 2) + size.width / 2
    const y = -(objectPos.y * (size.height / 2)) + size.height / 2
    const scale = distanceFactor === undefined ? 1 : objectScale(object, camera) * distanceFactor
    el.style.transform = `translate3d(${x}px,${y}px,0) scale(${scale})`
    el.style.zIndex = `${objectZIndex(object, camera, zIndexRange)}`
  })

  return <group ref={group} position={position} />
}
