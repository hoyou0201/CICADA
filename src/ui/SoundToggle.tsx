import type { CSSProperties } from 'react'
import { useAmbient } from '../audio/ambient.ts'

export const SOUND_OFF_MESSAGE = '소리는 꺼져 있어요'

const STYLE: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 'var(--space-2)',
}

/** 창밖 새소리와 실내 잔향. 기본은 꺼져 있고, 실패해도 강의실의 다른 기능은 그대로다. */
export default function SoundToggle() {
  const birds = useAmbient((state) => state.birds)
  const reverb = useAmbient((state) => state.reverb)
  const pending = useAmbient((state) => state.pending)
  const errorMessage = useAmbient((state) => state.errorMessage)
  const setBirds = useAmbient((state) => state.setBirds)
  const setReverb = useAmbient((state) => state.setReverb)
  const off = !birds && !reverb && !errorMessage

  return (
    <div className="panel" style={STYLE} role="group" aria-label="강의실 소리" aria-busy={pending}>
      <button
        type="button"
        className={birds ? 'btn' : 'btn btn-secondary'}
        aria-pressed={birds}
        disabled={pending}
        onClick={() => void setBirds(!birds)}
      >
        창밖 새소리
      </button>
      <button
        type="button"
        className={reverb ? 'btn' : 'btn btn-secondary'}
        aria-pressed={reverb}
        disabled={pending}
        onClick={() => void setReverb(!reverb)}
      >
        실내 잔향
      </button>
      {off && (
        <span className="text-muted" role="status">
          {SOUND_OFF_MESSAGE}
        </span>
      )}
      {errorMessage && (
        <p className="text-muted" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  )
}
