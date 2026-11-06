import { useAnimations, useGLTF } from '@react-three/drei'
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { AnimationMixer, Box3, Vector3, type AnimationAction, type Material, type Mesh, type SkinnedMesh } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

/** 기본 도형 아바타와 키를 맞춘다(약 1.46m). 원점은 발 아래. */
export const AVATAR_HEIGHT = 1.46
const AWAY_OPACITY = 0.5
const FADE = 0.2

type Props = {
  /** GLB 파일 주소(예: `/models/student-schoolkid.glb`) */
  url: string
  /** 움직이는 중이면 `activeClip`(없으면 모델의 첫 애니메이션, 걷기)을 재생한다 */
  moving?: boolean
  /** 가만히 있을 때 반복 재생할 애니메이션 이름. 없으면 멈춘다 */
  idleClip?: string
  /** 움직이는 중일 때 재생할 애니메이션 이름 */
  activeClip?: string
  /** 모델 키(m). 기본은 학생 아바타 키 */
  height?: number
  away?: boolean
  /** 있으면 이 동작을 다른 동작보다 먼저 재생한다(리액션) */
  overrideClip?: string
}

type BoundaryProps = { children: ReactNode }

/** GLB를 못 불러오면(없는 파일, 깨진 파일, 네트워크 오류) 아무것도 그리지 않고 경고만 남긴다. */
export class GlbBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('GLB 아바타를 불러오지 못했습니다.', error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function GlbModel({ url, moving = false, away = false, idleClip, activeClip, overrideClip, height = AVATAR_HEIGHT }: Props) {
  const gltf = useGLTF(url)
  const clips = gltf.animations

  // 같은 모델을 쓰는 아바타가 여러 명이어도 서로 섞이지 않게 복제한다.
  const { root, scale } = useMemo(() => {
    const copy = clone(gltf.scene)
    copy.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      mesh.material = Array.isArray(mesh.material)
        ? mesh.material.map((material: Material) => material.clone())
        : mesh.material.clone()
    })
    // 스킨 모델은 기본 자세가 눕거나 접혀 있을 수 있다. 애니메이션 첫 장면의 자세로 키를 잰다.
    const probe = new AnimationMixer(copy)
    if (clips[0]) probe.clipAction(clips[0]).play()
    probe.update(0)
    copy.updateMatrixWorld(true)
    copy.traverse((object) => {
      if ((object as SkinnedMesh).isSkinnedMesh) (object as SkinnedMesh).skeleton.update()
    })
    const box = new Box3().setFromObject(copy, true)
    probe.stopAllAction()
    probe.uncacheRoot(copy)
    const size = box.getSize(new Vector3())
    const center = box.getCenter(new Vector3())
    copy.position.set(-center.x, -box.min.y, -center.z)
    return { root: copy, scale: size.y > 0 ? height / size.y : 1 }
  }, [gltf.scene, clips, height])

  const { actions, names } = useAnimations(clips, root)

  const current = useRef<AnimationAction | undefined>(undefined)
  useEffect(() => {
    const name = overrideClip ?? (moving ? (activeClip ?? names[0]) : idleClip)
    const next = name ? actions[name] ?? undefined : undefined
    const previous = current.current
    if (previous && previous !== next) previous.fadeOut(FADE)
    // 개발 모드(StrictMode)에서 정리 단계가 동작을 멈출 수 있어서, 멈춰 있으면 다시 재생한다.
    if (next && (next !== previous || !next.isRunning())) next.reset().fadeIn(FADE).play()
    current.current = next
  }, [actions, names, moving, idleClip, activeClip, overrideClip])

  useEffect(() => {
    root.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const material of materials) {
        material.transparent = away
        material.opacity = away ? AWAY_OPACITY : 1
      }
    })
  }, [root, away])

  return (
    <group scale={scale}>
      <primitive object={root} />
    </group>
  )
}

/** 프리셋이 가리키는 GLB 모델을 그린다. 불러오는 동안은 비어 있다. 위치와 회전은 부모 group이 정한다. */
export default function GlbAvatar(props: Props) {
  return (
    <GlbBoundary key={props.url}>
      <Suspense fallback={null}>
        <GlbModel {...props} />
      </Suspense>
    </GlbBoundary>
  )
}
