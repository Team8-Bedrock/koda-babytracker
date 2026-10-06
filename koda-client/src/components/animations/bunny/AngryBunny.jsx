import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useMemo, useRef } from "react";

const characterAsset = { url: "/models/characters/bunny/angry.glb" };
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

const PAW_SIZE = 0.36;
const PAW_SPOTS = [
  [-0.025, -0.27, 0.14],
  [0.77, -0.27, 0.14],
];

function PawBalls({ leftRef, rightRef }) {
  const koala = useGLTF(koalaAsset.url);
  const paws = useMemo(() => {
    return [koala.scene.children[1], koala.scene.children[2]]
      .filter(Boolean)
      .map((paw) => {
        const whitePaw = paw.clone(true);
        whitePaw.traverse((child) => {
          if (!child.isMesh) return;
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];
          child.material = materials.map((material) => {
            const whiteMaterial = new THREE.MeshStandardMaterial({
              color: "#f4f4f4",
              roughness: 0.6,
            });
            return whiteMaterial;
          });
          if (child.material.length === 1) child.material = child.material[0];
        });
        const box = new THREE.Box3().setFromObject(whitePaw);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const holder = new THREE.Group();
        whitePaw.position.sub(center);
        holder.add(whitePaw);
        holder.scale.setScalar(PAW_SIZE / Math.max(size.x, size.y, size.z));
        return holder;
      });
  }, [koala]);

  return paws.map((paw, index) => (
    <group key={index} position={PAW_SPOTS[index]}>
      <group ref={index === 0 ? rightRef : leftRef}>
        <primitive object={paw} />
      </group>
    </group>
  ));
}

function AngryBunnyCharacter() {
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
    shakeRef.current.position.x = Math.sin(time * 23) * 0.03;

    const pawBounce = Math.sin(time * 18) * 0.02;
    [rightPawRef.current, leftPawRef.current].forEach((paw, index) => {
      if (!paw) return;
      const direction = index === 0 ? 1 : -1;
      paw.position.y = pawBounce * direction;
      paw.rotation.z = pawBounce * 4 * direction;
    });
  });

  const responsiveScale = Math.min(
    2,
    (viewport.width / 1.15) * 0.9,
    (viewport.height / 2.35) * 0.9,
  );

  return (
    <group ref={shakeRef} scale={responsiveScale} position={[0, 0, -0.12]}>
      <group position={[-0.37934, -0.1038, 0.02473]}>
        <primitive object={body} />
        <PawBalls leftRef={leftPawRef} rightRef={rightPawRef} />
        <group position={[0.85, 0.5, 0.3]} scale={3}>
          <AngerSymbol />
        </group>
      </group>
    </group>
  );
}

export default function AngryBunny() {
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
        <AngryBunnyCharacter />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload(characterAsset.url);
useGLTF.preload(koalaAsset.url);