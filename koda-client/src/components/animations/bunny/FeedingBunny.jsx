import { Suspense, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LOCAL_REFERENCE_HEIGHT = 1.6;

function useNormalized(url, targetHeight) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const root = scene.clone(true);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = targetHeight / (size.y || 1);
    const group = new THREE.Group();
    root.position.set(-center.x, -box.min.y, -center.z);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    group.add(root);
    group.scale.setScalar(s);
    return group;
  }, [scene, targetHeight]);
}

function makeBubbleTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 256, 256);
  const g = ctx.createRadialGradient(128, 128, 40, 128, 128, 120);
  g.addColorStop(0, "rgba(255,255,255,0.08)");
  g.addColorStop(0.85, "rgba(190,225,255,0.18)");
  g.addColorStop(1, "rgba(255,255,255,0.55)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(92, 82, 22, 13, -0.6, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Bubbles({ chewing }) {
  const texture = useMemo(() => makeBubbleTexture(), []);
  const refs = useRef([]);
  const seeds = useMemo(() => [0, 0.9, 1.8, 2.7], []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((sprite, i) => {
      if (!sprite) return;
      const life = ((t + seeds[i]) % 4.2) / 4.2;
      const fade = chewing ? Math.sin(life * Math.PI) : 0;
      sprite.position.y = 0.02 + life * 0.4;
      sprite.position.x = Math.sin((t + seeds[i]) * 1.4 + i) * 0.18;
      sprite.position.z = Math.cos((t + seeds[i]) * 1.0 + i) * 0.08;
      sprite.material.opacity = THREE.MathUtils.lerp(sprite.material.opacity, fade * 0.8, 0.15);
      const s = (0.06 + life * 0.07) * (1 + (i % 2) * 0.35);
      sprite.scale.setScalar(s);
    });
  });

  return (
    <group>
      {seeds.map((_, i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)}>
          <spriteMaterial map={texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

const CRUMB_COUNT = 6;

function Crumbs({ chewing }) {
  const refs = useRef([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: CRUMB_COUNT }, (_, i) => ({
        offset: (i / CRUMB_COUNT) * 1.9,
        speed: 0.5 + ((i * 37) % 10) / 30,
        driftX: (((i * 53) % 10) / 10 - 0.5) * 0.08,
        driftZ: (((i * 29) % 10) / 10 - 0.5) * 0.06,
        size: 0.008 + ((i * 17) % 10) / 900,
        spin: 0.8 + ((i * 11) % 5) * 0.3,
      })),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const seed = seeds[i];
      const fall = 0.75;
      const life = ((t * seed.speed + seed.offset) % 1.9) / 1.9;
      const y = 0.72 - life * fall;
      const onFloor = y <= 0.02;
      m.visible = chewing && !(life > 0.94);
      m.position.set(
        0.03 + seed.driftX * life * 3 + Math.sin(t * 2 + i) * 0.005,
        Math.max(y, 0.015),
        0.34 + seed.driftZ * life * 3,
      );
      m.rotation.set(t * seed.spin + i, t * seed.spin * 0.7, i);
      const s = onFloor ? seed.size * 0.8 : seed.size;
      m.scale.setScalar(s);
    });
  });

  return (
    <group>
      {seeds.map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 3 === 0 ? "#e8873a" : "#f09a4e"} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function FeedingBunnyRig({ worldScale }) {
  const bunny = useNormalized("/models/characters/bunny/feeding.glb", LOCAL_REFERENCE_HEIGHT);
  const carrot = useNormalized("/models/habitats/carrot.glb", LOCAL_REFERENCE_HEIGHT * 0.28);

  const bunnyRef = useRef(null);
  const carrotRef = useRef(null);
  const symbolsRef = useRef(null);
  const bite = useRef(1);
  const chewing = true;

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;
    const chewSpeed = 7;
    const chew = Math.sin(t * chewSpeed) * 0.5 + 0.5;

    if (bunnyRef.current) {
      const breathe = Math.sin(t * 1.6) * 0.015;
      bunnyRef.current.scale.set(
        1 + chew * 0.05 + breathe * 0.5,
        1 - chew * 0.06 + breathe,
        1 + chew * 0.05 + breathe * 0.5,
      );
      bunnyRef.current.position.y = -chew * 0.03;
      bunnyRef.current.rotation.z = Math.sin(t * chewSpeed * 0.5) * 0.02;
      bunnyRef.current.rotation.y = Math.sin(t * 0.5) * 0.12;
    }

    if (carrotRef.current) {
      bite.current -= dt * 0.06;
      if (bite.current < 0.15) bite.current = 1;
      const push = chew * 0.06;
      const b = bite.current;
      carrotRef.current.scale.setScalar(THREE.MathUtils.lerp(0.45, 1, b));
      carrotRef.current.position.set(0.03, 0.72 - push * 0.4, 0.32 - push);
      carrotRef.current.rotation.set(Math.PI * 0.82 + chew * 0.08, 0.15, 0.3);
    }

    if (symbolsRef.current) {
      symbolsRef.current.position.y = 1.25 + Math.sin(t * 1.4) * 0.03;
    }
  });

  return (
    <group scale={worldScale}>
      <group ref={bunnyRef}>
        <primitive object={bunny} />
        <group ref={symbolsRef}>
          <Bubbles chewing={chewing} />
        </group>
        <Crumbs chewing={chewing} />
        <group ref={carrotRef}>
          <primitive object={carrot} />
        </group>
      </group>
    </group>
  );
}

export default function FeedingBunny({ homePosition = [0, 0], scale = 1, referenceHeight = 1 }) {
  const worldScale = (referenceHeight * scale) / LOCAL_REFERENCE_HEIGHT;
  return (
    <group position={[homePosition[0], 0, homePosition[1]]}>
      <Suspense fallback={null}>
        <FeedingBunnyRig worldScale={worldScale} />
      </Suspense>
    </group>
  );
}

useGLTF.preload("/models/characters/bunny/feeding.glb");
useGLTF.preload("/models/habitats/carrot.glb");