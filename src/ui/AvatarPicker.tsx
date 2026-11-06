import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import type { AvatarLook } from '../contract/room.ts'
import AvatarModel from '../scene/avatar/AvatarModel.tsx'
import {
  ACCESSORIES,
  AVATAR_COLORS,
  AVATAR_PRESETS,
  STUDENT_MODEL_PRESET,
  getPreset,
  HAIR_STYLES,
  type Accessory,
  type HairStyle,
} from '../scene/avatar/presets.ts'
import { DEFAULT_AVATAR, useStore } from '../state/store.ts'

const COLOR_NAMES = ['파랑', '하늘색', '분홍', '노랑', '초록', '보라', '주황']
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
    const { preset, color } = value as Record<string, unknown>
    if (typeof preset !== 'string' || typeof color !== 'string') return null
    if (!AVATAR_PRESETS.some((item) => item.id === preset) || !/^#[0-9a-fA-F]{6}$/.test(color)) return null
    return { preset, color }
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
  const preset = getPreset(draft.preset)
  const dirty = draft.preset !== avatar.preset || draft.color !== avatar.color

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

  function selectStyle(hair: HairStyle, accessory: Accessory) {
    const next = AVATAR_PRESETS.find((item) => item.hair === hair && item.accessory === accessory)
    if (next) change({ ...draft, preset: next.id })
  }

  const isModel = preset.model !== undefined

  function selectKind(kind: string) {
    if (kind === STUDENT_MODEL_PRESET.id) change({ ...draft, preset: STUDENT_MODEL_PRESET.id })
    else selectStyle(preset.hair, preset.accessory)
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
            종류
            <select value={isModel ? STUDENT_MODEL_PRESET.id : 'shape'} onChange={(event) => selectKind(event.target.value)}>
              <option value="shape">기본 도형</option>
              <option value={STUDENT_MODEL_PRESET.id}>{STUDENT_MODEL_PRESET.name}</option>
            </select>
          </label>
          <label>
            머리 모양
            <select value={preset.hair} disabled={isModel} onChange={(event) => selectStyle(event.target.value as HairStyle, preset.accessory)}>
              {HAIR_STYLES.map((hair) => <option key={hair.id} value={hair.id}>{hair.name}</option>)}
            </select>
          </label>
          <label>
            소품
            <select value={preset.accessory} disabled={isModel} onChange={(event) => selectStyle(preset.hair, event.target.value as Accessory)}>
              {ACCESSORIES.map((accessory) => <option key={accessory.id} value={accessory.id}>{accessory.name}</option>)}
            </select>
          </label>
          <label>
            몸 색
            <select value={draft.color} disabled={isModel} onChange={(event) => change({ ...draft, color: event.target.value })}>
              {!AVATAR_COLORS.some((color) => color === draft.color) && <option value={draft.color}>현재 색</option>}
              {AVATAR_COLORS.map((color, index) => <option key={color} value={color}>{COLOR_NAMES[index]}</option>)}
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
