import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";

const angryAsset = { url: "/models/characters/koala/angry.glb" };
const koalaAsset = { url: "/models/characters/koala/koala.glb" };

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
    const t = clock.getElapsedTime();
    ref.current?.scale.setScalar(1 + Math.sin(t * 6) * 0.12);
  });

  return (
    <group ref={ref} position={[0.238, -0.085, 0.086]}>
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((r, i) => (
        <Chevron key={i} rotation={r} />
      ))}
    </group>
  );
}

function Hands({ leftRef, rightRef }) {
  const koala = useGLTF(koalaAsset.url);
  const hands = useMemo(() => {
    const kids = koala.scene.children;
    return [kids[1], kids[2]].filter(Boolean).map((n) => n.clone(true));
  }, [koala]);

  return (
    <>
      {hands.map((h, i) => (
        <group key={i} ref={i === 0 ? rightRef : leftRef}>
          <primitive object={h} />
        </group>
      ))}
    </>
  );
}

const RIG_CENTER = [-0.3048, 0.1987, -0.0496];
const RIG_SCALE = 9.03;

function AngryCharacter() {
  const angry = useGLTF(angryAsset.url);
  const body = useMemo(() => angry.scene.clone(true), [angry]);
  const shakeRef = useRef(null);
  const handL = useRef(null);
  const handR = useRef(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (shakeRef.current) {
      shakeRef.current.rotation.z = Math.sin(t * 17) * 0.018;
      shakeRef.current.position.x = Math.sin(t * 23) * 0.012;
    }

    const shake = Math.sin(t * 18) * 0.004;
    [handR.current, handL.current].forEach((hand, i) => {
      if (!hand) return;
      const dir = i === 0 ? 1 : -1;
      hand.position.y = shake * dir;
      hand.rotation.z = shake * 4 * dir;
    });
  });

  return (
    <group ref={shakeRef}>
      <group scale={RIG_SCALE}>
        <group position={RIG_CENTER}>
          <primitive object={body} />
          <Hands leftRef={handL} rightRef={handR} />
          <AngerSymbol />
        </group>
      </group>
    </group>
  );
}

export default function AngryKoala() {
  return (
    <Canvas
      style={{ background: "transparent" }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      dpr={[1, 2]}
      camera={{ position: [0, 0, 4.2], fov: 40 }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[2.5, 4, 5]} intensity={1.9} />
      <directionalLight position={[-3, 1, 2]} intensity={0.6} color="#cfe0ff" />
      <Suspense fallback={null}>
        <AngryCharacter />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(angryAsset.url);
useGLTF.preload(koalaAsset.url);