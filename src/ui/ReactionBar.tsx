import { useEffect, type CSSProperties } from 'react'
import { REACTIONS, sendReaction, useReactions } from '../room/reactions.ts'
import { isTypingTarget } from '../scene/player/usePlayerControls.ts'

const BAR_STYLE: CSSProperties = {
  position: 'absolute',
  bottom: 'var(--space-4)',
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  gap: 'var(--space-2)',
  padding: 'var(--space-2)',
}

const SHORTCUT_STYLE: CSSProperties = {
  fontSize: 'var(--font-size-xs)',
  opacity: 0.75,
}

/** 끄덕·손들기·졸기 버튼. 1·2·3 키로도 보낸다(입력창에 글을 쓰는 중에는 무시). */
export default function ReactionBar() {
  const mine = useReactions((state) => state.reactions[state.selfKey]?.kind)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (isTypingTarget(event.target)) return
      const reaction = REACTIONS.find((item) => item.shortcut === event.key)
      if (reaction) sendReaction(reaction.kind)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="panel" style={BAR_STYLE} role="group" aria-label="리액션">
      {REACTIONS.map(({ kind, label, icon, shortcut }) => (
        <button
          key={kind}
          type="button"
          className={mine === kind ? 'btn' : 'btn btn-secondary'}
          aria-pressed={mine === kind}
          onClick={() => sendReaction(kind)}
        >
          <span aria-hidden="true">{icon}</span>
          {label}
          <span style={SHORTCUT_STYLE}>{shortcut}</span>
        </button>
      ))}
    </div>
  )
}
