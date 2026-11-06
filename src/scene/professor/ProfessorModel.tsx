import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'

type Props = {
  /** 말하는 중이면 고개를 끄덕이고 손을 흔든다 */
  speaking?: boolean
}

/** 학생 아바타(키 약 1.46m)보다 조금 크다. 원점은 발 아래. */
export const PROFESSOR_HEIGHT = 1.75

const SKIN = '#f1c9a5'
const JACKET = '#3b3f58'
const SHIRT = '#f3f3f0'
const PANTS = '#2a2a33'
const HAIR = '#d9d9de'
const GLASSES = '#1c1c22'

const TALK_SPEED = 9
const NOD_ANGLE = 0.12
const GESTURE_ANGLE = 0.5
const BREATH_SPEED = 2
const BREATH_SCALE = 0.02
const BLEND_SPEED = 8

/** 말하기 weight(0~1)에 따른 고개 끄덕임, 손 흔들림, 숨쉬기 배율. 시간 t는 초. */
export function professorPose(
  t: number,
  talk: number,
): { nod: number; gesture: number; scaleY: number } {
  return {
    nod: Math.sin(t * TALK_SPEED) * NOD_ANGLE * talk,
    gesture: (Math.sin(t * TALK_SPEED * 0.5) * 0.5 + 0.5) * GESTURE_ANGLE * talk,
    scaleY: 1 + Math.sin(t * BREATH_SPEED) * BREATH_SCALE * (1 - talk),
  }
}

/** 안경 쓰고 재킷을 입은 교수님. 위치와 회전은 부모 group이 정한다. */
export default function ProfessorModel({ speaking = false }: Props) {
  const bodyRef = useRef<Group>(null)
  const headRef = useRef<Group>(null)
  const armRef = useRef<Group>(null)
  const talk = useRef(0)

  useFrame(({ clock }, delta) => {
    talk.current += ((speaking ? 1 : 0) - talk.current) * Math.min(1, delta * BLEND_SPEED)
    const pose = professorPose(clock.elapsedTime, talk.current)
    if (bodyRef.current) bodyRef.current.scale.y = pose.scaleY
    if (headRef.current) headRef.current.rotation.x = pose.nod
    if (armRef.current) armRef.current.rotation.x = -pose.gesture
  })

  return (
    <group ref={bodyRef}>
      {/* 다리 */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.12, 0.4, 0]}>
          <capsuleGeometry args={[0.1, 0.5, 6, 12]} />
          <meshStandardMaterial color={PANTS} />
        </mesh>
      ))}
      {/* 재킷 몸통 */}
      <mesh position={[0, 1.07, 0]}>
        <capsuleGeometry args={[0.3, 0.4, 8, 16]} />
        <meshStandardMaterial color={JACKET} />
      </mesh>
      {/* 셔츠 깃 */}
      <mesh position={[0, 1.2, 0.2]}>
        <boxGeometry args={[0.18, 0.4, 0.14]} />
        <meshStandardMaterial color={SHIRT} />
      </mesh>
      {/* 왼팔 */}
      <mesh position={[-0.38, 1.0, 0]} rotation={[0, 0, 0.12]}>
        <capsuleGeometry args={[0.08, 0.5, 6, 12]} />
        <meshStandardMaterial color={JACKET} />
      </mesh>
      {/* 오른팔: 어깨를 축으로 흔든다 */}
      <group ref={armRef} position={[0.38, 1.3, 0]}>
        <mesh position={[0, -0.3, 0]} rotation={[0, 0, -0.12]}>
          <capsuleGeometry args={[0.08, 0.5, 6, 12]} />
          <meshStandardMaterial color={JACKET} />
        </mesh>
        <mesh position={[0.03, -0.66, 0]}>
          <sphereGeometry args={[0.08, 12, 8]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
      </group>
      {/* 머리 */}
      <group ref={headRef} position={[0, 1.5, 0]}>
        <mesh>
          <sphereGeometry args={[0.26, 24, 16]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
        {/* 흰 머리 */}
        <mesh position={[0, 0.07, -0.04]} scale={[1, 0.8, 1]}>
          <sphereGeometry args={[0.275, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial color={HAIR} />
        </mesh>
        {/* 안경: 알 두 개와 다리 */}
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.1, 0.02, 0.24]}>
            <torusGeometry args={[0.065, 0.012, 8, 20]} />
            <meshStandardMaterial color={GLASSES} />
          </mesh>
        ))}
        <mesh position={[0, 0.03, 0.245]}>
          <boxGeometry args={[0.06, 0.012, 0.012]} />
          <meshStandardMaterial color={GLASSES} />
        </mesh>
        {/* 코 */}
        <mesh position={[0, -0.04, 0.26]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color={SKIN} />
        </mesh>
      </group>
    </group>
  )
}
