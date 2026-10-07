import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";

const frogAsset = { url: "/models/characters/frog/angry.glb" };

function Chevron({ rotation }) {
  return (
    <group rotation={[0, 0, rotation]}>
      <mesh position={[-0.0135, 0.0055, 0]} rotation={[0, 0, 0.85]}>
        <boxGeometry args={[0.014, 0.0028, 0.003]} />
        <meshStandardMaterial color="#d93b3b" roughness={0.5} />
      </mesh>
      <mesh position={[-0.0135, -0.0055, 0]} rotation={[0, 0, -0.85]}>
        <boxGeometry args={[0.014, 0.0028, 0.003]} />
        <meshStandardMaterial color="#d93b3b" roughness={0.5} />
      </mesh>
    </group>
  );
}

function AngerSymbol() {
  const ref = useRef(null);

  useFrame(({ clock }) => {
    ref.current?.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 6) * 0.12);
  });

  return (
    <group ref={ref}>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((rotation) => (
        <Chevron key={rotation} rotation={rotation} />
      ))}
    </group>
  );
}

function AngryCharacter() {
  const frog = useGLTF(frogAsset.url);
  const body = useMemo(() => frog.scene.clone(true), [frog]);
  const viewport = useThree((state) => state.viewport);
  const shakeRef = useRef(null);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();

    if (shakeRef.current) {
      shakeRef.current.rotation.z = Math.sin(time * 17) * 0.018;
      shakeRef.current.position.x = Math.sin(time * 23) * 0.012;
    }
  });

  const responsiveScale = Math.min(
    4.7,
    viewport.width / 0.43,
    (viewport.height / 0.63) * 0.9,
  );

  return (
    <group
      ref={shakeRef}
      scale={responsiveScale}
      position={[0, 0.419 * responsiveScale - 0.08, -0.16]}
    >
      <primitive object={body} />
      <group position={[0.17, -0.205, 0.19]} scale={0.9}>
        <AngerSymbol />
      </group>
    </group>
  );
}

export default function AngryFrog() {
  return (
    <Canvas
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 4.2], fov: 40 }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[2.5, 4, 5]} intensity={1.85} />
      <directionalLight position={[-3, 1, 2]} intensity={0.55} color="#d8e7ff" />
      <Suspense fallback={null}>
        <AngryCharacter />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(frogAsset.url);