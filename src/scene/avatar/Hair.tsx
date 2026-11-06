import type { HairStyle } from './presets'

type Props = { style: HairStyle; radius: number; away: boolean }

/** 머리 중심을 원점으로 한 단순한 머리 모양. */
export default function Hair({ style, radius, away }: Props) {
  const material = { color: '#3b2a29', transparent: away, opacity: away ? 0.5 : 1 }
  return (
    <group>
      <mesh position={[0, radius * 0.48, -radius * 0.06]} scale={[1.02, 0.65, 1.02]}>
        <sphereGeometry args={[radius, 20, 12]} />
        <meshStandardMaterial {...material} />
      </mesh>
      {style === 'bob' && [-1, 1].map((side) => (
        <mesh key={side} position={[side * radius * 0.8, -radius * 0.25, -radius * 0.12]}>
          <capsuleGeometry args={[radius * 0.25, radius * 0.75, 6, 12]} />
          <meshStandardMaterial {...material} />
        </mesh>
      ))}
      {style === 'spiky' && [-1, 0, 1].map((side) => (
        <mesh key={side} position={[side * radius * 0.55, radius * 1.05, 0]}>
          <coneGeometry args={[radius * 0.3, radius * 0.55, 8]} />
          <meshStandardMaterial {...material} />
        </mesh>
      ))}
      {style === 'pigtails' && [-1, 1].map((side) => (
        <mesh key={side} position={[side * radius * 1.08, 0, -radius * 0.1]} scale={[0.6, 1, 0.6]}>
          <sphereGeometry args={[radius * 0.55, 16, 12]} />
          <meshStandardMaterial {...material} />
        </mesh>
      ))}
    </group>
  )
}
