// 아바타 모양 프리셋. AvatarLook.preset 값이 id로 쓰인다.

export type AvatarPreset = {
  id: string
  name: string
  /** 몸통 캡슐 */
  body: { radius: number; length: number }
  /** 머리 구 */
  head: { radius: number }
  /** 눈 구 */
  eye: { radius: number; spacing: number }
}

export const DEFAULT_PRESET_ID = 'round'
export const DEFAULT_AVATAR_COLOR = '#6aa9ff'

export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  {
    id: DEFAULT_PRESET_ID,
    name: '동글이',
    body: { radius: 0.28, length: 0.42 },
    head: { radius: 0.3 },
    eye: { radius: 0.045, spacing: 0.11 },
  },
]

/** 모르는 id면 기본 프리셋을 준다(오류 시 기본 캐릭터). */
export function getPreset(id: string): AvatarPreset {
  return AVATAR_PRESETS.find((p) => p.id === id) ?? AVATAR_PRESETS[0]
}
