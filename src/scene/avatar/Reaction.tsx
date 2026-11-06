import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CanvasTexture, SRGBColorSpace, type Group, type Sprite } from 'three'
import { useReactions, type ReactionKind } from '../../room/reactions'

/**
 * 아바타의 리액션 동작. 리액션을 받으면(내 것 포함) 그 아바타가 2초 동안
 * 끄덕이거나(끄덕), 손을 들거나(손들기: 모델의 손들기 동작), Zzz를 띄운다(졸기).
 * 저장소(`useReactions`)의 리액션은 더 오래 남아 있어도(버튼 눌림 표시용) 동작은 2초만 한다.
 *
 * 사용: `<Reaction reactionKey=…>{(reaction) => 모델}</Reaction>`. 몸을 감싼 group이
 * '끄덕'일 때 숙였다 들고, 손들기 동작은 모델이 재생하며, Zzz는 그 옆에 덧붙는다.
 */

const REACTION_EFFECT_MS = 2000
const EFFECT_SECONDS = REACTION_EFFECT_MS / 1000

type ActiveReaction = { kind: ReactionKind; at: number }

// 모델 키(AVATAR_HEIGHT) 기준 위치. 이름표 아래, 머리 옆에서 Zzz가 시작한다.
const HEAD_SIDE = 0.3
const ZZZ_BASE_Y = 1.25
const NOD_PIVOT_Y = 0.4

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** 끄덕임: 2초 동안 상체를 앞으로 두 번 숙였다 든다(뒤로 젖히지는 않는다). */
function nodAngle(progress: number): number {
  const p = clamp01(progress)
  return Math.abs(Math.sin(p * Math.PI * 2)) * 0.5 * (1 - p * 0.3)
}

/**
 * 이 아바타의 리액션이 지금 재생 중이면 그것을, 아니면 null을 돌려준다.
 * 새 리액션이 오면 처음부터 다시 재생한다. key가 없으면 항상 null.
 */
function useActiveReaction(key: string | undefined): ActiveReaction | null {
  const reaction = useReactions((state) => (key === undefined ? undefined : state.reactions[key]))
  const [finishedAt, setFinishedAt] = useState<number | null>(null)

  // 재생 시작 후 2초가 지나면 그 리액션은 끝난 것으로 표시한다(저장소에는 더 남아 있을 수 있다).
  useEffect(() => {
    if (!reaction) return
    const timer = setTimeout(() => setFinishedAt(reaction.at), REACTION_EFFECT_MS)
    return () => clearTimeout(timer)
  }, [reaction])

  return reaction && reaction.at !== finishedAt ? { kind: reaction.kind, at: reaction.at } : null
}

/** 새 리액션이 시작된 시각(clock)을 기억해, 시작부터 흐른 비율(0~1)을 돌려주는 함수를 만든다. */
function useProgress() {
  const start = useRef<{ at: number; time: number } | null>(null)
  return (active: ActiveReaction, elapsed: number) => {
    if (!start.current || start.current.at !== active.at) start.current = { at: active.at, time: elapsed }
    return (elapsed - start.current.time) / EFFECT_SECONDS
  }
}

// 글꼴을 따로 받지 않으려고 canvas에 글자를 그려 스프라이트로 쓴다(Html 대신: 정리할 때 별도 root가 생기지 않게).
function makeLetterTexture(letter: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.font = "700 76px 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 8
    ctx.strokeStyle = '#ffffff'
    ctx.strokeText(letter, 48, 52)
    ctx.fillStyle = '#5b6fd6'
    ctx.fillText(letter, 48, 52)
  }
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  return texture
}

const Z_LETTERS = ['Z', 'z', 'z'] as const

function Zzz({ active }: { active: ActiveReaction }) {
  const sprites = useRef<(Sprite | null)[]>([])
  const progress = useProgress()
  const textures = useMemo(() => Z_LETTERS.map(makeLetterTexture), [])
  useEffect(() => () => textures.forEach((texture) => texture.dispose()), [textures])

  // 머리 옆에서 시작해 위로 떠오른다(머리 위 이름표와 겹치지 않게 옆으로 비킨다).
  const baseY = ZZZ_BASE_Y

  useFrame(({ clock }) => {
    const t = progress(active, clock.elapsedTime)
    sprites.current.forEach((sprite, index) => {
      if (!sprite) return
      // 글자마다 0.2씩 늦게 시작해서 위로 떠오르며 사라진다.
      const p = clamp01((t - index * 0.2) / 0.6)
      sprite.position.set(HEAD_SIDE + 0.18 + index * 0.1 + p * 0.1, baseY + index * 0.1 + p * 0.3, 0.05)
      sprite.material.opacity = p <= 0 ? 0 : p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8
      const size = (0.3 + index * 0.07) * (0.8 + p * 0.4)
      sprite.scale.set(size, size, 1)
    })
  })

  return (
    <>
      {textures.map((texture, index) => (
        <sprite
          key={index}
          ref={(sprite) => {
            sprites.current[index] = sprite
          }}
        >
          <spriteMaterial map={texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </>
  )
}

type Props = {
  /** 이 아바타 주인의 presence key(내 아바타면 저장소의 selfKey). 없으면 효과를 보이지 않는다 */
  reactionKey: string | undefined
  /** 아바타 모델. 지금 재생 중인 리액션 종류(없으면 null)를 받는다 */
  children: (reaction: ReactionKind | null) => ReactNode
}

export default function Reaction({ reactionKey, children }: Props) {
  const active = useActiveReaction(reactionKey)
  const nod = useRef<Group>(null)
  const progress = useProgress()

  useFrame(({ clock }) => {
    if (!nod.current) return
    nod.current.rotation.x = active?.kind === 'nod' ? nodAngle(progress(active, clock.elapsedTime)) : 0
  })

  // 허리 높이를 축으로 상체가 숙여지도록, 축 위치로 올린 group 안에서 모델을 원래 높이로 내린다.
  return (
    <>
      <group ref={nod} position={[0, NOD_PIVOT_Y, 0]}>
        <group position={[0, -NOD_PIVOT_Y, 0]}>{children(active?.kind ?? null)}</group>
      </group>
      {active?.kind === 'sleep' && <Zzz active={active} />}
    </>
  )
}
