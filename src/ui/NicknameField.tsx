import { useEffect, useState } from 'react'
import { anonymousNumber, loadNickname, NICKNAME_MAX, resolveNickname, saveNickname } from './nickname.ts'

type Props = {
  /** 쓸 닉네임이 정해지거나 바뀔 때마다 부른다(비어 있으면 '익명 학생 N'). */
  onChange?: (nickname: string) => void
}

// 닉네임 입력칸. 마지막으로 쓴 닉네임을 localStorage에서 채워 두고 입력할 때마다 저장한다.
export default function NicknameField({ onChange }: Props) {
  const [raw, setRaw] = useState(() => loadNickname())
  const [anon] = useState(() => anonymousNumber())
  const resolved = resolveNickname(raw, anon)

  useEffect(() => {
    onChange?.(resolved)
  }, [resolved, onChange])

  return (
    <label style={{ display: 'grid', gap: 'var(--space-1)' }}>
      <span>닉네임</span>
      <input
        type="text"
        value={raw}
        maxLength={NICKNAME_MAX}
        placeholder={`익명 학생 ${anon}`}
        autoComplete="nickname"
        onChange={(e) => {
          setRaw(e.target.value)
          saveNickname(e.target.value)
        }}
      />
    </label>
  )
}
