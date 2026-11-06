import type { Navigate } from '../App.tsx'

type Props = { navigate: Navigate }

export default function LoginScreen({ navigate }: Props) {
  return (
    <main className="screen center-screen">
      <button type="button" onClick={() => navigate('rooms')}>
        샘플로 둘러보기
      </button>
    </main>
  )
}
