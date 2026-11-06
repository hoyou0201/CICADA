import { useAnimations, useGLTF } from '@react-three/drei'
import { Component, Suspense, useEffect, useMemo, type ReactNode } from 'react'
import { AnimationMixer, Box3, Vector3, type Material, type Mesh, type SkinnedMesh } from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

/** 기본 도형 아바타와 키를 맞춘다(약 1.46m). 원점은 발 아래. */
export const AVATAR_HEIGHT = 1.46
const AWAY_OPACITY = 0.5
const FADE = 0.2

type Props = {
  /** GLB 파일 주소(예: `/models/student-1.glb`) */
  url: string
  /** 움직이는 중이면 모델의 첫 애니메이션(걷기)을 재생한다 */
  moving?: boolean
  away?: boolean
  /** 불러오는 동안, 그리고 불러오기에 실패했을 때 대신 그릴 기본 도형 아바타 */
  fallback: ReactNode
}

type BoundaryProps = { fallback: ReactNode; children: ReactNode }

/** GLB를 못 불러오면(없는 파일, 깨진 파일, 네트워크 오류) 기본 도형으로 대체한다. */
class GlbBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.warn('GLB 아바타를 불러오지 못해 기본 아바타로 대체합니다.', error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function GlbModel({ url, moving = false, away = false }: Omit<Props, 'fallback'>) {
  const gltf = useGLTF(url)

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
    if (gltf.animations[0]) probe.clipAction(gltf.animations[0]).play()
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
    return { root: copy, scale: size.y > 0 ? AVATAR_HEIGHT / size.y : 1 }
  }, [gltf.scene, gltf.animations])

  const { actions, names } = useAnimations(gltf.animations, root)

  useEffect(() => {
    const action = actions[names[0]]
    if (!action) return
    if (moving) action.reset().fadeIn(FADE).play()
    else action.fadeOut(FADE)
  }, [actions, names, moving])

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

/** 프리셋이 가리키는 GLB 모델을 그린다. 위치와 회전은 부모 group이 정한다. */
export default function GlbAvatar({ url, moving, away, fallback }: Props) {
  return (
    <GlbBoundary key={url} fallback={fallback}>
      <Suspense fallback={fallback}>
        <GlbModel url={url} moving={moving} away={away} />
      </Suspense>
    </GlbBoundary>
  )
}
