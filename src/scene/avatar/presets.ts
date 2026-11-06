// 아바타 프리셋. AvatarLook.preset 값이 id로 쓰인다. 모두 GLB 캐릭터(Plumberry Plains Vol.2, Chibipup)다.

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
  return { id, name, model: `/models/${file}.glb`, idleClip: 'idle', walkClip: 'walk', handClip: 'wave' }
}

export const AVATAR_PRESETS: readonly AvatarPreset[] = [
  preset('student-1', '토끼 키키', 'student-rabbit'),
  preset('student-2', '여우 진니아', 'student-fox'),
  preset('student-3', '햄스터 프레야', 'student-hamster'),
  preset('student-4', '생쥐 포피', 'student-mouse'),
  preset('student-5', '오리 어니', 'student-duck'),
  preset('student-6', '펭귄 오슨', 'student-penguin'),
]

/** 모르는 id(예전 도형 프리셋 포함)면 기본 프리셋을 준다. */
export function getPreset(id: string): AvatarPreset {
  return AVATAR_PRESETS.find((p) => p.id === id) ?? AVATAR_PRESETS[0]
}
