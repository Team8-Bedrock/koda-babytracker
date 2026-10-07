import { Suspense, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const foxAsset = { url: "/models/characters/fox/feeding.glb" };

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

    const normalized = new THREE.Group();
    root.position.set(-center.x, -box.min.y, -center.z);
    root.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
    });

    normalized.add(root);
    normalized.scale.setScalar(targetHeight / (size.y || 1));
    return normalized;
  }, [scene, targetHeight]);
}

function makeBubbleTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.clearRect(0, 0, 256, 256);
  const glow = context.createRadialGradient(128, 128, 40, 128, 128, 120);
  glow.addColorStop(0, "rgba(255,190,105,0.08)");
  glow.addColorStop(0.85, "rgba(239,120,45,0.22)");
  glow.addColorStop(1, "rgba(174,62,22,0.62)");
  context.fillStyle = glow;
  context.beginPath();
  context.arc(128, 128, 118, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "rgba(255,255,255,0.85)";
  context.beginPath();
  context.ellipse(92, 82, 22, 13, -0.6, 0, Math.PI * 2);
  context.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Bubbles() {
  const texture = useMemo(() => makeBubbleTexture(), []);
  const bubbles = useRef([]);
  const seeds = useMemo(() => [0, 0.9, 1.8, 2.7], []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    bubbles.current.forEach((bubble, index) => {
      if (!bubble) return;
      const life = ((time + seeds[index]) % 4.2) / 4.2;
      bubble.position.y = 0.02 + life * 0.4;
      bubble.position.x = Math.sin((time + seeds[index]) * 1.4 + index) * 0.18;
      bubble.position.z = Math.cos((time + seeds[index]) + index) * 0.08;
      bubble.material.opacity = THREE.MathUtils.lerp(
        bubble.material.opacity,
        Math.sin(life * Math.PI) * 0.8,
        0.15,
      );
      bubble.scale.setScalar((0.06 + life * 0.07) * (1 + (index % 2) * 0.35));
    });
  });

  if (!texture) return null;

  return seeds.map((seed, index) => (
    <sprite key={seed} ref={(element) => { bubbles.current[index] = element; }}>
      <spriteMaterial
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  ));
}

function useApple(targetHeight) {
  return useMemo(() => {
    const apple = new THREE.Group();
    const appleMaterial = new THREE.MeshStandardMaterial({
      color: "#d9322b",
      roughness: 0.34,
    });
    const fruit = new THREE.Mesh(
      new THREE.SphereGeometry(targetHeight * 0.42, 20, 16),
      appleMaterial,
    );
    fruit.scale.set(1, 0.9, 0.92);
    fruit.castShadow = true;
    apple.add(fruit);

    const stemMaterial = new THREE.MeshStandardMaterial({
      color: "#5a3219",
      roughness: 0.8,
    });
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(targetHeight * 0.035, targetHeight * 0.045, targetHeight * 0.34, 10),
      stemMaterial,
    );
    stem.position.y = targetHeight * 0.45;
    stem.rotation.z = -0.14;
    stem.castShadow = true;
    apple.add(stem);

    const leafMaterial = new THREE.MeshStandardMaterial({
      color: "#4f8c35",
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    const leaf = new THREE.Mesh(
      new THREE.CircleGeometry(targetHeight * 0.17, 16),
      leafMaterial,
    );
    leaf.scale.set(1.7, 0.72, 1);
    leaf.position.set(targetHeight * 0.18, targetHeight * 0.5, 0);
    leaf.rotation.set(-0.25, 0.15, -0.45);
    apple.add(leaf);

    return apple;
  }, [targetHeight]);
}

function makePawGradientTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, "#e8842f");
  gradient.addColorStop(0.45, "#a24a12");
  gradient.addColorStop(1, "#0a0a0a");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function PawBall({ side }) {
  const paw = useRef(null);
  const texture = useMemo(() => makePawGradientTexture(), []);

  useFrame(({ clock }) => {
    if (!paw.current) return;
    const time = clock.elapsedTime;
    const bob = Math.sin(time * 3) * 0.004;
    paw.current.position.set(0.36 * side, 0.52 - bob * side, 0.14);
    paw.current.rotation.z = 0.16 * side - Math.sin(time * 2.4) * 0.04 * side;
  });

  return (
    <mesh ref={paw} castShadow scale={[1, 0.9, 0.86]}>
      <sphereGeometry args={[0.085, 18, 14]} />
      <meshStandardMaterial map={texture ?? undefined} color="#ffffff" roughness={0.48} />
    </mesh>
  );
}

function PawBalls() {
  return (
    <>
      <PawBall side={-1} />
      <PawBall side={1} />
    </>
  );
}

function AppleCrumbs({ appleScale }) {
  const crumbs = useRef([]);
  const seeds = useMemo(() => [0, 0.24, 0.51, 0.78, 1.03, 1.31, 1.57], []);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    crumbs.current.forEach((crumb, index) => {
      if (!crumb) return;
      const life = ((time * 0.72 + seeds[index]) % 1.8) / 1.8;
      const side = index % 2 === 0 ? -1 : 1;
      crumb.visible = appleScale.current > 0.08;
      crumb.position.set(
        side * (0.025 + life * (0.065 + index * 0.003)),
        0.94 - life * 0.54,
        1.12 + Math.sin(index * 1.7) * 0.018,
      );
      crumb.rotation.set(time * (1.8 + index * 0.12), time * 1.3, life * 5);
      crumb.scale.setScalar((1 - life * 0.65) * (0.72 + (index % 3) * 0.14));
    });
  });

  return seeds.map((seed, index) => (
    <mesh
      key={seed}
      ref={(element) => { crumbs.current[index] = element; }}
      castShadow
    >
      <dodecahedronGeometry args={[0.03 + (index % 3) * 0.006, 0]} />
      <meshStandardMaterial
        color={index % 3 === 0 ? "#ffe1a0" : "#e94438"}
        roughness={0.7}
      />
    </mesh>
  ));
}

function FeedingFoxRig({ worldScale }) {
  const fox = useNormalized(foxAsset.url, LOCAL_REFERENCE_HEIGHT);
  const apple = useApple(LOCAL_REFERENCE_HEIGHT * 0.18);
  const foxRef = useRef(null);
  const appleRef = useRef(null);
  const bubblesRef = useRef(null);
  const bite = useRef(1);
  const appleScale = useRef(1);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const time = clock.elapsedTime;
    const chew = Math.sin(time * 7) * 0.5 + 0.5;

    if (foxRef.current) {
      const breathe = Math.sin(time * 1.6) * 0.015;
      foxRef.current.scale.set(
        1 + chew * 0.045 + breathe * 0.5,
        1 - chew * 0.055 + breathe,
        1 + chew * 0.045 + breathe * 0.5,
      );
      foxRef.current.position.y = -chew * 0.025;
      foxRef.current.rotation.z = Math.sin(time * 3.5) * 0.018;
      foxRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;
    }

    if (appleRef.current) {
      bite.current -= delta * 0.12;
      if (bite.current < 0.05) bite.current = 1;
      appleScale.current = Math.max(bite.current, 0);
      appleRef.current.scale.setScalar(Math.max(bite.current, 0));
      appleRef.current.position.set(
        0.02 + Math.sin(time * 2.2) * 0.018,
        1.02 + Math.sin(time * 3) * 0.015,
        0.78,
      );
      appleRef.current.rotation.set(0, Math.sin(time * 1.4) * 0.28, Math.sin(time * 2) * 0.08);
    }

    if (bubblesRef.current) {
      bubblesRef.current.position.y = 1.24 + Math.sin(time * 1.4) * 0.03;
    }
  });

  return (
    <group scale={worldScale}>
      <group ref={foxRef}>
        <primitive object={fox} />
        <group ref={bubblesRef} position={[0, 1.24, 0.82]}>
          <Bubbles />
        </group>
        <group ref={appleRef}>
          <primitive object={apple} />
        </group>
        <PawBalls />
        <AppleCrumbs appleScale={appleScale} />
      </group>
    </group>
  );
}

export default function FeedingFox({ homePosition = [0, 0], scale = 1, referenceHeight = 1 }) {
  const worldScale = (referenceHeight * scale) / LOCAL_REFERENCE_HEIGHT;

  return (
    <group position={[homePosition[0], 0, homePosition[1]]}>
      <Suspense fallback={null}>
        <FeedingFoxRig worldScale={worldScale} />
      </Suspense>
    </group>
  );
}

useGLTF.preload(foxAsset.url);