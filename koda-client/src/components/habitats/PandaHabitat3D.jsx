import React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import FeedingPanda from "../animations/panda/FeedingPanda";
import AngryPanda from "../animations/panda/AngryPanda";
import CryingPanda from "../animations/panda/CryingPanda";
import HungryPanda from "../animations/panda/HungryPanda";
import SleepyPanda from "../animations/panda/SleepyPanda";
import SleepingPanda from "../animations/panda/SleepingPanda";
import WokePanda from "../animations/panda/WokePanda";
import HappyPanda from "../animations/panda/HappyPanda";
import EnergeticPanda from "../animations/panda/EnergeticPanda";
import QuietPanda from "../animations/panda/QuietPanda";
import OtherPanda from "../animations/panda/OtherPanda";
import PlaytimePanda from "../animations/panda/PlaytimePanda";
import DiaperPanda from "../animations/panda/DiaperPanda";

function useNightMode() {
  const [night, setNight] = React.useState(() => typeof window !== "undefined" && localStorage.getItem("koda-dark-mode") === "true");
  React.useEffect(() => {
    const onMode = (e) => setNight(e && e.detail && typeof e.detail.isDarkMode === "boolean" ? e.detail.isDarkMode : localStorage.getItem("koda-dark-mode") === "true");
    window.addEventListener("koda-dark-mode", onMode);
    return () => window.removeEventListener("koda-dark-mode", onMode);
  }, []);
  return night;
}

function NightStars({ count }) {
  const geo = React.useMemo(() => {
    let s = 42;
    const rnd = () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push(rnd() * 2.1 - 1.05, 0.12 + rnd() * 0.86, rnd() * 4 - 2);
    }
    return new Float32Array(arr);
  }, []);
  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[geo, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#e6edff" size={3} sizeAttenuation={false} transparent opacity={0.85} fog={false} depthWrite={false} />
    </points>
  );
}

function NightSky({ moonRadius }) {
  const { camera } = useThree();
  const sky = React.useRef();
  const stars = React.useRef();
  const moon = React.useRef();
  const dim = React.useRef({ w: 0, h: 0 });
  useFrame(() => {
    if (sky.current) {
      sky.current.matrixAutoUpdate = false;
      sky.current.matrix.copy(camera.matrixWorld);
      sky.current.matrixWorldNeedsUpdate = true;
    }
    const w = ((camera.right - camera.left) / 2) / camera.zoom;
    const h = ((camera.top - camera.bottom) / 2) / camera.zoom;
    if (w && h) {
      if (stars.current && (Math.abs(w - dim.current.w) > 0.001 || Math.abs(h - dim.current.h) > 0.001)) {
        dim.current = { w, h };
        stars.current.scale.set(w, h, 1);
      }
      if (moon.current) moon.current.position.set(-0.58 * w, 0.62 * h, -10);
    }
  });
  return (
    <group ref={sky}>
      <group ref={stars} position={[0, 0, -12]}>
        <NightStars count={110} />
      </group>
      <group ref={moon} position={[-1, 1.5, -10]}>
        <mesh>
          <sphereGeometry args={[moonRadius * 2.1, 20, 20]} />
          <meshBasicMaterial color="#a8bde0" transparent opacity={0.22} fog={false} depthWrite={false} />
        </mesh>
        <mesh>
          <sphereGeometry args={[moonRadius, 20, 20]} />
          <meshBasicMaterial color="#f4f0dd" fog={false} />
        </mesh>
      </group>
    </group>
  );
}

function NightFireflies({ area, count, color, size }) {
  const ref = React.useRef();
  const data = React.useMemo(() => {
    let s = 9;
    const rnd = () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
    return Array.from({ length: count }, () => ({
      x: (rnd() * 2 - 1) * area[0],
      y: area[1] + rnd() * area[2],
      z: (rnd() * 2 - 1) * area[3],
      p: rnd() * 6.28
    }));
  }, []);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.children.forEach((m, i) => {
      const d = data[i];
      m.position.set(d.x + Math.sin(t * 0.5 + d.p) * 0.14, d.y + Math.sin(t * 0.8 + d.p * 1.7) * 0.09, d.z + Math.cos(t * 0.42 + d.p) * 0.14);
      m.material.opacity = 0.35 + Math.abs(Math.sin(t * 2.2 + d.p)) * 0.6;
    });
  });
  return (
    <group ref={ref}>
      {data.map((d, i) => (
        <mesh key={i}>
          <sphereGeometry args={[size, 6, 6]} />
          <meshBasicMaterial color={color} fog={false} transparent opacity={0.9} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// Panda night: its own look, built from the panda's daytime theme —
// a jade-green moonlit bamboo grove, softly glowing pink blossoms and lotus,
// silvery water, peach-glowing stone lanterns and pink sparkle stars.
const NIGHT = {
  background: "#24504f",
  fog: "#24504f",
  ambient: 0.62,
  ambientColor: "#c4e6dc",
  sun: 0.85,
  sunColor: "#d6ecff",
  rim: 0.5,
  rimColor: "#a6d8e8",
  hemiSky: "#9fd0c8",
  hemiGround: "#2f5a52",
  hemiI: 0.75,
  firefly: "#d8ffa0",
  star: "#ffd6e6",
  lantern: "#ffc9a0",
  glow: "#ffb98a",
  water: "#2f7a86",
  waterShallow: "#4f9aa4",
  waterfallTint: "#b3d6dc",
  waterfallSheet: "#c4e4e6",
  waterfall: "#b3d6dc",
  waterLip: "#c4e4e6",
  foamBlob: "#d4ecee",
  foam: "#d4ecee",
  mist: "#b8dcd8",
  rock: "#6f8a8c",
  rockDark: "#5a7476",
  stone: "#8fa6a6",
  moss: "#4f8f78",
  mossDark: "#3e7463",
  leaf: "#79b9a0",
  shootTop: "#b8dcc8",
  lily: "#4f9a7e",
  lily2: "#5aa58a",
  lotus: "#f6b8d2",
  lotusCenter: "#ffe2a0",
  petals: ["#f6bfd6", "#f9d3e3", "#ffe1ee"],
  flecks: ["#f2c4d8", "#e2f0ea", "#e8b8cc", "#b8dcc8", "#f2c4d8"],
  daisy: "#e8f2ee",
  daisyCenter: "#ffe2a0",
  puff: "#9fd8bc",
  groundBase: "hsl(165, 30%, 36%)",
};


const INLINE_MOODS = {
  feeding: FeedingPanda,
  angry: AngryPanda,
  crying: CryingPanda,
  hungry: HungryPanda,
  sleepy: SleepyPanda,
  sleeping: SleepingPanda,
  woke: WokePanda,
  groggy: WokePanda,
  happy: HappyPanda,
  energetic: EnergeticPanda,
  quiet: QuietPanda,
  other: OtherPanda,
  playtime: PlaytimePanda,
  diaper: DiaperPanda,
};
const PANDA_MOOD_MODELS = ["angry", "crying", "feeding", "hungry", "sleepy", "sleeping"].map((name) => `/models/characters/panda/${name}.glb`);
const INLINE_LEAN = 0.1;
const BUBBLE_LIFT = 0.02;

function readMoodAnimation() {
  if (typeof window === "undefined") return { active: false };
  return window.__moodAnimation || { active: !!window.__moodAnimationActive };
}

function useMoodAnimation() {
  const [mood, setMood] = React.useState(readMoodAnimation);
  React.useEffect(() => {
    const onChange = (e) => setMood(e.detail || readMoodAnimation());
    window.addEventListener("mood-animation", onChange);
    return () => window.removeEventListener("mood-animation", onChange);
  }, []);
  return mood;
}

function publishMoodAnchor(camera, gl, topWorld, bottomWorld) {
  const rect = gl.domElement.getBoundingClientRect();
  const toScreen = (p) => {
    const v = p.clone().project(camera);
    return [rect.left + ((v.x + 1) / 2) * rect.width, rect.top + ((1 - v.y) / 2) * rect.height];
  };
  const [x, top] = toScreen(topWorld);
  const [, bottom] = toScreen(bottomWorld);
  const prev = window.__moodAnchor;
  if (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.top - top) < 0.5 && Math.abs(prev.bottom - bottom) < 0.5) return;
  window.__moodAnchor = { x, top, bottom };
  window.dispatchEvent(new CustomEvent("mood-anchor", { detail: window.__moodAnchor }));
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
  sun: "#fff0cf",
  rimLight: "#b6e3d6",
  hemiSky: "#ffffff",
  hemiGround: "#6f9a6e",
  water: "#3fb3a4",
  waterShallow: "#86dccc",
  waterfall: "#ffffff",
  waterLip: "#d6f6f1",
  foamBlob: "#effcf9",
  rock: "#6f83a0",
  rockDark: "#5a6c88",
  moss: "#6fae6a",
  mossDark: "#4f8a52",
  foam: "#f2fcfa",
};

const FLOOR_TEX_SIZE = 512;

function buildMossFloorTexture(night = false) {
  const canvas = document.createElement("canvas");
  canvas.width = FLOOR_TEX_SIZE;
  canvas.height = FLOOR_TEX_SIZE;
  const ctx = canvas.getContext("2d");
  // night: same shapes, cool moonlit teal instead of bright green
  const hueShift = night ? 14 : 0;
  const sat = night ? 0.62 : 1;
  const lightScale = night ? 0.74 : 1;

  ctx.fillStyle = night ? NIGHT.groundBase : "hsl(152, 50%, 52%)";
  ctx.fillRect(0, 0, FLOOR_TEX_SIZE, FLOOR_TEX_SIZE);

  for (let i = 0; i < 46; i++) {
    const seed = i * 61 + 3;
    const bx = (seed * 37) % FLOOR_TEX_SIZE;
    const by = (seed * 53) % FLOOR_TEX_SIZE;
    const radius = 42 + (seed % 5) * 20;
    const hue = 150 + (seed % 9) * 3 + hueShift;
    const light = (44 + (seed % 6) * 4) * lightScale;
    drawWrapped(ctx, bx, by, FLOOR_TEX_SIZE, radius, (x, y) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `hsla(${hue}, ${50 * sat}%, ${light}%, 0.5)`);
      grad.addColorStop(1, `hsla(${hue}, ${50 * sat}%, ${light}%, 0)`);
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
    const hue = 130 + (seed % 10) * 3 + hueShift;
    const light = (58 + (seed % 8) * 3) * lightScale;
    ctx.fillStyle = `hsla(${hue}, ${46 * sat}%, ${light}%, 0.5)`;
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
      ctx.fillStyle = night ? "rgba(255,214,230,0.5)" : "rgba(235,250,244,0.5)";
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
  const night = useNightMode();
  const tex = useMemo(() => buildMossFloorTexture(night), [night]);
  useEffect(() => {
    tex.repeat.set(GROUND_SIZE / 2.6, GROUND_SIZE / 2.6);
    return () => tex.dispose();
  }, [tex]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      <meshStandardMaterial key={night ? "n" : "d"} map={tex} roughness={1} />
    </mesh>
  );
}

function buildBambooTexture(night = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = night ? "#4f9a82" : "#57b884";
  ctx.fillRect(0, 0, 32, 256);
  ctx.fillStyle = night ? "rgba(28,70,60,0.6)" : "rgba(38,105,76,0.6)";
  for (let y = 0; y < 256; y += 34) ctx.fillRect(0, y, 32, 5);
  ctx.fillStyle = night ? "rgba(214,236,255,0.3)" : "rgba(205,245,220,0.35)";
  ctx.fillRect(6, 0, 3, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function BambooStalk({ position, height, tilt = 0, leafCount = 3 }) {
  const night = useNightMode();
  const tex = useMemo(() => buildBambooTexture(night), [night]);
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
        <meshStandardMaterial key={night ? "n" : "d"} map={tex} roughness={0.9} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh key={i} position={l.position} rotation={l.rotation} scale={l.scale} castShadow>
          <coneGeometry args={[0.04, 0.26, 3]} />
          <meshStandardMaterial color={night ? NIGHT.leaf : "#96e0ae"} roughness={0.85} side={THREE.DoubleSide} />
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

function buildMoundTexture(night = false) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
  const c = night ? "30,72,64" : "45,100,80";
  grad.addColorStop(0, `rgba(${c},0.9)`);
  grad.addColorStop(0.6, `rgba(${c},0.6)`);
  grad.addColorStop(1, `rgba(${c},0)`);
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
  const night = useNightMode();
  const mound = useMemo(() => buildMoundTexture(night), [night]);
  const tex = useMemo(() => buildBambooTexture(night), [night]);
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.57, 0.014, 0.13]}>
        <circleGeometry args={[0.7, 24]} />
        <meshStandardMaterial key={night ? "n" : "d"} map={mound} transparent depthWrite={false} roughness={1} />
      </mesh>
      {SHOOT_PLACEMENTS.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} rotation={[0, s.rotation, 0.06]}>
          <mesh position={[0, s.height / 2, 0]} castShadow>
            <cylinderGeometry args={[0.045, 0.06, s.height, 8]} />
            <meshStandardMaterial key={night ? "n" : "d"} map={tex} roughness={0.9} />
          </mesh>
          <mesh position={[0, s.height, 0]}>
            <circleGeometry args={[0.045, 8]} />
            <meshStandardMaterial color={night ? NIGHT.shootTop : "#cdeecb"} roughness={0.8} />
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
  const night = useNightMode();
  const P = night ? NIGHT : PALETTE;
  return (
    <group position={position} rotation={[0.15, rotation, 0.1]} scale={scale}>
      <mesh castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={dark ? P.rockDark : P.rock} roughness={0.9} />
      </mesh>
      <mesh position={[0.05, 0.5, -0.05]} scale={[0.78, 0.24, 0.72]} receiveShadow>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color={P.moss} roughness={1} />
      </mesh>
      <mesh position={[-0.42, 0.28, 0.3]} scale={[0.36, 0.14, 0.32]} receiveShadow>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color={P.mossDark} roughness={1} />
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

// Seamless, softly broken highlights: the whole texture moves downward.
function buildWaterfallTexture(P) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();
  ctx.fillStyle = P.waterShallow;
  ctx.fillRect(0, 0, 256, 512);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < 12; i++) {
    const x = 12 + i * 21;
    const y = seededRand(i * 29 + 8) * 512;
    const length = 90 + seededRand(i * 11 + 2) * 150;
    const bend = 3 + seededRand(i * 13 + 7) * 5;
    ctx.strokeStyle = i % 3 === 0 ? P.foam : P.waterLip;
    ctx.lineWidth = 7 + seededRand(i * 7 + 5) * 7;
    [-512, 0, 512].forEach((offset) => {
      ctx.beginPath();
      ctx.moveTo(x, y + offset);
      ctx.bezierCurveTo(x - bend, y + offset + length * 0.3, x + bend, y + offset + length * 0.7, x, y + offset + length);
      ctx.stroke();
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// One continuous ribbon: stream, rounded crest, free fall, then a pond apron.
function buildWaterfallGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.86, -0.24),
    new THREE.Vector3(0, 0.87, -0.12),
    new THREE.Vector3(0, 0.83, -0.025),
    new THREE.Vector3(0, 0.68, 0.025),
    new THREE.Vector3(0, 0.36, 0.055),
    new THREE.Vector3(0, 0.09, 0.10),
    new THREE.Vector3(0, 0.041, 0.19),
    new THREE.Vector3(0, 0.039, 0.30),
  ]);
  const positions = [], uv = [], indices = [];
  const rows = 64, columns = 12;
  for (let i = 0; i <= rows; i++) {
    const t = i / rows;
    const p = curve.getPoint(t);
    const halfWidth = 0.145 + 0.025 * Math.sin(t * Math.PI) + 0.035 * t ** 6;
    for (let j = 0; j <= columns; j++) {
      const u = j / columns;
      const across = u * 2 - 1;
      positions.push(across * halfWidth, p.y, p.z + Math.cos(across * Math.PI / 2) * 0.009);
      uv.push(u, 1 - t);
      if (i < rows && j < columns) {
        const k = i * (columns + 1) + j;
        indices.push(k, k + columns + 1, k + 1, k + 1, k + columns + 1, k + columns + 2);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// The little cliff behind the waterfall, built from the same mossy rocks as the pond edge
// so it matches the rest of the habitat. Big rocks at the bottom, smaller ones stacked up.
const CLIFF_ROCKS = [
  { position: [-0.34, 0.16, 0.0], scale: 0.19, rotation: 0.3 },
  { position: [0.34, 0.15, 0.01], scale: 0.18, rotation: 1.4 },
  { position: [-0.3, 0.46, -0.06], scale: 0.16, rotation: 2.2 },
  { position: [0.3, 0.45, -0.05], scale: 0.15, rotation: 0.8 },
  { position: [-0.17, 0.76, -0.14], scale: 0.13, rotation: 1.9 },
  { position: [0.18, 0.75, -0.13], scale: 0.12, rotation: 2.7 },
];


function Waterfall() {
  const night = useNightMode();
  const P = night ? NIGHT : PALETTE;
  const tex = useMemo(() => buildWaterfallTexture(P), [P]);
  const geometry = useMemo(buildWaterfallGeometry, []);
  const rest = useMemo(() => geometry.attributes.position.array.slice(), [geometry]);
  const time = useRef(0);
  const ripples = useRef([]);
  const foam = useRef([]);
  const splash = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const x = POND_CENTER[0] + 0.08;
  const z = POND_CENTER[2] - 0.48;
  const foamSpots = useMemo(() => Array.from({ length: 9 }, (_, i) => ({
    x: (seededRand(i * 13 + 3) - 0.5) * 0.31,
    z: 0.15 + seededRand(i * 19 + 4) * 0.12,
    size: 0.02 + seededRand(i * 23 + 7) * 0.024,
    phase: seededRand(i * 5 + 2) * Math.PI * 2,
  })), []);

  useEffect(() => () => tex.dispose(), [tex]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((_, rawDelta) => {
    time.current += Math.min(rawDelta, 0.05);
    const t = time.current;
    // Positive V offset carries features from the crest toward the pond.
    tex.offset.y = (t * 0.65) % 1;
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const u = geometry.attributes.uv.getX(i);
      const v = geometry.attributes.uv.getY(i);
      const envelope = Math.sin(v * Math.PI) * Math.sin(u * Math.PI);
      positions.setZ(i, rest[i * 3 + 2] + envelope * (
        Math.sin(v * 24 + t * 5 + u * 8) * 0.006 + Math.sin(v * 43 + t * 8) * 0.003
      ));
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
    foam.current.forEach((m, i) => {
      if (!m) return;
      const d = foamSpots[i];
      const pulse = 1 + Math.sin(t * 2 + d.phase) * 0.15;
      m.scale.set(pulse * 1.5, pulse, 1);
      m.position.z = d.z + Math.sin(t * 1.4 + d.phase) * 0.012;
      m.material.opacity = 0.45 + Math.sin(t * 1.8 + d.phase) * 0.12;
    });
    ripples.current.forEach((m, i) => {
      if (!m) return;
      const cycle = (t * 0.42 + i / 3) % 1;
      const radius = 0.055 + cycle * 0.22;
      m.scale.set(radius * 1.3, radius, 1);
      m.material.opacity = Math.sin(cycle * Math.PI) * (night ? 0.2 : 0.32);
    });
    if (splash.current) {
      for (let i = 0; i < 18; i++) {
        const c = (t * 0.9 + i / 18) % 1;
        const a = seededRand(i * 17 + 2) * Math.PI * 2;
        const r = 0.015 + c * 0.12;
        dummy.position.set(Math.cos(a) * r, 0.046 + Math.sin(c * Math.PI) * (0.045 + seededRand(i + 9) * 0.055), 0.18 + Math.sin(a) * r * 0.55 + c * 0.025);
        const size = Math.sin(c * Math.PI) * (0.003 + seededRand(i + 1) * 0.003);
        dummy.scale.set(size, size * 1.4, size);
        dummy.updateMatrix();
        splash.current.setMatrixAt(i, dummy.matrix);
      }
      splash.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group position={[x, 0, z]}>
      <group position={[0, 0, -0.14]}>
        <mesh position={[0, 0.42, -0.2]} scale={[0.38, 0.47, 0.14]} castShadow receiveShadow>
          <sphereGeometry args={[1, 16, 12]} />
          <meshStandardMaterial color={P.rockDark} roughness={1} />
        </mesh>
        {CLIFF_ROCKS.map((r, i) => <MossyRock key={i} {...r} dark={i % 2 === 1} />)}
      </group>
      <mesh geometry={geometry}>
        <meshStandardMaterial map={tex} roughness={0.24} metalness={0.05} transparent opacity={0.9} side={THREE.DoubleSide} />
      </mesh>
      {foamSpots.map((d, i) => (
        <mesh key={i} ref={(el) => { foam.current[i] = el; }} rotation={[-Math.PI / 2, 0, 0]} position={[d.x, 0.047 + i * 0.0002, d.z]}>
          <circleGeometry args={[d.size, 16]} />
          <meshBasicMaterial color={P.foam} transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => { ripples.current[i] = el; }} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.049 + i * 0.0002, 0.23]}>
          <ringGeometry args={[0.975, 1, 64, 1, 0, Math.PI * 2]} />
          <meshBasicMaterial color={P.foam} transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <instancedMesh ref={splash} args={[undefined, undefined, 18]} frustumCulled={false}>
        <sphereGeometry args={[1, 6, 4]} />
        <meshBasicMaterial color={P.foam} transparent opacity={0.7} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

function buildPondTexture(P) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Texture();
  const depth = ctx.createLinearGradient(0, 0, 0, 512);
  depth.addColorStop(0, P.waterShallow);
  depth.addColorStop(0.55, P.waterShallow);
  depth.addColorStop(1, P.water);
  ctx.fillStyle = depth;
  ctx.fillRect(0, 0, 512, 512);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = P.waterShallow;
  ctx.fillRect(0, 0, 512, 512);
  ctx.globalAlpha = 1;
  const landing = ctx.createRadialGradient(300, 92, 8, 300, 92, 300);
  landing.addColorStop(0, P.waterLip);
  landing.addColorStop(0.35, P.waterShallow);
  landing.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = landing;
  ctx.fillRect(0, 0, 512, 512);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < 9; i++) {
    const x = 95 + seededRand(i * 17 + 4) * 320;
    const y = 95 + seededRand(i * 29 + 8) * 320;
    const radius = 24 + seededRand(i * 11 + 2) * 36;
    ctx.strokeStyle = i % 3 === 0 ? P.foam : P.waterLip;
    ctx.lineWidth = 5 + seededRand(i * 7 + 5) * 3;
    ctx.beginPath();
    ctx.ellipse(x, y, radius, radius * 0.4, 0, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Pond() {
  const night = useNightMode();
  const P = night ? NIGHT : PALETTE;
  const tex = useMemo(() => buildPondTexture(P), [P]);
  useEffect(() => () => tex.dispose(), [tex]);
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
        <meshStandardMaterial map={tex} roughness={0.25} transparent opacity={0.92} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[POND_CENTER[0] - 0.22, 0.035, POND_CENTER[2] - 0.18]}
      >
        <circleGeometry args={[POND_RADIUS * 0.42, 24]} />
        <meshStandardMaterial
          color={P.waterShallow}
          roughness={0.3}
          transparent
          opacity={0.55}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0.5]} position={[POND_CENTER[0] + 0.2, 0.045, POND_CENTER[2] + 0.12]}>
        <circleGeometry args={[0.13, 20, 0.4, Math.PI * 2 - 0.8]} />
        <meshStandardMaterial color={night ? NIGHT.lily : "#4f9e63"} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 2.2]} position={[POND_CENTER[0] - 0.12, 0.045, POND_CENTER[2] + 0.26]}>
        <circleGeometry args={[0.09, 18, 0.4, Math.PI * 2 - 0.8]} />
        <meshStandardMaterial color={night ? NIGHT.lily2 : "#5fb371"} roughness={0.8} side={THREE.DoubleSide} />
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
              <meshStandardMaterial
                color={night ? NIGHT.lotus : "#ffb9d6"}
                emissive={night ? NIGHT.lotus : "#000000"}
                emissiveIntensity={night ? 0.45 : 0}
                roughness={0.7}
              />
            </mesh>
          );
        })}
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.016, 8, 8]} />
          <meshStandardMaterial
            color={night ? NIGHT.lotusCenter : "#ffe38a"}
            emissive={night ? NIGHT.lotusCenter : "#000000"}
            emissiveIntensity={night ? 0.5 : 0}
            roughness={0.7}
          />
        </mesh>
      </group>
      {POND_BORDER_ROCKS.map((r, i) => (
        <MossyRock key={i} {...r} dark={i % 2 === 1} />
      ))}
    </>
  );
}

function MistWisp({ radius, speed, height, phase, scale }) {
  const night = useNightMode();
  const ref = useRef(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + phase;
    ref.current.position.set(Math.cos(t) * radius, height, Math.sin(t) * radius);
    ref.current.material.opacity = (0.16 + Math.sin(t * 1.3) * 0.05) * (night ? 0.55 : 1);
  });
  return (
    <mesh ref={ref} scale={scale}>
      <sphereGeometry args={[0.6, 12, 12]} />
      <meshBasicMaterial color={night ? NIGHT.mist : "#eaf7f0"} transparent opacity={0.18} depthWrite={false} />
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
  const night = useNightMode();
  const colors = night ? NIGHT.petals : PETAL_COLORS;
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
        color={colors[colorIndex % colors.length]}
        emissive={night ? colors[colorIndex % colors.length] : "#000000"}
        emissiveIntensity={night ? 0.3 : 0}
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
  const night = useNightMode();
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
            <meshStandardMaterial color={night ? NIGHT.daisy : "#fff6fa"} roughness={0.8} />
          </mesh>
        );
      })}
      <mesh>
        <circleGeometry args={[0.014, 8]} />
        <meshStandardMaterial color={night ? NIGHT.daisyCenter : "#ffce54"} roughness={0.8} />
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
  const night = useNightMode();
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
          <meshStandardMaterial color={night ? NIGHT.flecks[i % NIGHT.flecks.length] : f.color} roughness={0.8} />
        </mesh>
      ))}
      {DAISY_SPOTS.map((p, i) => (
        <TinyDaisy key={`d${i}`} position={p} />
      ))}
    </>
  );
}

function Panda({ modelUrl, position = PANDA_POSITION, onMunch, inline: InlineAnimation = null, variant }) {
  const group = useRef(null);
  const frame = useRef(null);
  const { camera, gl } = useThree();
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
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => {
          if (!m) return;
          if ("roughness" in m) m.roughness = 1;
          if ("metalness" in m) m.metalness = 0;
          if ("clearcoat" in m) m.clearcoat = 0;
          if ("specularIntensity" in m) m.specularIntensity = 0;
          m.needsUpdate = true;
        });
      }
    });
    wrapper.add(clone);
    wrapper.userData.placement = {
      offset: [-center.x, -box.min.y, -center.z],
      scale,
      box: box.clone(),
    };
    return wrapper;
  }, [gltf.scene]);

  const anchorPoints = useMemo(() => {
    const { offset, scale, box } = model.userData.placement;
    const x = position[0] + offset[0] + ((box.min.x + box.max.x) / 2) * scale;
    const z = position[1] + offset[2] + ((box.min.z + box.max.z) / 2) * scale;
    return {
      top: new THREE.Vector3(x, offset[1] + box.max.y * scale + BUBBLE_LIFT, z),
      bottom: new THREE.Vector3(x, offset[1] + box.min.y * scale, z),
      topWorld: new THREE.Vector3(),
      bottomWorld: new THREE.Vector3(),
    };
  }, [model, position]);

  useLayoutEffect(() => {
    if (!group.current) return;
    group.current.rotation.y = 0;
  }, [model]);

  useFrame(({ clock }) => {
    if (frame.current) {
      frame.current.updateWorldMatrix(true, false);
      anchorPoints.topWorld.copy(anchorPoints.top).applyMatrix4(frame.current.matrixWorld);
      anchorPoints.bottomWorld.copy(anchorPoints.bottom).applyMatrix4(frame.current.matrixWorld);
      publishMoodAnchor(camera, gl, anchorPoints.topWorld, anchorPoints.bottomWorld);
    }

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

  if (InlineAnimation) {
    const { offset, scale } = model.userData.placement;
    return (
      <group ref={frame}>
        <InlineAnimation
          placement={{ homePosition: position, offset, scale, yaw: 0, lean: INLINE_LEAN }}
          idleModelPath={modelUrl}
          variant={variant}
        />
      </group>
    );
  }

  return (
    <group ref={frame}>
      <group ref={group} position={[position[0], 0, position[1]]}>
        <group ref={body}>
          <primitive object={model} />
        </group>
      </group>
    </group>
  );
}

function PandaSlot({ onMunch }) {
  const mood = useMoodAnimation();
  const Inline = mood.active ? INLINE_MOODS[mood.mood] || null : null;
  if (mood.active && !Inline) return null;
  return (
    <PandaErrorBoundary position={PANDA_POSITION} onMunch={Inline ? undefined : onMunch}>
      <Panda
        key={Inline ? `${mood.mood}-${mood.variant || ""}` : "idle"}
        modelUrl={PANDA_MODEL_URL}
        position={PANDA_POSITION}
        onMunch={Inline ? undefined : onMunch}
        inline={Inline}
        variant={mood.variant}
      />
    </PandaErrorBoundary>
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
  const night = useNightMode();
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
      <meshBasicMaterial color={night ? NIGHT.puff : "#bdeeb0"} transparent opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
}

// Little stone lanterns by the pond: unlit-looking stone by day, a soft warm glow at night.
const STONE_LANTERNS = [
  { position: [0.22, 0, -0.02], rotation: 0.4 },
  { position: [-0.9, 0, 0.42], rotation: -0.3 },
];

function StoneLantern({ position, rotation = 0 }) {
  const night = useNightMode();
  const stone = night ? NIGHT.stone : "#b8bcc4";
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 0.058, 0.03, 6]} />
        <meshStandardMaterial color={stone} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.022, 0.08, 6]} />
        <meshStandardMaterial color={stone} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.13, 0]} castShadow>
        <boxGeometry args={[0.06, 0.045, 0.06]} />
        <meshStandardMaterial
          color={night ? NIGHT.lantern : "#e9e4d6"}
          emissive={night ? NIGHT.lantern : "#000000"}
          emissiveIntensity={night ? 0.9 : 0}
          roughness={1}
          toneMapped={!night}
        />
      </mesh>
      <mesh position={[0, 0.172, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.065, 0.045, 4]} />
        <meshStandardMaterial color={stone} roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.012, 8, 6]} />
        <meshStandardMaterial color={stone} roughness={1} />
      </mesh>
      {night && (
        <>
          <mesh position={[0, 0.13, 0]}>
            <sphereGeometry args={[0.06, 12, 10]} />
            <meshBasicMaterial color={NIGHT.glow} transparent opacity={0.1} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
            <circleGeometry args={[0.17, 24]} />
            <meshBasicMaterial color={NIGHT.glow} transparent opacity={0.08} depthWrite={false} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 0.14, 0]} color={NIGHT.lantern} intensity={0.28} distance={0.7} decay={2} />
        </>
      )}
    </group>
  );
}

// Same twinkling yellow stars as the bear habitat.
function YellowStars() {
  const group = useRef(null);
  const shape = useMemo(() => {
    const outline = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 1 : 0.44;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) outline.moveTo(x, y);
      else outline.lineTo(x, y);
    }
    outline.closePath();
    return outline;
  }, []);
  const stars = useMemo(() => Array.from({ length: 13 }, (_, i) => ({
    x: -0.86 + (i % 5) * 0.4 + seededRand(i * 17 + 2) * 0.13,
    y: 0.57 + seededRand(i * 23 + 7) * 0.32,
    radius: i % 3 === 0 ? 5 : 3,
    phase: seededRand(i + 11) * Math.PI * 2,
  })), []);
  useFrame(({ camera, size, clock }) => {
    if (!group.current || !camera.isOrthographicCamera) return;
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
    const halfWidth = (camera.right - camera.left) / (2 * camera.zoom);
    const halfHeight = (camera.top - camera.bottom) / (2 * camera.zoom);
    group.current.children.forEach((mesh, i) => {
      const star = stars[i];
      mesh.position.set(star.x * halfWidth, star.y * halfHeight, -0.5);
      mesh.scale.setScalar((star.radius * halfHeight * 2) / size.height);
      mesh.material.opacity = 0.65 + Math.sin(clock.getElapsedTime() * 0.8 + star.phase) * 0.2;
    });
  });
  return (
    <group ref={group}>
      {stars.map((star, i) => (
        <mesh key={i} renderOrder={100} frustumCulled={false}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial color={NIGHT.star} transparent opacity={0.8} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

// gl settings are only read once, so keep brightness in sync with night mode
function ExposureSync({ exposure }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}

const ISO_DISTANCE = 4.4;
const ISO_ELEVATION = Math.atan(1 / Math.sqrt(2)) - 0.05;
const ISO_ZOOM = 320;
const ISO_POSITION = [
  0,
  ISO_DISTANCE * Math.sin(ISO_ELEVATION),
  ISO_DISTANCE * Math.cos(ISO_ELEVATION),
];

export function PandaHabitat3D({ showPanda = true } = {}) {
  const night = useNightMode();
  const [puffs, setPuffs] = useState([]);

  const addPuff = (position) =>
    setPuffs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, position }]);
  const removePuff = (id) => setPuffs((prev) => prev.filter((p) => p.id !== id));

  useEffect(() => {
    if (!showPanda) return;
    [PANDA_MODEL_URL, ...PANDA_MOOD_MODELS].forEach((url) => useGLTF.preload(url));
  }, [showPanda]);

  useEffect(() => {
    window.__habitatInline = { animal: "panda", moods: Object.keys(INLINE_MOODS) };
    window.dispatchEvent(new CustomEvent("habitat-inline", { detail: window.__habitatInline }));
    return () => {
      window.__habitatInline = null;
      window.__moodAnchor = null;
      window.dispatchEvent(new CustomEvent("habitat-inline", { detail: null }));
    };
  }, []);

  return (
    <Canvas
      shadows="soft"
      orthographic
      camera={{ position: ISO_POSITION, zoom: ISO_ZOOM, near: 0.1, far: 60 }}
      gl={{ toneMappingExposure: night ? 1.0 : 1.15 }}
      dpr={[1, 2]}
    >
      <ExposureSync exposure={night ? 1.0 : 1.15} />
      <color attach="background" args={[night ? NIGHT.background : PALETTE.background]} />
      <fog attach="fog" args={[night ? NIGHT.fog : PALETTE.fog, PALETTE.fogNear, PALETTE.fogFar]} />

      <ambientLight intensity={night ? NIGHT.ambient : 0.9} color={night ? NIGHT.ambientColor : "#fff4e2"} />
      <directionalLight
        position={[5, 8, 3]}
        intensity={night ? NIGHT.sun : 2.0}
        color={night ? NIGHT.sunColor : PALETTE.sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
      />
      <directionalLight position={[-5, 3, -4]} intensity={night ? NIGHT.rim : 0.6} color={night ? NIGHT.rimColor : PALETTE.rimLight} />
      <hemisphereLight args={[night ? NIGHT.hemiSky : PALETTE.hemiSky, night ? NIGHT.hemiGround : PALETTE.hemiGround, night ? NIGHT.hemiI : 0.95]} />
      {night && <YellowStars />}

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
          {night && <NightFireflies area={[1.5, 0.15, 0.55, 1.5]} count={12} color={NIGHT.firefly} size={0.014} />}
          {puffs.map((p) => (
            <LeafPuff key={p.id} position={p.position} onDone={() => removePuff(p.id)} />
          ))}
          {showPanda && <PandaSlot onMunch={addPuff} />}
        </group>
      </Suspense>
    </Canvas>
  );
}

export default PandaHabitat3D;