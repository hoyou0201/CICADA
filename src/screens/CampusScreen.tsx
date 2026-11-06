import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import type { Group } from 'three'
import type { Navigate, ScreenName } from '../App.tsx'
import { startMoveReceiver } from '../room/moveReceiver.ts'
import { startMoveSender } from '../room/moveSender.ts'
import { joinPresence } from '../room/presence.ts'
import Lighting from '../scene/Lighting.tsx'
import RemoteAvatars from '../scene/RemoteAvatars.tsx'
import AvatarModel from '../scene/avatar/AvatarModel.tsx'
import Door from '../scene/campus/Door.tsx'
import Hallway from '../scene/campus/Hallway.tsx'
import {
  CAMERA_START,
  DOOR_SLOTS,
  PLAYER_START,
  WALK_BOUNDS,
} from '../scene/campus/layout.ts'
import FollowCamera from '../scene/player/FollowCamera.tsx'
import { listenTap, pickFloor } from '../scene/player/useClickToMove.ts'
import {
  WALK_SPEED,
  isTypingTarget,
  releaseMenuFocus,
  type StepResult,
} from '../scene/player/usePlayerControls.ts'
import { useStore, type Position } from '../state/store.ts'
import AvatarPicker from '../ui/AvatarPicker.tsx'
import Hud from '../ui/Hud.tsx'
import InviteQr from '../ui/InviteQr.tsx'
import Loading from '../ui/Loading.tsx'
import ReactionBar from '../ui/ReactionBar.tsx'
import { anonymousNumber, loadNickname, resolveNickname } from '../ui/nickname.ts'

const HALLWAY_ROOM_ID = 'hallway'

let lastPresenceKey: string | null = null
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
  const originalRandomUUID = crypto.randomUUID.bind(crypto)
  try {
    crypto.randomUUID = () => {
      const id = originalRandomUUID()
      lastPresenceKey = id
      return id
    }
  } catch {
    // 읽기 전용 환경에서는 그대로 둔다.
  }
}

const ARRIVE_DISTANCE = 0.05
const MOVING_EPSILON = 1e-4

const KEY_DIRECTIONS: Record<string, Position> = {
  KeyW: { x: 0, z: -1 },
  ArrowUp: { x: 0, z: -1 },
  KeyS: { x: 0, z: 1 },
  ArrowDown: { x: 0, z: 1 },
  KeyA: { x: -1, z: 0 },
  ArrowLeft: { x: -1, z: 0 },
  KeyD: { x: 1, z: 0 },
  ArrowRight: { x: 1, z: 0 },
}

const TOP_RIGHT_STYLE: CSSProperties = {
  position: 'absolute',
  top: 'var(--space-4)',
  right: 'var(--space-4)',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--space-2)',
}

function clampToHallwayBounds(p: Position): Position {
  return {
    x: Math.min(WALK_BOUNDS.maxX, Math.max(WALK_BOUNDS.minX, p.x)),
    z: Math.min(WALK_BOUNDS.maxZ, Math.max(WALK_BOUNDS.minZ, p.z)),
  }
}

function stepHallwayPlayer(
  position: Position,
  direction: Position,
  target: Position | null,
  dt: number,
): StepResult {
  const dist = WALK_SPEED * dt
  let dx = direction.x
  let dz = direction.z
  let toTarget = false

  if (dx === 0 && dz === 0 && target) {
    const tx = target.x - position.x
    const tz = target.z - position.z
    const left = Math.hypot(tx, tz)
    if (left <= ARRIVE_DISTANCE) {
      return { position: clampToHallwayBounds(target), rotY: null, clearTarget: true }
    }
    dx = tx / left
    dz = tz / left
    toTarget = true
    if (left <= dist) {
      return {
        position: clampToHallwayBounds(target),
        rotY: Math.atan2(dx, dz),
        clearTarget: true,
      }
    }
  }

  const len = Math.hypot(dx, dz)
  if (len === 0) return { position, rotY: null, clearTarget: false }
  dx /= len
  dz /= len

  const next = clampToHallwayBounds({ x: position.x + dx * dist, z: position.z + dz * dist })
  const moved = next.x !== position.x || next.z !== position.z
  const stuck = toTarget && !moved
  return { position: next, rotY: Math.atan2(dx, dz), clearTarget: stuck }
}

/** 복도에 들어갈 때 roomId를 `hallway`로 바꾸고 시작 위치로 옮긴다. */
function enterHallway(): void {
  const { setRoomId, remotePlayers, setRemotePlayers, setMoveTarget, setPosition } =
    useStore.getState()
  setRoomId(HALLWAY_ROOM_ID)
  setRemotePlayers(
    Object.values(remotePlayers).filter((player) => player.roomId === HALLWAY_ROOM_ID),
  )
  setMoveTarget(null)
  setPosition({ x: PLAYER_START[0], z: PLAYER_START[2] }, 0)
}

/** 복도 장면을 불러오지 못했을 때 강의실 목록 화면으로 보낸다. */
function handleSceneLoadError(navigate: Navigate): void {
  useStore.getState().setScreen('rooms')
  navigate('rooms')
}

function canLoadCampusScene(): boolean {
  try {
    if (typeof document === 'undefined') return false
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function useHallwayControls(): void {
  const pressed = useRef(new Set<string>())
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  useEffect(() => {
    const keys = pressed.current
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.code in KEY_DIRECTIONS)) return
      if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      releaseMenuFocus(e.target)
      keys.add(e.code)
      e.preventDefault()
      if (useStore.getState().moveTarget) useStore.getState().setMoveTarget(null)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code)
    }
    const clear = () => keys.clear()
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', clear)
      keys.clear()
    }
  }, [])

  useEffect(() => {
    const canvas = gl.domElement
    return listenTap(canvas, (e) => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const ndc = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        z: -(((e.clientY - rect.top) / rect.height) * 2 - 1),
      }
      const point = pickFloor(ndc, camera)
      if (point) useStore.getState().setMoveTarget(clampToHallwayBounds(point))
    })
  }, [gl, camera])

  useFrame((_, delta) => {
    const { position, moveTarget, setPosition, setMoveTarget } = useStore.getState()
    const direction = { x: 0, z: 0 }
    for (const code of pressed.current) {
      const d = KEY_DIRECTIONS[code]
      direction.x += d.x
      direction.z += d.z
    }
    const result = stepHallwayPlayer(position, direction, moveTarget, Math.min(delta, 0.1))
    if (result.position !== position) {
      setPosition(result.position, result.rotY ?? undefined)
    }
    if (result.clearTarget) setMoveTarget(null)
  })
}

function HallwayPlayer() {
  const avatar = useStore((s) => s.avatar)
  const watching = useStore((s) => s.screenStream !== null)
  const [nickname] = useState(() => resolveNickname(loadNickname(), anonymousNumber()))
  const [moving, setMoving] = useState(false)
  const group = useRef<Group>(null)
  const last = useRef({ x: NaN, z: NaN })

  useHallwayControls()

  useFrame(() => {
    const { position, rotY } = useStore.getState()
    const g = group.current
    if (g) {
      g.position.set(position.x, 0, position.z)
      g.rotation.y = rotY
    }
    const moved =
      Math.abs(position.x - last.current.x) > MOVING_EPSILON ||
      Math.abs(position.z - last.current.z) > MOVING_EPSILON
    last.current = { x: position.x, z: position.z }
    setMoving((prev) => (prev === moved ? prev : moved))
  })

  return (
    <>
      <group ref={group} position={PLAYER_START}>
        <AvatarModel
          nickname={nickname}
          avatar={avatar}
          status={watching ? 'watching' : 'idle'}
          moving={moving}
        />
      </group>
      <FollowCamera />
    </>
  )
}

function CampusScene({ navigate }: { navigate: Navigate }) {
  return (
    <Canvas className="scene-canvas" shadows camera={{ position: CAMERA_START, fov: 60 }}>
      <Lighting />
      <Hallway />
      {DOOR_SLOTS.map((slot) => (
        <Door key={slot.roomId} slot={slot} navigate={navigate} />
      ))}
      <HallwayPlayer />
      <RemoteAvatars />
    </Canvas>
  )
}

type BoundaryProps = {
  onError: () => void
  children: ReactNode
}

type BoundaryState = {
  failed: boolean
}

class SceneErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  componentDidCatch(): void {
    this.props.onError()
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

type Props = { navigate: Navigate }

export default function CampusScreen({ navigate }: Props) {
  const [sceneSupported] = useState(() => canLoadCampusScene())

  const handleNavigate = useCallback(
    (next: ScreenName) => {
      useStore.getState().setScreen(next)
      navigate(next)
    },
    [navigate],
  )

  useEffect(() => {
    useStore.getState().setScreen('campus')
    enterHallway()

    if (!sceneSupported) {
      handleSceneLoadError(navigate)
      return
    }

    const standalonePresence =
      useStore.getState().connection === 'connecting' && !lastPresenceKey
        ? joinPresence({ nickname: resolveNickname(loadNickname(), anonymousNumber()) })
        : null
    const key = standalonePresence?.key ?? lastPresenceKey ?? ''
    const stopSender = startMoveSender(key)
    const stopReceiver = startMoveReceiver(key)
    const unsubscribeScreen = useStore.subscribe((state, prev) => {
      if (state.screen !== prev.screen && state.screen !== 'campus') {
        navigate(state.screen)
      }
    })

    return () => {
      unsubscribeScreen()
      stopReceiver()
      stopSender()
      if (standalonePresence && useStore.getState().roomId === HALLWAY_ROOM_ID) {
        standalonePresence.leave()
      }
    }
  }, [navigate, sceneSupported])

  if (!sceneSupported) return null

  return (
    <div className="screen campus-screen">
      <SceneErrorBoundary onError={() => handleSceneLoadError(navigate)}>
        <Suspense fallback={<Loading />}>
          <CampusScene navigate={handleNavigate} />
        </Suspense>
      </SceneErrorBoundary>
      <div className="overlay">
        <Hud />
        <AvatarPicker />
        <div className="panel" style={TOP_RIGHT_STYLE}>
          <button type="button" className="btn" onClick={() => handleNavigate('rooms')}>
            강의실 목록
          </button>
        </div>
        <ReactionBar />
        <InviteQr />
      </div>
    </div>
  )
}
