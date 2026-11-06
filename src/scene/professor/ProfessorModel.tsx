import GlbAvatar from '../avatar/GlbAvatar'

type Props = {
  /** 말하는 중이면 말하는 동작을 재생한다 */
  speaking?: boolean
}

/** 학생 아바타(키 약 1.46m)보다 조금 크다. 원점은 발 아래. */
export const PROFESSOR_HEIGHT = 1.75

const PROFESSOR_GLB = '/models/professor-elder.glb'

/** 교수님 GLB(Chibi People Starter `person-elder-a`, Absurdox Lab). 가만히 있을 땐 Idle, 말하는 중엔 emote-yes(끄덕임)를 재생한다. 위치와 회전은 부모 group이 정한다. */
export default function ProfessorModel({ speaking = false }: Props) {
  return (
    <GlbAvatar
      url={PROFESSOR_GLB}
      height={PROFESSOR_HEIGHT}
      idleClip="idle"
      activeClip="emote-yes"
      moving={speaking}
    />
  )
}
