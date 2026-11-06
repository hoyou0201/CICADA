import type { ReactNode } from 'react'

type Props = { children: ReactNode }

// WebGL 확인 전까지는 그대로 통과시킨다.
export default function WebGLGate({ children }: Props) {
  return <>{children}</>
}
