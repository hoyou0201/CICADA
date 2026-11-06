import { Html } from '@react-three/drei'
import type { AvatarLook, PresenceStatus } from '../../contract/room'
import { DEFAULT_AVATAR_COLOR, getPreset } from './presets'
import { useWalkAnim } from './useWalkAnim'

export const WATCHING_LABEL = '수강 중'

type Props = {
  nickname: string
  avatar: AvatarLook
  status: PresenceStatus
  /** 움직이는 중이면 통통 튀고, 아니면 숨쉬듯 움직인다 */
  moving?: boolean
}

const FACE_COLOR = '#2b2b3a'
const AWAY_OPACITY = 0.5

/** 원점이 발 아래인 캡슐·구 조합 아바타. 위치와 회전은 부모 group이 정한다. */
export default function AvatarModel({ nickname, avatar, status, moving = false }: Props) {
  const bodyRef = useWalkAnim(moving)
  const preset = getPreset(avatar.preset)
  const color = avatar.color || DEFAULT_AVATAR_COLOR
  const { body, head, eye } = preset

  const bodyCenterY = body.radius + body.length / 2
  const headY = body.radius * 2 + body.length + head.radius * 0.6
  const labelY = headY + head.radius + 0.2
  const away = status === 'away'

  return (
    <group>
      <group ref={bodyRef}>
        <mesh position={[0, bodyCenterY, 0]}>
          <capsuleGeometry args={[body.radius, body.length, 8, 16]} />
          <meshStandardMaterial color={color} transparent={away} opacity={away ? AWAY_OPACITY : 1} />
        </mesh>
        <mesh position={[0, headY, 0]}>
          <sphereGeometry args={[head.radius, 24, 16]} />
          <meshStandardMaterial color={color} transparent={away} opacity={away ? AWAY_OPACITY : 1} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * eye.spacing, headY + 0.03, head.radius * 0.9]}>
            <sphereGeometry args={[eye.radius, 12, 8]} />
            <meshStandardMaterial color={FACE_COLOR} />
          </mesh>
        ))}
      </group>
      <Html position={[0, labelY, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
        <div style={{ textAlign: 'center', whiteSpace: 'nowrap', fontSize: 14 }}>
          <div
            style={{
              background: 'rgba(0,0,0,0.6)',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: 8,
            }}
          >
            {nickname}
          </div>
          {status === 'watching' && (
            <div
              style={{
                marginTop: 2,
                background: '#2f9e44',
                color: '#fff',
                padding: '1px 6px',
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              {WATCHING_LABEL}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}
