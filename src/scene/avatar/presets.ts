// 아바타 모양 프리셋. AvatarLook.preset 값이 id로 쓰인다.

export type HairStyle = 'short' | 'bob' | 'spiky' | 'pigtails'
export type Accessory = 'none' | 'hat' | 'glasses'

export type AvatarPreset = {
  id: string
  name: string
  body: { radius: number; length: number }
  head: { radius: number }
  eye: { radius: number; spacing: number }
  hair: HairStyle
  accessory: Accessory
  /** GLB 모델 주소. 있으면 도형 대신 이 모델을 그리고, 못 불러오면 도형으로 대체한다. */
  model?: string
}

export const DEFAULT_PRESET_ID = 'round'
export const DEFAULT_AVATAR_COLOR = '#6aa9ff'
export const AVATAR_COLORS = [
  '#4f8cff', DEFAULT_AVATAR_COLOR, '#ff9eb5', '#ffd166', '#8bd5a0', '#bca4f5', '#f4a261',
] as const

const SHAPE = {
  body: { radius: 0.28, length: 0.42 },
  head: { radius: 0.3 },
  eye: { radius: 0.045, spacing: 0.11 },
}
export const HAIR_STYLES: readonly { id: HairStyle; name: string }[] = [
  { id: 'short', name: '짧은 머리' },
  { id: 'bob', name: '단발머리' },
  { id: 'spiky', name: '뾰족 머리' },
  { id: 'pigtails', name: '양갈래 머리' },
]
export const ACCESSORIES: readonly { id: Accessory; name: string }[] = [
  { id: 'none', name: '소품 없음' },
  { id: 'hat', name: '모자' },
  { id: 'glasses', name: '안경' },
]

const SHAPE_PRESETS: readonly AvatarPreset[] = HAIR_STYLES.flatMap((hair, index) =>
  ACCESSORIES.map((accessory) => ({
    ...SHAPE,
    id: index === 0 && accessory.id === 'none' ? DEFAULT_PRESET_ID : `${hair.id}-${accessory.id}`,
    name: `${hair.name} · ${accessory.name}`,
    hair: hair.id,
    accessory: accessory.id,
  })),
)


/** GLB 모델 프리셋. 못 불러올 때 대신 그릴 도형은 hair/accessory가 정한다. */
export const STUDENT_MODEL_PRESET: AvatarPreset = {
  ...SHAPE,
  id: 'student-1',
  name: '학생 모델 1',
  hair: 'short',
  accessory: 'none',
  model: '/models/student-1.glb',
}

export const AVATAR_PRESETS: readonly AvatarPreset[] = [...SHAPE_PRESETS, STUDENT_MODEL_PRESET]

/** 모르는 id면 기본 프리셋을 준다(오류 시 기본 캐릭터). */
export function getPreset(id: string): AvatarPreset {
  return AVATAR_PRESETS.find((p) => p.id === id) ?? AVATAR_PRESETS[0]
}
