import { Suspense, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LOCAL_REFERENCE_HEIGHT = 1.6;
const MOUTH = [0, 1.13, 0.5];
const TILT = 0.45;
const PAW_SPREAD = 0.075;
const koalaAsset = { url: "/models/characters/koala/koala.glb" };

function usePaws() {
  const koala = useGLTF(koalaAsset.url);
  return useMemo(() => {
    return [koala.scene.children[1], koala.scene.children[2]].filter(Boolean).map((paw) => {
      const p = paw.clone(true);
      p.traverse((child) => {
        if (!child.isMesh) return;
        const m = child.material.clone();
        m.color.setRGB(0.005, 0.005, 0.005);
        m.roughness = 0.48;
        child.material = m;
      });
      return p;
    });
  }, [koala]);
}

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
  g.addColorStop(0, "rgba(0,0,0,0.08)");
  g.addColorStop(0.85, "rgba(25,25,30,0.22)");
  g.addColorStop(1, "rgba(10,10,10,0.7)");
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

function makeSymbolTexture(kind) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 128, 128);
  ctx.translate(64, 64);

  if (kind === "leaf") {
    ctx.rotate(-0.55);
    const g = ctx.createLinearGradient(-42, -16, 42, 16);
    g.addColorStop(0, "#8fdd63");
    g.addColorStop(1, "#3d9a4e");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 42, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.lineTo(38, 0);
    ctx.stroke();
  } else if (kind === "sparkle") {
    ctx.fillStyle = "#ffe9a3";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? 46 : 17;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#ffb7c9";
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.bezierCurveTo(-52, -8, -26, -46, 0, -18);
    ctx.bezierCurveTo(26, -46, 52, -8, 0, 30);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const SYMBOL_COUNT = 9;

function FloatSymbols({ chewing }) {
  const textures = useMemo(() => ["leaf", "sparkle", "heart"].map(makeSymbolTexture), []);
  const refs = useRef([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: SYMBOL_COUNT }, (_, i) => ({
        angle0: (i / SYMBOL_COUNT) * Math.PI * 2,
        radius: 0.4 + ((i * 13) % 10) / 70,
        yBase: 1.28 + ((i * 29) % 10) / 22,
        speed: 0.5 + ((i * 7) % 10) / 22,
        bob: 0.05 + ((i * 19) % 10) / 170,
        phase: (i / SYMBOL_COUNT) * 3.1,
        kind: i % 3,
        size: 0.07 + ((i * 23) % 10) / 250,
      })),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((s, i) => {
      if (!s) return;
      const seed = seeds[i];
      const life = ((t * seed.speed + seed.phase) % 3.4) / 3.4;
      const fade = chewing ? Math.sin(life * Math.PI) : 0;
      const a = seed.angle0 + t * 0.25;
      s.position.set(
        Math.cos(a) * seed.radius,
        seed.yBase + Math.sin(life * Math.PI * 2) * seed.bob + life * 0.1,
        Math.sin(a) * seed.radius * 0.55,
      );
      s.material.opacity = THREE.MathUtils.lerp(s.material.opacity, fade * 0.9, 0.12);
      s.material.rotation = Math.sin(t * 1.2 + i) * 0.25;
      s.scale.setScalar(seed.size * (0.8 + fade * 0.4));
    });
  });

  return (
    <group>
      {seeds.map((seed, i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)}>
          <spriteMaterial map={textures[seed.kind]} transparent opacity={0} depthWrite={false} toneMapped={false} />
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

          <meshStandardMaterial color={i % 3 === 0 ? "#5c7a3f" : "#7a9a52"} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function useBambooStick(targetHeight) {
  return useMemo(() => {
    const group = new THREE.Group();
    const segments = 4;
    const segmentHeight = targetHeight / segments;
    const radius = targetHeight * 0.085;
    const barkMat = new THREE.MeshStandardMaterial({ color: "#2f8f3a", roughness: 0.45 });
    const nodeMat = new THREE.MeshStandardMaterial({ color: "#b8e46a", roughness: 0.6 });

    for (let i = 0; i < segments; i++) {
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, segmentHeight * 0.86, 10),
        barkMat,
      );
      cyl.position.y = i * segmentHeight + segmentHeight * 0.43;
      cyl.castShadow = true;
      cyl.receiveShadow = true;
      group.add(cyl);

      if (i > 0) {
        const node = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.08, radius * 0.22, 6, 12), nodeMat);
        node.rotation.x = Math.PI / 2;
        node.position.y = i * segmentHeight;
        node.castShadow = true;
        group.add(node);
      }
    }

    const leafMat = new THREE.MeshStandardMaterial({ color: "#7fd34e", roughness: 0.6, side: THREE.DoubleSide });
    for (let i = 0; i < 2; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.6, targetHeight * 0.32, 4), leafMat);
      leaf.position.y = targetHeight * (0.08 + i * 0.06);
      leaf.rotation.z = i === 0 ? 0.9 : -0.7;
      leaf.rotation.x = 0.3;
      leaf.scale.set(0.4, 1, 0.12);
      group.add(leaf);
    }

    group.position.y = -targetHeight;
    const outer = new THREE.Group();
    outer.add(group);
    return outer;
  }, [targetHeight]);
}

function FeedingPandaRig({ worldScale }) {
  const panda = useNormalized("/models/characters/panda/feeding.glb", LOCAL_REFERENCE_HEIGHT);
  const paws = usePaws();
  const pawGroups = useMemo(() => {
    const root = panda.children[0];
    const scale = panda.scale.x;
    return paws.map((p) => {
      const holder = new THREE.Group();
      const inner = new THREE.Group();
      inner.add(p.clone(true));
      inner.position.copy(root.position);
      const box = new THREE.Box3().setFromObject(inner);
      const c = new THREE.Vector3();
      box.getCenter(c);
      inner.position.sub(c);
      holder.add(inner);
      holder.scale.setScalar(scale * 0.72);
      return holder;
    });
  }, [panda, paws]);
  const leftPawRef = useRef(null);
  const rightPawRef = useRef(null);
  const bamboo = useBambooStick(LOCAL_REFERENCE_HEIGHT * 0.28);

  const pandaRef = useRef(null);
  const bambooRef = useRef(null);
  const symbolsRef = useRef(null);
  const bite = useRef(1);
  const chewing = true;

  useFrame((state, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const t = state.clock.elapsedTime;
    const chewSpeed = 7;
    const chew = Math.sin(t * chewSpeed) * 0.5 + 0.5;

    if (pandaRef.current) {
      const breathe = Math.sin(t * 1.6) * 0.015;
      pandaRef.current.scale.set(
        1 + chew * 0.05 + breathe * 0.5,
        1 - chew * 0.06 + breathe,
        1 + chew * 0.05 + breathe * 0.5,
      );
      pandaRef.current.position.y = -chew * 0.03;
      pandaRef.current.rotation.z = Math.sin(t * chewSpeed * 0.5) * 0.02;
    }

    if (bambooRef.current) {
      bite.current -= dt * 0.08;
      if (bite.current < 0) bite.current = 1;
      const push = chew * 0.06;
      const b = bite.current;
      bambooRef.current.scale.set(1, THREE.MathUtils.lerp(0.2, 1, b), 1);
      bambooRef.current.position.set(MOUTH[0], MOUTH[1] - push * 0.3, MOUTH[2] + push * 0.3);
      bambooRef.current.rotation.set(-TILT - chew * 0.06, 0, 0.1);
    }
    const len = LOCAL_REFERENCE_HEIGHT * 0.28 * THREE.MathUtils.lerp(0.2, 1, bite.current);
    const reach = Math.max(0.09, len * 0.55);
    const hold = Math.sin(t * chewSpeed) * 0.012;
    const py = MOUTH[1] - reach * Math.cos(TILT) + hold;
    const pz = MOUTH[2] + reach * Math.sin(TILT) + 0.03;
    if (leftPawRef.current) leftPawRef.current.position.set(MOUTH[0] - PAW_SPREAD, py, pz);
    if (rightPawRef.current) rightPawRef.current.position.set(MOUTH[0] + PAW_SPREAD, py - 0.02, pz);

    if (symbolsRef.current) {
      symbolsRef.current.position.y = 1.25 + Math.sin(t * 1.4) * 0.03;
    }
  });

  return (
    <group scale={worldScale}>
      <group ref={pandaRef}>
        <primitive object={panda} />
        <group ref={symbolsRef}>
          <Bubbles chewing={chewing} />
        </group>
        <FloatSymbols chewing={chewing} />
        <Crumbs chewing={chewing} />
        <group ref={leftPawRef}><primitive object={pawGroups[0]} /></group>
        {pawGroups[1] && <group ref={rightPawRef}><primitive object={pawGroups[1]} /></group>}
        <group ref={bambooRef}>
          <primitive object={bamboo} />
        </group>
      </group>
    </group>
  );
}

export default function FeedingPanda({ homePosition = [0, 0], scale = 1, referenceHeight = 1 }) {
  const worldScale = (referenceHeight * scale) / LOCAL_REFERENCE_HEIGHT;
  return (
    <group position={[homePosition[0], 0, homePosition[1]]}>
      <Suspense fallback={null}>
        <FeedingPandaRig worldScale={worldScale} />
      </Suspense>
    </group>
  );
}

useGLTF.preload("/models/characters/panda/feeding.glb");
useGLTF.preload(koalaAsset.url);