import { useState } from 'react'
import {
  ACCESSORIES,
  AVATAR_COLORS,
  AVATAR_PRESETS,
  getPreset,
  HAIR_STYLES,
  type Accessory,
  type HairStyle,
} from '../scene/avatar/presets.ts'
import { useStore } from '../state/store.ts'

const COLOR_NAMES = ['파랑', '하늘색', '분홍', '노랑', '초록', '보라', '주황']

export default function AvatarPicker() {
  const [open, setOpen] = useState(false)
  const avatar = useStore((s) => s.avatar)
  const setAvatar = useStore((s) => s.setAvatar)
  const preset = getPreset(avatar.preset)

  function selectStyle(hair: HairStyle, accessory: Accessory) {
    const next = AVATAR_PRESETS.find((item) => item.hair === hair && item.accessory === accessory)
    if (next) setAvatar({ ...avatar, preset: next.id })
  }

  return (
    <section style={{ position: 'absolute', bottom: 'var(--space-4)', left: 'var(--space-4)', zIndex: 2 }} aria-label="캐릭터 꾸미기">
      <button type="button" aria-expanded={open} aria-controls="avatar-picker" onClick={() => setOpen(!open)}>
        캐릭터 꾸미기
      </button>
      {open && (
        <div id="avatar-picker" className="panel" style={{ marginTop: 'var(--space-2)', width: 'min(280px, calc(100vw - 32px))', maxHeight: '60vh', overflowY: 'auto', display: 'grid', gap: 'var(--space-2)' }}>
          <label>
            머리 모양
            <select value={preset.hair} onChange={(event) => selectStyle(event.target.value as HairStyle, preset.accessory)}>
              {HAIR_STYLES.map((hair) => <option key={hair.id} value={hair.id}>{hair.name}</option>)}
            </select>
          </label>
          <label>
            소품
            <select value={preset.accessory} onChange={(event) => selectStyle(preset.hair, event.target.value as Accessory)}>
              {ACCESSORIES.map((accessory) => <option key={accessory.id} value={accessory.id}>{accessory.name}</option>)}
            </select>
          </label>
          <label>
            몸 색
            <select value={avatar.color} onChange={(event) => setAvatar({ ...avatar, color: event.target.value })}>
              {!AVATAR_COLORS.some((color) => color === avatar.color) && <option value={avatar.color}>현재 색</option>}
              {AVATAR_COLORS.map((color, index) => <option key={color} value={color}>{COLOR_NAMES[index]}</option>)}
            </select>
          </label>
        </div>
      )}
    </section>
  )
}
