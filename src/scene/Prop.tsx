import { useGLTF } from '@react-three/drei'
import { Suspense, useMemo } from 'react'
import type { Mesh } from 'three'
import { GlbBoundary } from './avatar/GlbAvatar.tsx'
import type { Vec3 } from './layout.ts'

type Props = {
  /** `public/models/props/` 안의 파일 이름(확장자 제외) */
  name: string
  position?: Vec3
  rotationY?: number
  scale?: number | Vec3
}

function PropModel({ name, position, rotationY = 0, scale = 1 }: Props) {
  const { scene } = useGLTF(`/models/props/${name}.glb`)
  // 같은 모델을 여러 번 놓을 수 있게 복제하고, 그림자를 받고 드리운다.
  const object = useMemo(() => {
    const copy = scene.clone(true)
    copy.traverse((child) => {
      const mesh = child as Mesh
      if (mesh.isMesh) mesh.castShadow = mesh.receiveShadow = true
    })
    return copy
  }, [scene])
  return <primitive object={object} position={position} rotation={[0, rotationY, 0]} scale={scale} />
}

/** 강의실 소품 GLB 하나. 못 불러오면 그 소품만 빠지고 나머지는 그대로 그린다. */
export default function Prop(props: Props) {
  return (
    <GlbBoundary key={props.name}>
      <Suspense fallback={null}>
        <PropModel {...props} />
      </Suspense>
    </GlbBoundary>
  )
}
