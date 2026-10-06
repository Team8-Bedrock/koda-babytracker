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
  g.addColorStop(0, "rgba(120,190,90,0.1)");
  g.addColorStop(0.85, "rgba(70,150,60,0.22)");
  g.addColorStop(1, "rgba(45,120,45,0.6)");
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

function useFly(targetHeight) {
  return useMemo(() => {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: "#1c1a17", roughness: 0.4, metalness: 0.2 });

    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(targetHeight * 0.32, 10, 8), bodyMat);
    abdomen.scale.set(1, 0.85, 1.3);
    abdomen.castShadow = true;
    group.add(abdomen);

    const head = new THREE.Mesh(new THREE.SphereGeometry(targetHeight * 0.2, 10, 8), bodyMat);
    head.position.z = targetHeight * 0.4;
    head.castShadow = true;
    group.add(head);

    const eyeMat = new THREE.MeshStandardMaterial({ color: "#7a1f2b", roughness: 0.2, metalness: 0.3 });
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(targetHeight * 0.1, 8, 6), eyeMat);
      eye.position.set(side * targetHeight * 0.14, 0, targetHeight * 0.46);
      group.add(eye);
    });

    const wingMat = new THREE.MeshStandardMaterial({
      color: "#cfe8f0",
      transparent: true,
      opacity: 0.45,
      roughness: 0.3,
      side: THREE.DoubleSide,
    });
    [-1, 1].forEach((side) => {
      const wing = new THREE.Mesh(new THREE.CircleGeometry(targetHeight * 0.45, 12), wingMat);
      wing.position.set(side * targetHeight * 0.2, targetHeight * 0.15, 0);
      wing.rotation.y = side * 0.5;
      wing.rotation.x = -0.2;
      wing.scale.set(0.6, 1, 1);
      group.add(wing);
    });

    return group;
  }, [targetHeight]);
}

function FeedingFrogRig({ worldScale }) {
  const frog = useNormalized("/models/characters/frog/feeding.glb", LOCAL_REFERENCE_HEIGHT);
  const fly = useFly(LOCAL_REFERENCE_HEIGHT * 0.1);

  const frogRef = useRef(null);
  const flyRef = useRef(null);
  const symbolsRef = useRef(null);
  const bite = useRef(1);
  const chewing = true;

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;
    const chewSpeed = 7;
    const chew = Math.sin(t * chewSpeed) * 0.5 + 0.5;

    if (frogRef.current) {
      const breathe = Math.sin(t * 1.6) * 0.015;
      frogRef.current.scale.set(
        1 + chew * 0.05 + breathe * 0.5,
        1 - chew * 0.06 + breathe,
        1 + chew * 0.05 + breathe * 0.5,
      );
      frogRef.current.position.y = -chew * 0.03;
      frogRef.current.rotation.z = Math.sin(t * chewSpeed * 0.5) * 0.02;
      frogRef.current.rotation.y = Math.sin(t * 0.5) * 0.12;
    }

    if (flyRef.current) {

      bite.current -= dt * 0.12;
      if (bite.current < 0.05) bite.current = 1;
      const b = Math.max(bite.current, 0);
      flyRef.current.scale.setScalar(THREE.MathUtils.lerp(0, 1, b));
      flyRef.current.position.set(0.02, 0.7 + Math.sin(t * 3) * 0.02, 0.36);
      flyRef.current.rotation.set(0, t * 2, 0);
    }

    if (symbolsRef.current) {
      symbolsRef.current.position.y = 1.25 + Math.sin(t * 1.4) * 0.03;
    }
  });

  return (
    <group scale={worldScale}>
      <group ref={frogRef}>
        <primitive object={frog} />
        <group ref={symbolsRef}>
          <Bubbles chewing={chewing} />
        </group>
        <group ref={flyRef}>
          <primitive object={fly} />
        </group>
      </group>
    </group>
  );
}

export default function FeedingFrog({ homePosition = [0, 0], scale = 1, referenceHeight = 1 }) {
  const worldScale = (referenceHeight * scale) / LOCAL_REFERENCE_HEIGHT;
  return (
    <group position={[homePosition[0], 0, homePosition[1]]}>
      <Suspense fallback={null}>
        <FeedingFrogRig worldScale={worldScale} />
      </Suspense>
    </group>
  );
}

useGLTF.preload("/models/characters/frog/feeding.glb");