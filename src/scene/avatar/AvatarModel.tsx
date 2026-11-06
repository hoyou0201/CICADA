import { Html } from '@react-three/drei'
import type { AvatarLook, PresenceStatus } from '../../contract/room'
import { useReactions } from '../../room/reactions'
import { getPreset } from './presets'
import GlbAvatar, { AVATAR_HEIGHT } from './GlbAvatar'
import Reaction from './Reaction'

export const WATCHING_LABEL = '수강 중'

type Props = {
  nickname: string
  avatar: AvatarLook
  status: PresenceStatus
  /** 움직이는 중이면 걷는 동작, 아니면 가만히 서 있는 동작 */
  moving?: boolean
  /** 이 아바타가 나라면 true. 내가 보낸 리액션(저장소 selfKey)으로 끄덕·손들기·Zzz를 보여 준다 */
  isSelf?: boolean
  /** 다른 사람 아바타면 그 사람의 presence key. 받은 리액션으로 끄덕·손들기·Zzz를 보여 준다 */
  reactionKey?: string
}

const LABEL_GAP = 0.35

/** 원점이 발 아래인 GLB 캐릭터 아바타. 위치와 회전은 부모 group이 정한다. */
export default function AvatarModel({ nickname, avatar, status, moving = false, isSelf = false, reactionKey }: Props) {
  const selfKey = useReactions((state) => state.selfKey)
  const preset = getPreset(avatar.preset)
  const away = status === 'away'

  return (
    <group>
      <Reaction reactionKey={isSelf ? selfKey : reactionKey}>
        {(reaction) => (
          <GlbAvatar
            url={preset.model}
            idleClip={preset.idleClip}
            activeClip={preset.walkClip}
            overrideClip={reaction === 'hand' ? preset.handClip : undefined}
            moving={moving}
            away={away}
          />
        )}
      </Reaction>
      <Html position={[0, AVATAR_HEIGHT + LABEL_GAP, 0]} center distanceFactor={8} zIndexRange={[0, 0]} style={{ pointerEvents: 'none' }}>
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
