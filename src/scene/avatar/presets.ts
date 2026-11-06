// 아바타 프리셋. AvatarLook.preset 값이 id로 쓰인다. 모두 GLB 캐릭터(KayKit Adventurers, CC0)다.

export type AvatarPreset = {
  id: string
  name: string
  /** GLB 모델 주소 */
  model: string
  /** 가만히 있는 동작/걷는 동작/손들기 동작 이름 */
  idleClip: string
  walkClip: string
  handClip: string
}

export const DEFAULT_PRESET_ID = 'student-1'
export const DEFAULT_AVATAR_COLOR = '#4f8cff'

function preset(id: string, name: string, file: string): AvatarPreset {
  return { id, name, model: `/models/${file}.glb`, idleClip: 'Idle', walkClip: 'Walking_A', handClip: 'Cheer' }
}

export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  preset('student-1', '기사', 'student-knight'),
  preset('student-2', '바바리안', 'student-barbarian'),
  preset('student-3', '도적', 'student-rogue'),
  preset('student-4', '후드 도적', 'student-rogue-hooded'),
]

/** 모르는 id(예전 도형 프리셋 포함)면 기본 프리셋을 준다. */
export function getPreset(id: string): AvatarPreset {
  return AVATAR_PRESETS.find((p) => p.id === id) ?? AVATAR_PRESETS[0]
}
