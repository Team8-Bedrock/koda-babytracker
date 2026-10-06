import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

function HideWhenAnimated({ children }) {
  const [hidden, setHidden] = React.useState(() => typeof window !== "undefined" && !!window.__moodAnimationActive);
  React.useEffect(() => {
    const onChange = (e) => setHidden(!!e.detail?.active);
    window.addEventListener("mood-animation", onChange);
    return () => window.removeEventListener("mood-animation", onChange);
  }, []);
  return hidden ? null : children;
}


const FOX_HEIGHT = 0.3;

const FOX_POSITION = [0.13,2.50];
const FOX_MODEL = "/models/characters/fox/fox.glb";

function seededRand(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function drawWrapped(ctx, x, y, size, radius, draw) {
  const offsets = [-size, 0, size];
  for (const ox of offsets) {
    for (const oy of offsets) {
      const px = x + ox;
      const py = y + oy;
      if (px < -radius || px > size + radius) continue;
      if (py < -radius || py > size + radius) continue;
      draw(px, py);
    }
  }
}

const PALETTE = {
  background: "#f5b04a",
  fog: "#f5b04a",
  fogNear: 5,
  fogFar: 13,
  sun: "#fff2d9",
  rimLight: "#ffd9a8",
  hemiSky: "#ffe9c4",
  hemiGround: "#7a3d1a",
  leaf1: "#e8801f",
  leaf2: "#d94f14",
  leaf3: "#f4b83e",
  leaf4: "#c33a16",
  canopy1: "#e86f1c",
  canopy2: "#f29a26",
  canopy3: "#d94f14",
  bark: "#f2ece1",
  barkShadow: "#d8cfc0",
  rock: "#9a8b7a",
  rockDark: "#7d6f60",
  grassTuft: "#d9a23a",
};

const FLOOR_TEX_SIZE = 512;

function buildLeafLitterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = FLOOR_TEX_SIZE;
  canvas.height = FLOOR_TEX_SIZE;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "hsl(28, 68%, 46%)";
  ctx.fillRect(0, 0, FLOOR_TEX_SIZE, FLOOR_TEX_SIZE);

  for (let i = 0; i < 40; i++) {
    const seed = i * 61 + 3;
    const bx = (seed * 37) % FLOOR_TEX_SIZE;
    const by = (seed * 53) % FLOOR_TEX_SIZE;
    const radius = 38 + (seed % 5) * 20;
    const hue = 26 + (seed % 8) * 3;
    const light = 42 + (seed % 6) * 4;
    drawWrapped(ctx, bx, by, FLOOR_TEX_SIZE, radius, (x, y) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `hsla(${hue}, 70%, ${light}%, 0.5)`);
      grad.addColorStop(1, `hsla(${hue}, 70%, ${light}%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  for (let i = 0; i < 320; i++) {
    const seed = i * 17 + 9;
    const bx = (seed * 31) % FLOOR_TEX_SIZE;
    const by = (seed * 47) % FLOOR_TEX_SIZE;
    const hue = 12 + (seed % 10) * 4;
    const light = 46 + (seed % 8) * 4;
    ctx.fillStyle = `hsla(${hue}, 75%, ${light}%, 0.55)`;
    drawWrapped(ctx, bx, by, FLOOR_TEX_SIZE, 6, (x, y) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((seed % 12) * 0.26);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.3, 5.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  for (let i = 0; i < 40; i++) {
    const seed = i * 71 + 5;
    const dx = (seed * 17) % FLOOR_TEX_SIZE;
    const dy = (seed * 41) % FLOOR_TEX_SIZE;
    drawWrapped(ctx, dx, dy, FLOOR_TEX_SIZE, 4, (x, y) => {
      ctx.fillStyle = "rgba(255,226,150,0.5)";
      ctx.beginPath();
      ctx.arc(x, y, 1.1, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const GROUND_SIZE = 9;

function Ground() {
  const tex = useMemo(() => buildLeafLitterTexture(), []);
  useEffect(() => {
    tex.repeat.set(GROUND_SIZE / 2.6, GROUND_SIZE / 2.6);
  }, [tex]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      <meshStandardMaterial map={tex} />
    </mesh>
  );
}

function buildBirchTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = PALETTE.bark;
  ctx.fillRect(0, 0, 32, 256);
  ctx.fillStyle = "rgba(180,168,150,0.5)";
  for (let y = 0; y < 256; y += 24) ctx.fillRect(0, y, 32, 2);
  ctx.fillStyle = "rgba(45,38,32,0.85)";
  for (let i = 0; i < 26; i++) {
    const seed = i * 23 + 7;
    const y = (seed * 37) % 256;
    const x = (seed * 13) % 24;
    const w = 4 + (seed % 8);
    const h = 1.5 + (seed % 3);
    ctx.fillRect(x, y, w, h);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const CANOPY_COLORS = [PALETTE.canopy1, PALETTE.canopy2, PALETTE.canopy3, PALETTE.leaf3];

function BirchTree({ position, height, tilt = 0, canopyScale = 1, seed = 1 }) {
  const tex = useMemo(() => buildBirchTexture(), []);
  const ref = useRef(null);
  const phase = useMemo(() => seededRand(seed) * Math.PI * 2, [seed]);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = tilt + Math.sin(clock.getElapsedTime() * 0.5 + phase) * 0.015;
  });

  const canopy = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + phase + seededRand(seed + i * 5) * 0.6;
        const r = height * (0.1 + seededRand(seed + i * 3) * 0.14) * canopyScale;
        return {
          position: [
            Math.cos(a) * r,
            height * (0.74 + seededRand(seed + i) * 0.3),
            Math.sin(a) * r,
          ],
          scale: height * (0.16 + seededRand(seed + i * 7) * 0.14) * canopyScale,
          color: CANOPY_COLORS[i % CANOPY_COLORS.length],
        };
      }),
    [height, phase, canopyScale, seed],
  );
  return (
    <group position={position} ref={ref}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[height * 0.045, height * 0.07, height, 8]} />
        <meshStandardMaterial map={tex} roughness={0.75} />
      </mesh>
      {/* small branch stubs poking out below the canopy, for silhouette */}
      <mesh position={[height * 0.05, height * 0.7, 0]} rotation={[0, 0, -0.65]} castShadow>
        <cylinderGeometry args={[height * 0.012, height * 0.02, height * 0.22, 6]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
      <mesh position={[-height * 0.045, height * 0.78, height * 0.02]} rotation={[0, 0, 0.6]} castShadow>
        <cylinderGeometry args={[height * 0.01, height * 0.017, height * 0.18, 6]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
      <group>
        {canopy.map((c, i) => (
          <mesh key={i} position={c.position} scale={c.scale} castShadow>
            <icosahedronGeometry args={[1, 1]} />
            <meshStandardMaterial color={c.color} roughness={0.9} flatShading />
          </mesh>
        ))}
      </group>
    </group>
  );
}

const BIRCH_PLACEMENTS = [
  { position: [-0.55, 0, -0.72], height: 0.5, tilt: 0.02, canopyScale: 1.0, seed: 2 },
  { position: [0.5, 0, -0.4], height: 0.54, tilt: -0.015, canopyScale: 0.92, seed: 7 },
  { position: [0.14, 0, -0.8], height: 0.58, tilt: 0.01, canopyScale: 1.05, seed: 13 },
  { position: [-0.65, 0, 0.2], height: 0.44, tilt: 0.02, canopyScale: 0.85, seed: 19 },
  { position: [0.58, 0, 0.18], height: 0.46, tilt: -0.02, canopyScale: 0.9, seed: 24 },
  { position: [-0.18, 0, -0.9], height: 0.52, tilt: 0.015, canopyScale: 0.95, seed: 31 },
  { position: [-0.82, 0, -0.28], height: 0.48, tilt: -0.01, canopyScale: 0.88, seed: 38 },
  { position: [0.78, 0, -0.12], height: 0.5, tilt: 0.02, canopyScale: 0.92, seed: 44 },
  { position: [-1.15, 0, -1.05], height: 0.62, tilt: 0.012, canopyScale: 1.1, seed: 51 },
  { position: [1.1, 0, -0.85], height: 0.56, tilt: -0.018, canopyScale: 0.98, seed: 58 },
  { position: [-1.35, 0, 0.55], height: 0.4, tilt: 0.02, canopyScale: 0.8, seed: 65 },
  { position: [1.25, 0, 0.5], height: 0.45, tilt: -0.015, canopyScale: 0.86, seed: 72 },
  { position: [0.05, 0, -1.35], height: 0.66, tilt: 0.01, canopyScale: 1.12, seed: 79 },
  { position: [-0.4, 0, -1.4], height: 0.5, tilt: -0.02, canopyScale: 0.9, seed: 86 },
];

function BirchGrove() {
  return (
    <>
      {BIRCH_PLACEMENTS.map((b, i) => (
        <BirchTree key={i} {...b} />
      ))}
    </>
  );
}

function buildMoundTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, "rgba(120,66,24,0.9)");
  grad.addColorStop(0.6, "rgba(120,66,24,0.6)");
  grad.addColorStop(1, "rgba(120,66,24,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function FoxDen() {
  const mound = useMemo(() => buildMoundTexture(), []);
  return (
    <group position={[-0.55, 0, 0.42]} rotation={[0, 0.6, 0]}>
      <mesh position={[0, 0.11, -0.06]} scale={[0.42, 0.16, 0.3]} castShadow receiveShadow>
        <sphereGeometry args={[1, 16, 12]} />
        <meshStandardMaterial color="#8a5a28" roughness={1} />
      </mesh>
      <mesh position={[0, 0.06, 0.16]} rotation={[0.35, 0, 0]}>
        <circleGeometry args={[0.1, 16]} />
        <meshStandardMaterial color="#2c1a0c" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.2]}>
        <circleGeometry args={[0.34, 20]} />
        <meshStandardMaterial map={mound} transparent depthWrite={false} roughness={1} />
      </mesh>
    </group>
  );
}

const ROCK_PLACEMENTS = [
  { position: [0.95, 0.13, -0.4], scale: 0.2, rotation: 0.4 },
  { position: [1.0, 0.1, 0.45], scale: 0.15, rotation: 1.6 },
  { position: [-0.28, 0.09, 0.9], scale: 0.13, rotation: 0.9 },
  { position: [0.72, 0.12, 1.15], scale: 0.19, rotation: 2.1 },
  { position: [-1.05, 0.09, -0.15], scale: 0.14, rotation: 1.1 },
  { position: [0.3, 0.07, 1.45], scale: 0.11, rotation: 0.2 },
];

function AutumnRock({ position, scale, rotation, dark }) {
  return (
    <group position={position} rotation={[0.15, rotation, 0.1]} scale={scale}>
      <mesh castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={dark ? PALETTE.rockDark : PALETTE.rock} roughness={0.85} />
      </mesh>
      {/* a few fallen leaves resting on the rock */}
      <mesh position={[0.15, 0.72, 0]} rotation={[-Math.PI / 2, 0, 0.7]} scale={[1.8, 1, 1]}>
        <circleGeometry args={[0.22, 8]} />
        <meshStandardMaterial color={PALETTE.leaf3} roughness={0.8} />
      </mesh>
      <mesh position={[-0.3, 0.6, 0.2]} rotation={[-Math.PI / 2, 0, 2.1]} scale={[1.8, 1, 1]}>
        <circleGeometry args={[0.16, 8]} />
        <meshStandardMaterial color={PALETTE.leaf2} roughness={0.8} />
      </mesh>
    </group>
  );
}

function Rocks() {
  return (
    <>
      {ROCK_PLACEMENTS.map((r, i) => (
        <AutumnRock key={i} {...r} dark={i % 2 === 0} />
      ))}
    </>
  );
}

function FallenLog({ position, rotation = 0, length = 1.1, scale = 1 }) {
  const tex = useMemo(() => buildBirchTexture(), []);
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 0.075, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.075, 0.085, length, 12]} />
        <meshStandardMaterial map={tex} roughness={0.85} />
      </mesh>
      {/* cut-end rings at both tips */}
      {[-1, 1].map((end) => (
        <mesh key={end} position={[(length / 2) * end, 0.075, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.078, 0.078, 0.012, 12]} />
          <meshStandardMaterial color={PALETTE.barkShadow} roughness={0.9} />
        </mesh>
      ))}
      {/* a couple of small fallen leaves resting on top */}
      <mesh position={[length * 0.15, 0.15, 0.02]} rotation={[-Math.PI / 2, 0, 0.6]} scale={[1.8, 1, 1]}>
        <circleGeometry args={[0.05, 8]} />
        <meshStandardMaterial color={PALETTE.leaf1} roughness={0.8} />
      </mesh>
      <mesh position={[-length * 0.1, 0.15, -0.03]} rotation={[-Math.PI / 2, 0, 2.2]} scale={[1.8, 1, 1]}>
        <circleGeometry args={[0.04, 8]} />
        <meshStandardMaterial color={PALETTE.leaf4} roughness={0.8} />
      </mesh>
    </group>
  );
}

const LOG_PLACEMENTS = [
  { position: [0.95, 0, -0.55], rotation: 0.5, length: 1.15, scale: 1 },
  { position: [-1.0, 0, 0.75], rotation: -0.35, length: 0.9, scale: 0.85 },
];

function FallenLogs() {
  return (
    <>
      {LOG_PLACEMENTS.map((l, i) => (
        <FallenLog key={i} {...l} />
      ))}
    </>
  );
}

const GRASS_PLACEMENTS = (() => {
  const out = [];
  for (let i = 0; i < 26; i++) {
    const seed = i * 41 + 13;
    const x = (seededRand(seed) - 0.5) * 2.6;
    const z = (seededRand(seed * 1.9) - 0.5) * 2.6;
    if (Math.hypot(x, z) < 0.35) continue;
    out.push({
      position: [x, 0, z],
      rotation: seededRand(seed * 2.7) * Math.PI * 2,
      scale: 0.7 + seededRand(seed * 3.3) * 0.6,
    });
  }
  return out;
})();

const GRASS_COLORS = [PALETTE.grassTuft, "#c78f2e", "#e0b358", "#a97a2a"];

function GrassTuft({ position, rotation, scale, seed = 1 }) {
  const blades = useMemo(
    () =>
      Array.from({ length: 5 + Math.floor(seededRand(seed) * 3) }).map((_, i) => {
        const a = seededRand(seed + i * 3) * Math.PI * 2;
        const lean = 0.28 + seededRand(seed + i * 5) * 0.3;
        const h = 0.07 + seededRand(seed + i * 7) * 0.07;
        const r = seededRand(seed + i * 9) * 0.018;
        return {
          position: [Math.cos(a) * r, h / 2, Math.sin(a) * r],
          rotation: [lean * Math.sin(a), a, lean * Math.cos(a)],
          height: h,
          color: GRASS_COLORS[i % GRASS_COLORS.length],
        };
      }),
    [seed],
  );
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {blades.map((b, i) => (
        <mesh key={i} position={b.position} rotation={b.rotation} castShadow>
          <coneGeometry args={[0.008, b.height, 3]} />
          <meshStandardMaterial color={b.color} roughness={0.9} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function GrassTufts() {
  return (
    <>
      {GRASS_PLACEMENTS.map((g, i) => (
        <GrassTuft key={i} {...g} seed={i * 13 + 7} />
      ))}
    </>
  );
}

function MistWisp({ radius, speed, height, phase, scale }) {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + phase;
    ref.current.position.set(Math.cos(t) * radius, height, Math.sin(t) * radius);
    ref.current.material.opacity = 0.14 + Math.sin(t * 1.3) * 0.04;
  });
  return (
    <mesh ref={ref} scale={scale}>
      <sphereGeometry args={[0.6, 12, 12]} />
      <meshBasicMaterial color="#ffedd2" transparent opacity={0.15} depthWrite={false} />
    </mesh>
  );
}

function MistWisps() {
  const wisps = [
    { radius: 1.6, speed: 0.06, height: 0.5, phase: 0, scale: 0.8 },
    { radius: 2.1, speed: 0.05, height: 0.9, phase: 2.1, scale: 1.1 },
    { radius: 1.3, speed: 0.07, height: 0.3, phase: 4.2, scale: 0.65 },
  ];
  return (
    <>
      {wisps.map((w, i) => (
        <MistWisp key={i} {...w} />
      ))}
    </>
  );
}

const LEAF_COLORS = [PALETTE.leaf1, PALETTE.leaf2, PALETTE.leaf3, PALETTE.leaf4];

function FallingLeaf({ radius, speed, phase, colorIndex }) {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() * speed + phase) % 8;
    const cycle = t / 8;
    ref.current.position.set(
      Math.sin(t * 0.8 + phase) * radius,
      1.8 - cycle * 1.8,
      Math.cos(t * 0.6 + phase) * radius,
    );
    ref.current.rotation.z = Math.sin(t * 2) * 0.9;
    ref.current.rotation.x = Math.cos(t * 1.6) * 0.7 + 1.2;
  });
  return (
    <mesh ref={ref} scale={[1.9, 1, 1]}>
      <circleGeometry args={[0.03, 6]} />
      <meshStandardMaterial
        color={LEAF_COLORS[colorIndex % LEAF_COLORS.length]}
        side={THREE.DoubleSide}
        roughness={0.6}
      />
    </mesh>
  );
}

function FallingLeaves() {
  const leaves = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        radius: 0.5 + seededRand(i * 3.3) * 1.2,
        speed: 0.18 + seededRand(i * 5.5) * 0.2,
        phase: seededRand(i * 7.7) * 8,
        colorIndex: i,
      })),
    [],
  );
  return (
    <>
      {leaves.map((l, i) => (
        <FallingLeaf key={i} {...l} />
      ))}
    </>
  );
}

const FLECK_PLACEMENTS = (() => {
  const out = [];
  for (let i = 0; i < 54; i++) {
    const seed = i * 19 + 7;
    const x = (seededRand(seed) - 0.5) * 3;
    const z = (seededRand(seed * 1.9) - 0.5) * 3;
    if (Math.hypot(x, z) < 0.35) continue;
    out.push({
      position: [x, 0.015, z],
      scale: 0.045 + seededRand(seed * 2.7) * 0.04,
      color: LEAF_COLORS[i % LEAF_COLORS.length],
      rotation: seededRand(seed * 3.3) * Math.PI,
    });
  }
  return out;
})();

function FallenLeafLitter() {
  return (
    <>
      {FLECK_PLACEMENTS.map((f, i) => (
        <mesh key={i} position={f.position} rotation={[-Math.PI / 2, 0, f.rotation]} scale={[1.9, 1, 1]}>
          <circleGeometry args={[f.scale, 6]} />
          <meshStandardMaterial color={f.color} roughness={0.7} />
        </mesh>
      ))}
    </>
  );
}


function Fox({ model, position = FOX_POSITION, onMunch }) {
  const group = useRef(null);
  const body = useRef(null);
  const nextMunch = useRef(1 + Math.random() * 2.5);
  const nextGlance = useRef(1 + Math.random() * 2);
  const glance = useRef(0);

  const gltf = useGLTF(model);

  const normalizedModel = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const scale = FOX_HEIGHT / size.y;
    const center = box.getCenter(new THREE.Vector3());
    const wrapper = new THREE.Group();
    clone.position.set(-center.x, -box.min.y, -center.z);
    clone.scale.setScalar(scale);
    clone.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mat = obj.material;
        if (mat && "roughness" in mat) mat.roughness = Math.min(mat.roughness ?? 0.9, 0.9);
      }
    });
    wrapper.add(clone);
    return wrapper;
  }, [gltf.scene]);

  useLayoutEffect(() => {
    if (!group.current) return;
    group.current.rotation.y = 0;
  }, [model]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();

    if (t > nextMunch.current) {
      nextMunch.current = t + 2.5 + Math.random() * 2.5;
      onMunch?.(position);
    }
    const since = nextMunch.current - t;
    const munching = since > 2.15 && since < 2.5;
    const squash = munching ? 1 + Math.sin((2.5 - since) * 22) * 0.06 : 1;
    if (body.current) {
      body.current.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    }

    if (t > nextGlance.current) {
      nextGlance.current = t + 2 + Math.random() * 2.5;
      glance.current = (Math.random() - 0.5) * 0.35;
    }
    group.current.rotation.y += (glance.current - group.current.rotation.y) * 0.04;
    group.current.position.y = Math.sin(t * 1.2) * 0.012;
  });

  return (
    <group ref={group} position={[position[0], 0, position[1]]}>
      <group ref={body}>
        <primitive object={normalizedModel} />
      </group>
    </group>
  );
}

class FoxErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Fox model failed to load:", error);
  }

  render() {
    if (this.state.failed) {
      return <Fox model={FOX_MODEL} position={this.props.position} onMunch={this.props.onMunch} />;
    }
    return this.props.children;
  }
}

function LeafPuff({ position, onDone }) {
  const ref = useRef(null);
  const start = useRef(null);
  const DURATION = 0.55;
  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (start.current === null) start.current = clock.getElapsedTime();
    const elapsed = clock.getElapsedTime() - start.current;
    if (elapsed > DURATION) {
      onDone();
      return;
    }
    const t = elapsed / DURATION;
    ref.current.scale.setScalar(0.15 + t * 0.6);
    ref.current.material.opacity = (1 - t) * 0.5;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.03, position[1]]}>
      <ringGeometry args={[0.08, 0.14, 5]} />
      <meshBasicMaterial color={PALETTE.leaf3} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

const ISO_DISTANCE = 4.4;
const ISO_ELEVATION = Math.atan(1 / Math.sqrt(2)) - 0.05;
const ISO_ZOOM = 320;
const ISO_POSITION = [
  0,
  ISO_DISTANCE * Math.sin(ISO_ELEVATION),
  ISO_DISTANCE * Math.cos(ISO_ELEVATION),
];

export function FoxHabitat3D() {
  const [puffs, setPuffs] = useState([]);

  const addPuff = (position) =>
    setPuffs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, position }]);
  const removePuff = (id) => setPuffs((prev) => prev.filter((p) => p.id !== id));

  useEffect(() => {
    useGLTF.preload(FOX_MODEL);
  }, []);

  return (
    <Canvas
      shadows
      orthographic
      camera={{ position: ISO_POSITION, zoom: ISO_ZOOM, near: 0.1, far: 60 }}
      gl={{ toneMappingExposure: 1.2 }}
      dpr={[1, 2]}
    >
      <color attach="background" args={[PALETTE.background]} />
      <fog attach="fog" args={[PALETTE.fog, PALETTE.fogNear, PALETTE.fogFar]} />

      <ambientLight intensity={1.0} />
      <directionalLight
        position={[5, 8, 3]}
        intensity={1.5}
        color={PALETTE.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <directionalLight position={[-5, 3, -4]} intensity={0.35} color={PALETTE.rimLight} />
      <hemisphereLight args={[PALETTE.hemiSky, PALETTE.hemiGround, 1.0]} />

      <Suspense fallback={null}>
        <group position={[0, -0.18, 0]}>
          <Ground />
          <BirchGrove />
          <FoxDen />
          <Rocks />
          <FallenLogs />
          <GrassTufts />
          <FallenLeafLitter />
          <MistWisps />
          <FallingLeaves />
          {puffs.map((p) => (
            <LeafPuff key={p.id} position={p.position} onDone={() => removePuff(p.id)} />
          ))}
          <HideWhenAnimated><FoxErrorBoundary position={FOX_POSITION} onMunch={addPuff}>
            <Fox model={FOX_MODEL} position={FOX_POSITION} onMunch={addPuff} />
          </FoxErrorBoundary></HideWhenAnimated>
        </group>
      </Suspense>
    </Canvas>
  );
}

export default FoxHabitat3D;