import Html from './SafeHtml.tsx'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect } from 'react'
import type { Navigate } from '../App.tsx'
import { useStore, type Position } from '../state/store.ts'
import { EXIT_DOOR } from './layout.ts'
import { isTypingTarget } from './player/usePlayerControls.ts'

/**
 * 강의실 출입문. 문틀과 어두운 틈은 Room이 그린다.
 * 여기서는 문짝과, 가까이 갔을 때 뜨는 '복도로 나가기'만 맡는다.
 */

const DOOR_WOOD = '#5c432e'
const GLASS = '#bfe0f2'

/** 내 위치가 출입문 앞(enterRadius 안)인가. */
export function isNearExit(position: Position): boolean {
  const [x, , z] = EXIT_DOOR.position
  return Math.hypot(position.x - x, position.z - z) <= EXIT_DOOR.enterRadius
}

type Props = { navigate: Navigate }

export default function ExitDoor({ navigate }: Props) {
  const near = useStore((state) => isNearExit(state.position))
  const [width, height] = EXIT_DOOR.size
  const [x, , z] = EXIT_DOOR.position

  useEffect(() => {
    if (!near) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyE' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      navigate('campus')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [near, navigate])

  const onClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (isNearExit(useStore.getState().position)) navigate('campus')
  }

  return (
    <group position={[x + 0.02, 0, z]} rotation={[0, EXIT_DOOR.rotationY, 0]}>
      <mesh position={[0, height / 2, 0.05]} castShadow onClick={onClick}>
        <boxGeometry args={[width * 0.92, height * 0.96, 0.06]} />
        <meshStandardMaterial color={DOOR_WOOD} roughness={0.75} />
      </mesh>
      <mesh position={[0, height - 0.42, 0.09]}>
        <planeGeometry args={[width * 0.5, 0.32]} />
        <meshStandardMaterial color={GLASS} emissive={GLASS} emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, height / 2, 0.12]} onClick={onClick}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {near && (
        <Html position={[0, 1.35, 0.45]} center distanceFactor={7}>
          <button type="button" className="btn" onClick={() => navigate('campus')}>
            복도로 나가기
          </button>
        </Html>
      )}
    </group>
  )
}
