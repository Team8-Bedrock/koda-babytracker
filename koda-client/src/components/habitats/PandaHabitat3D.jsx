import React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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


const PANDA_HEIGHT = 0.3;
const PANDA_POSITION = [0.02, 0.74];
const PANDA_MODEL_URL = "/models/characters/panda/panda.glb";

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
  background: "#5cc198",
  fog: "#5cc198",
  fogNear: 5,
  fogFar: 13,
  sun: "#f4fff6",
  rimLight: "#bfeee0",
  hemiSky: "#dcfaee",
  hemiGround: "#1e4a3c",
  water: "#2e9e8f",
  waterShallow: "#6fd0be",
  rock: "#6f83a0",
  rockDark: "#5a6c88",
  moss: "#6fae6a",
  mossDark: "#4f8a52",
  foam: "#f2fcfa",
};

const FLOOR_TEX_SIZE = 512;

function buildMossFloorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = FLOOR_TEX_SIZE;
  canvas.height = FLOOR_TEX_SIZE;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "hsl(152, 50%, 52%)";
  ctx.fillRect(0, 0, FLOOR_TEX_SIZE, FLOOR_TEX_SIZE);

  for (let i = 0; i < 46; i++) {
    const seed = i * 61 + 3;
    const bx = (seed * 37) % FLOOR_TEX_SIZE;
    const by = (seed * 53) % FLOOR_TEX_SIZE;
    const radius = 42 + (seed % 5) * 20;
    const hue = 150 + (seed % 9) * 3;
    const light = 44 + (seed % 6) * 4;
    drawWrapped(ctx, bx, by, FLOOR_TEX_SIZE, radius, (x, y) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `hsla(${hue}, 50%, ${light}%, 0.5)`);
      grad.addColorStop(1, `hsla(${hue}, 50%, ${light}%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  for (let i = 0; i < 300; i++) {
    const seed = i * 17 + 9;
    const bx = (seed * 31) % FLOOR_TEX_SIZE;
    const by = (seed * 47) % FLOOR_TEX_SIZE;
    const hue = 130 + (seed % 10) * 3;
    const light = 58 + (seed % 8) * 3;
    ctx.fillStyle = `hsla(${hue}, 46%, ${light}%, 0.5)`;
    drawWrapped(ctx, bx, by, FLOOR_TEX_SIZE, 6, (x, y) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((seed % 12) * 0.26);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.1, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  for (let i = 0; i < 40; i++) {
    const seed = i * 71 + 5;
    const dx = (seed * 17) % FLOOR_TEX_SIZE;
    const dy = (seed * 41) % FLOOR_TEX_SIZE;
    drawWrapped(ctx, dx, dy, FLOOR_TEX_SIZE, 4, (x, y) => {
      ctx.fillStyle = "rgba(235,250,244,0.5)";
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
  const tex = useMemo(() => buildMossFloorTexture(), []);
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

function buildBambooTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#57b884";
  ctx.fillRect(0, 0, 32, 256);
  ctx.fillStyle = "rgba(38,105,76,0.6)";
  for (let y = 0; y < 256; y += 34) ctx.fillRect(0, y, 32, 5);
  ctx.fillStyle = "rgba(205,245,220,0.35)";
  ctx.fillRect(6, 0, 3, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function BambooStalk({ position, height, tilt = 0, leafCount = 3 }) {
  const tex = useMemo(() => buildBambooTexture(), []);
  const ref = useRef(null);
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = tilt + Math.sin(clock.getElapsedTime() * 0.5 + phase) * 0.025;
  });
  const leaves = useMemo(
    () =>
      Array.from({ length: leafCount }).map((_, i) => {
        const a = (i / leafCount) * Math.PI * 2 + phase;
        const h = height * (0.88 + (i % 3) * 0.04);
        return {
          position: [Math.cos(a) * 0.07, h, Math.sin(a) * 0.07],
          rotation: [0.9, a, 0],
          scale: 0.8 + (i % 2) * 0.15,
        };
      }),
    [leafCount, height, phase],
  );
  return (
    <group position={position} ref={ref}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.035, 0.05, height, 8]} />
        <meshStandardMaterial map={tex} roughness={0.75} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh key={i} position={l.position} rotation={l.rotation} scale={l.scale} castShadow>
          <coneGeometry args={[0.04, 0.26, 3]} />
          <meshStandardMaterial color="#96e0ae" roughness={0.7} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

const BAMBOO_PLACEMENTS = (() => {
  const out = [];
  for (let i = 0; i < 54; i++) {
    const seed = i * 29 + 11;
    const x = -0.35 + (seededRand(seed) - 0.5) * 3.4;
    const z = -1.35 + (seededRand(seed * 1.7) - 0.5) * 1.5;
    out.push({
      position: [x, 0, z],
      height: 1.7 + seededRand(seed * 2.3) * 1.5,
      tilt: (seededRand(seed * 3.1) - 0.5) * 0.1,
      leafCount: 2 + Math.floor(seededRand(seed * 4.5) * 2),
    });
  }
  return out;
})();

function BambooGrove() {
  return (
    <>
      {BAMBOO_PLACEMENTS.map((b, i) => (
        <BambooStalk key={i} {...b} />
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
  grad.addColorStop(0, "rgba(45,100,80,0.9)");
  grad.addColorStop(0.6, "rgba(45,100,80,0.6)");
  grad.addColorStop(1, "rgba(45,100,80,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const SHOOT_PLACEMENTS = [
  { x: 0.52, z: 0.2, rotation: 0.3, height: 0.4 },
  { x: 0.63, z: 0.05, rotation: 1.4, height: 0.3 },
  { x: 0.44, z: 0.02, rotation: 2.5, height: 0.45 },
  { x: 0.7, z: 0.26, rotation: 0.8, height: 0.28 },
];

function BambooShootPatch() {
  const mound = useMemo(() => buildMoundTexture(), []);
  const tex = useMemo(() => buildBambooTexture(), []);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.57, 0.014, 0.13]}>
        <circleGeometry args={[0.7, 24]} />
        <meshStandardMaterial map={mound} transparent depthWrite={false} roughness={1} />
      </mesh>
      {SHOOT_PLACEMENTS.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.rotation, 0.06]}>
          <mesh position={[0, s.height / 2, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.06, s.height, 8]} />
            <meshStandardMaterial map={tex} roughness={0.75} />
          </mesh>
          <mesh position={[0, s.height, 0]}>
            <circleGeometry args={[0.045, 8]} />
            <meshStandardMaterial color="#cdeecb" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </>
  );
}

const ROCK_PLACEMENTS = [
  { position: [0.95, 0.13, -0.4], scale: 0.2, rotation: 0.4 },
  { position: [1.0, 0.1, 0.45], scale: 0.15, rotation: 1.6 },
  { position: [-0.28, 0.09, 0.9], scale: 0.13, rotation: 0.9 },
  { position: [0.72, 0.12, 1.15], scale: 0.19, rotation: 2.1 },
  { position: [-0.95, 0.09, 1.05], scale: 0.14, rotation: 1.1 },
  { position: [0.3, 0.07, 1.45], scale: 0.11, rotation: 0.2 },
];

function MossyRock({ position, scale, rotation, dark }) {
  return (
    <group position={position} rotation={[0.15, rotation, 0.1]} scale={scale}>
      <mesh castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={dark ? PALETTE.rockDark : PALETTE.rock} roughness={0.85} />
      </mesh>
      <mesh position={[0.05, 0.5, -0.05]} scale={[0.78, 0.24, 0.72]} receiveShadow>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color={PALETTE.moss} roughness={1} />
      </mesh>
      <mesh position={[-0.42, 0.28, 0.3]} scale={[0.36, 0.14, 0.32]} receiveShadow>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color={PALETTE.mossDark} roughness={1} />
      </mesh>
    </group>
  );
}

function Rocks() {
  return (
    <>
      {ROCK_PLACEMENTS.map((r, i) => (
        <MossyRock key={i} {...r} dark={i % 2 === 0} />
      ))}
    </>
  );
}

const POND_CENTER = [-0.58, 0, -0.42];
const POND_RADIUS = 0.46;

const POND_BORDER_ROCKS = (() => {
  const rocks = [];
  const count = 13;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const wobble = ((i * 37) % 10) / 100;
    const r = POND_RADIUS + 0.11 + wobble;
    rocks.push({
      position: [
        POND_CENTER[0] + Math.cos(a) * r,
        0.05 + wobble * 0.3,
        POND_CENTER[2] + Math.sin(a) * r,
      ],
      scale: 0.12 + wobble * 0.45,
      rotation: a,
    });
  }
  return rocks;
})();

function buildWaterfallTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#c9f2ef";
  ctx.fillRect(0, 0, 64, 256);
  const sheen = ctx.createLinearGradient(0, 0, 64, 0);
  sheen.addColorStop(0, "rgba(255,255,255,0.35)");
  sheen.addColorStop(0.35, "rgba(255,255,255,0)");
  sheen.addColorStop(0.75, "rgba(140,205,200,0.25)");
  sheen.addColorStop(1, "rgba(255,255,255,0.2)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, 64, 256);

  for (let i = 0; i < 16; i++) {
    const seed = i * 13 + 5;
    const x = (seed * 17) % 64;
    const w = 1 + (seed % 3);
    ctx.fillStyle = `rgba(255,255,255,${0.18 + (seed % 4) * 0.07})`;
    ctx.fillRect(x, 0, w, 256);
  }
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  for (let i = 0; i < 30; i++) {
    const seed = i * 29 + 3;
    const x = (seed * 23) % 60;
    const y = (seed * 31) % 256;
    for (const yy of [y, y - 256]) {
      ctx.beginPath();
      ctx.ellipse(x, yy, 2 + (seed % 3), 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1.5);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Waterfall() {
  const tex = useMemo(() => buildWaterfallTexture(), []);
  const splashRef = useRef(null);
  const mistRef = useRef(null);
  const x = POND_CENTER[0] + 0.08;
  const z = POND_CENTER[2] - 0.5;
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    tex.offset.y = (t * 0.55) % 1;
    if (splashRef.current) {
      const s = 1 + Math.sin(t * 3.2) * 0.12;
      splashRef.current.scale.set(s, s, 1);
      splashRef.current.material.opacity = 0.5 + Math.sin(t * 3.2) * 0.12;
    }
    if (mistRef.current) {
      const c = (t * 0.4) % 1;
      mistRef.current.position.y = 0.06 + c * 0.28;
      mistRef.current.material.opacity = 0.35 * (1 - c);
      mistRef.current.scale.setScalar(0.5 + c * 0.9);
    }
  });
  return (
    <>
      <group position={[x, 0.45, z - 0.12]} rotation={[0, 0.25, 0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.7, 0.9, 0.42]} />
          <meshStandardMaterial color={PALETTE.rock} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.47, 0]} scale={[0.34, 0.1, 0.2]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color={PALETTE.moss} roughness={1} />
        </mesh>
        <mesh position={[0.22, 0.44, 0.1]} scale={[0.12, 0.06, 0.1]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={PALETTE.mossDark} roughness={1} />
        </mesh>
        <mesh position={[-0.2, 0.3, 0.18]} scale={[0.12, 0.07, 0.09]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={PALETTE.moss} roughness={1} />
        </mesh>
      </group>
      <mesh position={[x, 0.905, z - 0.12]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 20]} />
        <meshBasicMaterial color={PALETTE.waterShallow} transparent opacity={0.9} />
      </mesh>
      <mesh position={[x, 0.44, z + 0.1]}>
        <planeGeometry args={[0.34, 0.92]} />
        <meshBasicMaterial map={tex} transparent opacity={0.92} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[x, 0.42, z + 0.135]}>
        <planeGeometry args={[0.2, 0.86]} />
        <meshBasicMaterial color="#eafcf9" transparent opacity={0.45} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[x, 0.9, z + 0.1]} rotation={[0, 0, Math.PI / 2]}>
        <capsuleGeometry args={[0.045, 0.24, 4, 10]} />
        <meshBasicMaterial color={PALETTE.foam} transparent opacity={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.035, z + 0.24]}>
        <circleGeometry args={[0.17, 20]} />
        <meshBasicMaterial color={PALETTE.foam} transparent opacity={0.75} />
      </mesh>
      <mesh ref={splashRef} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.045, z + 0.24]}>
        <ringGeometry args={[0.14, 0.22, 20]} />
        <meshBasicMaterial color={PALETTE.foam} transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={mistRef} position={[x, 0.06, z + 0.2]}>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshBasicMaterial color="#eafaf4" transparent opacity={0.3} depthWrite={false} />
      </mesh>
    </>
  );
}

function Pond() {
  const waterRef = useRef(null);
  useFrame(({ clock }) => {
    const mat = waterRef.current?.material;
    if (mat) mat.opacity = 0.92 + Math.sin(clock.getElapsedTime() * 0.6) * 0.03;
  });
  return (
    <>
      <mesh
        ref={waterRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[POND_CENTER[0], 0.03, POND_CENTER[2]]}
      >
        <circleGeometry args={[POND_RADIUS, 32]} />
        <meshStandardMaterial color={PALETTE.water} roughness={0.25} transparent opacity={0.92} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[POND_CENTER[0] - 0.22, 0.035, POND_CENTER[2] - 0.18]}
      >
        <circleGeometry args={[POND_RADIUS * 0.42, 24]} />
        <meshStandardMaterial
          color={PALETTE.waterShallow}
          roughness={0.3}
          transparent
          opacity={0.55}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0.5]} position={[POND_CENTER[0] + 0.2, 0.045, POND_CENTER[2] + 0.12]}>
        <circleGeometry args={[0.13, 20, 0.4, Math.PI * 2 - 0.8]} />
        <meshStandardMaterial color="#4f9e63" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 2.2]} position={[POND_CENTER[0] - 0.12, 0.045, POND_CENTER[2] + 0.26]}>
        <circleGeometry args={[0.09, 18, 0.4, Math.PI * 2 - 0.8]} />
        <meshStandardMaterial color="#5fb371" roughness={0.7} side={THREE.DoubleSide} />
      </mesh>
      <group position={[POND_CENTER[0] + 0.2, 0.06, POND_CENTER[2] + 0.12]}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.028, 0.015, Math.sin(a) * 0.028]}
              rotation={[0.7, a, 0]}
            >
              <coneGeometry args={[0.018, 0.05, 4]} />
              <meshStandardMaterial color="#ffb9d6" roughness={0.5} />
            </mesh>
          );
        })}
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.016, 8, 8]} />
          <meshStandardMaterial color="#ffe38a" roughness={0.5} />
        </mesh>
      </group>
      {POND_BORDER_ROCKS.map((r, i) => (
        <MossyRock key={i} {...r} dark={i % 2 === 1} />
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
    ref.current.material.opacity = 0.16 + Math.sin(t * 1.3) * 0.05;
  });
  return (
    <mesh ref={ref} scale={scale}>
      <sphereGeometry args={[0.6, 12, 12]} />
      <meshBasicMaterial color="#eaf7f0" transparent opacity={0.18} depthWrite={false} />
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

const PETAL_COLORS = ["#ffb7d5", "#ffcfe3", "#ffe1ee"];

function Petal({ radius, speed, phase, colorIndex }) {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() * speed + phase) % 8;
    const cycle = t / 8;
    ref.current.position.set(
      Math.sin(t * 0.8 + phase) * radius,
      1.7 - cycle * 1.7,
      Math.cos(t * 0.6 + phase) * radius,
    );
    ref.current.rotation.z = Math.sin(t * 2) * 0.8;
    ref.current.rotation.x = Math.cos(t * 1.6) * 0.6 + 1.2;
  });
  return (
    <mesh ref={ref} scale={[0.55, 1, 1]}>
      <circleGeometry args={[0.028, 8]} />
      <meshStandardMaterial
        color={PETAL_COLORS[colorIndex % PETAL_COLORS.length]}
        side={THREE.DoubleSide}
        roughness={0.5}
      />
    </mesh>
  );
}

function Petals() {
  const petals = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, i) => ({
        radius: 0.5 + seededRand(i * 3.3) * 1.1,
        speed: 0.2 + seededRand(i * 5.5) * 0.18,
        phase: seededRand(i * 7.7) * 8,
        colorIndex: i,
      })),
    [],
  );
  return (
    <>
      {petals.map((p, i) => (
        <Petal key={i} {...p} />
      ))}
    </>
  );
}

const FLECK_COLORS = ["#ffd9e8", "#ffe9f2", "#ffc7dd", "#e2f3d2", "#ffd9e8"];

const FLECK_PLACEMENTS = (() => {
  const out = [];
  for (let i = 0; i < 54; i++) {
    const seed = i * 19 + 7;
    const x = (seededRand(seed) - 0.5) * 3;
    const z = (seededRand(seed * 1.9) - 0.5) * 3;
    if (Math.hypot(x - POND_CENTER[0], z - POND_CENTER[2]) < POND_RADIUS + 0.25) continue;
    if (Math.hypot(x, z) < 0.4) continue;
    out.push({
      position: [x, 0.015, z],
      scale: 0.045 + seededRand(seed * 2.7) * 0.04,
      color: FLECK_COLORS[i % FLECK_COLORS.length],
      rotation: seededRand(seed * 3.3) * Math.PI,
    });
  }
  return out;
})();

function TinyDaisy({ position }) {
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.028, Math.sin(a) * 0.028, 0]}
            rotation={[0, 0, a]}
            scale={[1.8, 1, 1]}
          >
            <circleGeometry args={[0.016, 8]} />
            <meshStandardMaterial color="#fff6fa" roughness={0.6} />
          </mesh>
        );
      })}
      <mesh>
        <circleGeometry args={[0.014, 8]} />
        <meshStandardMaterial color="#ffce54" roughness={0.6} />
      </mesh>
    </group>
  );
}

const DAISY_SPOTS = [
  [1.05, 0.02, 0.75],
  [-1.2, 0.02, 0.35],
  [0.25, 0.02, -0.85],
  [-0.35, 0.02, 1.3],
  [1.25, 0.02, -0.05],
];

function FlowerFlecks() {
  return (
    <>
      {FLECK_PLACEMENTS.map((f, i) => (
        <mesh
          key={i}
          position={f.position}
          rotation={[-Math.PI / 2, 0, f.rotation]}
          scale={[1.9, 1, 1]}
        >
          <circleGeometry args={[f.scale, 12]} />
          <meshStandardMaterial color={f.color} roughness={0.6} />
        </mesh>
      ))}
      {DAISY_SPOTS.map((p, i) => (
        <TinyDaisy key={`d${i}`} position={p} />
      ))}
    </>
  );
}

function Panda({ modelUrl, position = PANDA_POSITION, onMunch }) {
  const group = useRef(null);
  const body = useRef(null);
  const nextMunch = useRef(1.5 + Math.random() * 2);
  const nextGlance = useRef(1 + Math.random() * 2);
  const glance = useRef(0);

  const gltf = useGLTF(modelUrl);

  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const scale = PANDA_HEIGHT / size.y;
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
        <primitive object={model} />
      </group>
    </group>
  );
}

class PandaErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("Panda model failed to load:", error);
  }

  render() {
    if (this.state.failed) {
      return <Panda modelUrl={PANDA_MODEL_URL} position={this.props.position} onMunch={this.props.onMunch} />;
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
    <mesh
      ref={ref}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[position[0], 0.03, position[1]]}
    >
      <ringGeometry args={[0.08, 0.14, 5]} />
      <meshBasicMaterial color="#bdeeb0" transparent opacity={0.5} side={THREE.DoubleSide} />
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

export function PandaHabitat3D() {
  const [puffs, setPuffs] = useState([]);

  const addPuff = (position) =>
    setPuffs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, position }]);
  const removePuff = (id) => setPuffs((prev) => prev.filter((p) => p.id !== id));

  useEffect(() => {
    useGLTF.preload(PANDA_MODEL_URL);
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
      <directionalLight position={[-5, 3, -4]} intensity={0.3} color={PALETTE.rimLight} />
      <hemisphereLight args={[PALETTE.hemiSky, PALETTE.hemiGround, 1.0]} />

      <Suspense fallback={null}>
        <group position={[0, -0.18, 0]}>
          <Ground />
          <BambooGrove />
          <BambooShootPatch />
          <Rocks />
          <Pond />
          <Waterfall />
          <FlowerFlecks />
          <MistWisps />
          <Petals />
          {puffs.map((p) => (
            <LeafPuff key={p.id} position={p.position} onDone={() => removePuff(p.id)} />
          ))}
          <HideWhenAnimated><PandaErrorBoundary position={PANDA_POSITION} onMunch={addPuff}>
            <Panda modelUrl={PANDA_MODEL_URL} position={PANDA_POSITION} onMunch={addPuff} />
          </PandaErrorBoundary></HideWhenAnimated>
        </group>
      </Suspense>
    </Canvas>
  );
}

export default PandaHabitat3D;