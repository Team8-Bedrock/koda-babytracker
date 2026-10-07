import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";

const characterAsset = { url: "/models/characters/panda/angry.glb" };
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

function PawBalls({ leftRef, rightRef }) {
  const koala = useGLTF(koalaAsset.url);
  const paws = useMemo(() => {
    return [koala.scene.children[1], koala.scene.children[2]]
      .filter(Boolean)
      .map((paw) => {
        const blackPaw = paw.clone(true);
        blackPaw.traverse((child) => {
          if (!child.isMesh) return;
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          child.material = materials.map((material) => {
            const blackMaterial = material.clone();
            blackMaterial.color.setRGB(0.005, 0.005, 0.005);
            blackMaterial.roughness = 0.48;
            return blackMaterial;
          });
          if (child.material.length === 1) child.material = child.material[0];
        });
        return blackPaw;
      });
  }, [koala]);

  return paws.map((paw, index) => (
    <group key={index} ref={index === 0 ? rightRef : leftRef}>
      <primitive object={paw} />
    </group>
  ));
}

function AngryPandaCharacter() {
  const gltf = useGLTF(characterAsset.url);
  const body = useMemo(() => gltf.scene.clone(true), [gltf]);
  const viewport = useThree((state) => state.viewport);
  const shakeRef = useRef(null);
  const leftPawRef = useRef(null);
  const rightPawRef = useRef(null);

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (!shakeRef.current) return;
    shakeRef.current.rotation.z = Math.sin(time * 17) * 0.018;
    shakeRef.current.position.x = Math.sin(time * 23) * 0.012;

    const pawBounce = Math.sin(time * 18) * 0.004;
    [rightPawRef.current, leftPawRef.current].forEach((paw, index) => {
      if (!paw) return;
      const direction = index === 0 ? 1 : -1;
      paw.position.y = pawBounce * direction;
      paw.rotation.z = pawBounce * 4 * direction;
    });
  });

  const responsiveScale = Math.min(
    7.5,
    (viewport.width / 0.3) * 0.9,
    (viewport.height / 0.38) * 0.9,
  );

  return (
    <group ref={shakeRef} scale={responsiveScale} position={[0, 0, -0.12]}>
      <group position={[-0.30574, 0.19916, -0.0505]}>
        <primitive object={body} />
        <PawBalls leftRef={leftPawRef} rightRef={rightPawRef} />
        <group position={[0.42, -0.12, 0.16]} scale={0.55}>
          <AngerSymbol />
        </group>
      </group>
    </group>
  );
}

export default function AngryPanda() {
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
        <AngryPandaCharacter />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(characterAsset.url);
useGLTF.preload(koalaAsset.url);