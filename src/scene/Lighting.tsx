import { HALF_DEPTH, HALF_WIDTH, ROOM } from './layout.ts'

const SKY = '#dfe9ee'

// 오른쪽(+x) 창으로 따뜻한 햇살이 비스듬히 드는 오후 강의실 톤.
export default function Lighting() {
  return (
    <>
      <color attach="background" args={[SKY]} />
      <fog attach="fog" args={[SKY, 22, 55]} />
      <hemisphereLight args={['#eef4ff', '#d9c9a8', 0.7]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        color="#fff1d6"
        intensity={2.2}
        position={[HALF_WIDTH + 6, ROOM.height + 5, -2]}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-radius={4}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-HALF_DEPTH}
        shadow-camera-right={HALF_DEPTH}
        shadow-camera-top={HALF_DEPTH}
        shadow-camera-bottom={-HALF_DEPTH}
      />
    </>
  )
}
