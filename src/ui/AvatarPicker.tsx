import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import type { AvatarLook } from '../contract/room.ts'
import AvatarModel from '../scene/avatar/AvatarModel.tsx'
import { AVATAR_PRESETS, DEFAULT_AVATAR_COLOR } from '../scene/avatar/presets.ts'
import { DEFAULT_AVATAR, useStore } from '../state/store.ts'

const AVATAR_STORAGE_KEY = 'cicada.avatar'

// 사생활 보호 모드 등으로 localStorage를 못 쓰면 저장 없이 동작한다.
function storage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** 저장된 아바타. 없거나 깨졌거나 모르는 프리셋이면 null(= 기본 캐릭터). */
function loadAvatar(): AvatarLook | null {
  try {
    const raw = storage()?.getItem(AVATAR_STORAGE_KEY)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return null
    const { preset } = value as Record<string, unknown>
    if (typeof preset !== 'string' || !AVATAR_PRESETS.some((item) => item.id === preset)) return null
    return { preset, color: DEFAULT_AVATAR_COLOR }
  } catch {
    return null
  }
}

function saveAvatar(avatar: AvatarLook): boolean {
  try {
    storage()?.setItem(AVATAR_STORAGE_KEY, JSON.stringify(avatar))
    return storage() !== null
  } catch {
    return false
  }
}

type SaveState = 'idle' | 'saved' | 'not-persisted'

export default function AvatarPicker() {
  const [open, setOpen] = useState(false)
  const avatar = useStore((s) => s.avatar)
  const setAvatar = useStore((s) => s.setAvatar)
  const [draft, setDraft] = useState<AvatarLook>(avatar)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const dirty = draft.preset !== avatar.preset

  // 저장해 둔 아바타가 있으면 접속할 때 불러온다. 없으면 기본 캐릭터 그대로.
  useEffect(() => {
    const saved = loadAvatar()
    if (saved) setAvatar(saved)
  }, [setAvatar])

  function toggle() {
    if (!open) setDraft(avatar) // 열 때마다 지금 내 모습에서 시작한다
    setSaveState('idle')
    setOpen(!open)
  }

  function change(next: AvatarLook) {
    setDraft(next)
    setSaveState('idle')
  }

  function save() {
    setAvatar(draft)
    setSaveState(saveAvatar(draft) ? 'saved' : 'not-persisted')
  }

  function reset() {
    change(DEFAULT_AVATAR)
  }

  return (
    <section style={{ position: 'absolute', top: '128px', left: 'var(--space-4)', zIndex: 2 }} aria-label="캐릭터 꾸미기">
      <button type="button" aria-expanded={open} aria-controls="avatar-picker" onClick={toggle}>
        캐릭터 꾸미기
      </button>
      {open && (
        <div id="avatar-picker" className="panel" style={{ marginTop: 'var(--space-2)', width: 'min(280px, calc(100vw - 32px))', maxHeight: '60vh', overflowY: 'auto', display: 'grid', gap: 'var(--space-2)' }}>
          <div role="img" aria-label="캐릭터 미리보기" style={{ height: 160 }}>
            <Canvas camera={{ position: [0, 0.9, 2.8], fov: 35 }} onCreated={({ camera }) => camera.lookAt(0, 0.75, 0)}>
              <ambientLight intensity={1.2} />
              <directionalLight position={[2, 3, 3]} intensity={1.5} />
              <AvatarModel nickname="미리보기" avatar={draft} status="idle" />
            </Canvas>
          </div>
          <label>
            캐릭터
            <select value={draft.preset} onChange={(event) => change({ ...draft, preset: event.target.value })}>
              {AVATAR_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button type="button" className="btn" onClick={save} disabled={!dirty}>저장</button>
            <button type="button" className="btn" onClick={reset}>기본 캐릭터로</button>
          </div>
          <span role="status">
            {saveState === 'saved' && '저장했어요. 다음에 들어와도 이 모습이에요'}
            {saveState === 'not-persisted' && '지금 모습은 바뀌었지만 이 브라우저에는 저장하지 못했어요'}
            {saveState === 'idle' && dirty && '저장을 눌러야 내 캐릭터가 바뀌어요'}
          </span>
        </div>
      )}
    </section>
  )
}
