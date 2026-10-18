import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import FeedingFox from "../animations/fox/FeedingFox";
import AngryFox from "../animations/fox/AngryFox";
import CryingFox from "../animations/fox/CryingFox";
import HungryFox from "../animations/fox/HungryFox";
import SleepyFox from "../animations/fox/SleepyFox";
import SleepingFox from "../animations/fox/SleepingFox";
import WokeFox from "../animations/fox/WokeFox";
import HappyFox from "../animations/fox/HappyFox";
import EnergeticFox from "../animations/fox/EnergeticFox";
import QuietFox from "../animations/fox/QuietFox";
import OtherFox from "../animations/fox/OtherFox";
import PlaytimeFox from "../animations/fox/PlaytimeFox";
import DiaperFox from "../animations/fox/DiaperFox";
import PetFox from "../animations/fox/PetFox";
import { FoxMood, FoxIdleRig } from "../animations/fox/foxRig";

const INLINE_MOODS = {
  feeding: FeedingFox,
  angry: AngryFox,
  crying: CryingFox,
  hungry: HungryFox,
  sleepy: SleepyFox,
  sleeping: SleepingFox,
  woke: WokeFox,
  groggy: WokeFox,
  happy: HappyFox,
  energetic: EnergeticFox,
  quiet: QuietFox,
  other: OtherFox,
  playtime: PlaytimeFox,
  diaper: DiaperFox,
};
const INLINE_LEAN = 0.1;
const PET_HOLD = 2.2;
const PET_LINGER = 1.2;
const POUNCE_TIME = 0.9;
const BUBBLE_LIFT = -0.05;

const FOX_MODEL = "/models/characters/fox/fox.glb";
const FOX_HEIGHT = 1.5;
const FOX_POSITION = [0.05, -0.55];
const RUG_TOP = 0.03;
const HILL = { center: [0.35, -2.85], rx: 3.2, rz: 2.2, height: 2.6 };
const DOOR = { at: [0.15, -1.12], radius: 0.56 };

const LIGHTS = {
  day: {
    background: "#f6dfb8", exposure: 1.08,
    ambient: 0.7, ambientColor: "#fff0d8",
    sun: 1.95, sunColor: "#ffd8a0",
    rim: 0.5, rimColor: "#ffb88a",
    hemiSky: "#fff0d0", hemiGround: "#8a5a3a", hemi: 0.85,
  },
  night: {
    background: "#2a2142", exposure: 1.0,
    ambient: 0.45, ambientColor: "#c8b8e8",
    sun: 0.6, sunColor: "#c9c4ff",
    rim: 0.45, rimColor: "#9aa8e0",
    hemiSky: "#6a5c9a", hemiGround: "#2a1e2a", hemi: 0.6,
  },
};

const PALETTE = {
  day: {
    ground: ["#c7ad5a", "#d1b463", "#bba253", "#d8be6c", "#b49a4e"],
    groundFar: "#e0c88a",
    hill: ["#8fae54", "#9cb85c", "#86a64e", "#a6bf62"],
    hillTop: "#c4d27a",
    hillBase: "#6f8a42",
    path: "#e7d3ae",
    maple: ["#e0503a", "#f08a2e", "#f6b93c", "#d23f34"],
    mapleShade: "#b33a2e",
    pine: ["#4f7a5a", "#5f8a66", "#466e52"],
    trunk: "#7a4e34",
    door: "#d9643a",
    doorDark: "#b24f2c",
    doorKnob: "#f6c64a",
    stone: ["#d8c8b0", "#c8b89e", "#e6d8c0"],
    stoneDark: "#a8987e",
    window: "#ffe2a0",
    chimney: "#a86a4a",
    smoke: "#fff6ea",
    rug: "#e8a05a",
    rugTrim: "#fff2dc",
    pumpkin: ["#f08a2e", "#f6a03c", "#e57a26"],
    pumpkinStem: "#6f7a3e",
    vine: "#7f8a3e",
    leafPile: ["#e0503a", "#f08a2e", "#f6b93c", "#c9502c"],
    mushroomCap: ["#e8584a", "#f6c45a"],
    mushroomStem: "#fff2e0",
    wood: "#c9925a",
    woodDark: "#9a6a40",
    apple: "#e2463a",
    lantern: "#ffd27a",
    bunting: ["#e0503a", "#f6b93c", "#f08a2e", "#fff2dc"],
    acorn: "#a86a3e",
    acornCap: "#6f4a30",
    flowers: ["#fff2dc", "#f6c64a", "#f2a0a0"],
    tuft: ["#c9a84a", "#b8963e", "#d6b856"],
  },
  night: {
    ground: ["#4e4a5e", "#555066", "#47435a", "#5c566c", "#433f54"],
    groundFar: "#5a5470",
    hill: ["#4a5a52", "#52625a", "#43534b", "#596a5e"],
    hillTop: "#62766a",
    hillBase: "#34443e",
    path: "#8a8296",
    maple: ["#8f3a44", "#a05a40", "#a8804a", "#83343e"],
    mapleShade: "#6a2c36",
    pine: ["#2f4a46", "#365450", "#2a423f"],
    trunk: "#4a3434",
    door: "#9a4a3a",
    doorDark: "#7a3a2e",
    doorKnob: "#f6c64a",
    stone: ["#8a8496", "#7f798c", "#9690a2"],
    stoneDark: "#686276",
    window: "#ffd27a",
    chimney: "#6a4a46",
    smoke: "#b8b0d0",
    rug: "#a8704a",
    rugTrim: "#d8cfe0",
    pumpkin: ["#d07a3a", "#e08a46", "#c06a30"],
    pumpkinStem: "#4a523a",
    vine: "#4a5a3a",
    leafPile: ["#8f3a44", "#a05a40", "#a8804a", "#83343e"],
    mushroomCap: ["#c8584a", "#e0b45a"],
    mushroomStem: "#e0dcea",
    wood: "#7a5c46",
    woodDark: "#5e4636",
    apple: "#b0403a",
    lantern: "#ffd27a",
    bunting: ["#a04a44", "#c8a050", "#b0703e", "#d8cfe0"],
    acorn: "#6a4a3e",
    acornCap: "#4a3430",
    flowers: ["#e8e0f0", "#e8c86a", "#e0a0b0"],
    tuft: ["#5a5a5a", "#4f4f56", "#62626a"],
  },
};

const STAR_COLOR = "#fff1c9";
const FIREFLY_COLOR = "#ffd27a";

function useNightModeSetting() {
  const [night, setNight] = useState(() => typeof window !== "undefined" && localStorage.getItem("koda-dark-mode") === "true");
  useEffect(() => {
    const onMode = (e) => setNight(e?.detail && typeof e.detail.isDarkMode === "boolean" ? e.detail.isDarkMode : localStorage.getItem("koda-dark-mode") === "true");
    window.addEventListener("koda-dark-mode", onMode);
    return () => window.removeEventListener("koda-dark-mode", onMode);
  }, []);
  return night;
}

const NightContext = React.createContext(false);

const useNight = () => React.useContext(NightContext);

function readMoodAnimation() {
  if (typeof window === "undefined") return { active: false };
  return window.__moodAnimation || { active: !!window.__moodAnimationActive };
}

function useMoodAnimation() {
  const [mood, setMood] = useState(readMoodAnimation);
  useEffect(() => {
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

function ExposureSync({ exposure }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}

const seededRand = (seed) => {
  const value = Math.sin(seed * 999.91) * 43758.5453;
  return value - Math.floor(value);
};

function jitterGeometry(geo, amount, seed) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  const pos = g.attributes.position;
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!map.has(key)) {
      const k = map.size;
      map.set(key, [(seededRand(seed + k * 3.1) - 0.5) * amount, (seededRand(seed + k * 5.7) - 0.5) * amount, (seededRand(seed + k * 7.3) - 0.5) * amount]);
    }
    const [dx, dy, dz] = map.get(key);
    pos.setXYZ(i, pos.getX(i) + dx, pos.getY(i) + dy, pos.getZ(i) + dz);
  }
  g.computeVertexNormals();
  return g;
}

function useFreeRoam({ bounds = 6, minHeight = 0.6, maxHeight = 1.3, speed = 0.6, avoidCenter = 0 } = {}) {
  const state = useMemo(() => {
    const randPoint = () => {
      let x;
      let z;
      do {
        x = (Math.random() - 0.5) * bounds * 2;
        z = (Math.random() - 0.5) * bounds * 2;
      } while (avoidCenter && Math.hypot(x, z) < avoidCenter);
      return new THREE.Vector3(x, minHeight + Math.random() * (maxHeight - minHeight), z);
    };
    return { pos: randPoint(), target: randPoint(), randPoint };
  }, [bounds, minHeight, maxHeight, avoidCenter]);
  const step = (delta) => {
    const dir = state.target.clone().sub(state.pos);
    const dist = dir.length();
    if (dist < 0.15) state.target.copy(state.randPoint());
    else state.pos.addScaledVector(dir.normalize(), Math.min(speed * delta, dist));
    return state.pos;
  };
  return { state, step };
}

function Firefly({ bounds, speed, height }) {
  const ref = useRef();
  const { step } = useFreeRoam({ bounds, minHeight: height - 0.2, maxHeight: height + 0.3, speed });
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }, delta) => {
    const pos = step(delta);
    if (ref.current) ref.current.position.set(pos.x, pos.y + Math.sin(clock.getElapsedTime() * 2 + phase) * 0.08, pos.z - 1);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.025, 8, 8]} />
      <meshBasicMaterial color={FIREFLY_COLOR} toneMapped={false} />
      <pointLight color={FIREFLY_COLOR} intensity={0.3} distance={0.9} />
    </mesh>
  );
}

function Fireflies() {
  return (
    <>
      <Firefly bounds={3.6} speed={0.5} height={0.9} />
      <Firefly bounds={3.2} speed={0.55} height={1.2} />
      <Firefly bounds={4.2} speed={0.45} height={0.7} />
      <Firefly bounds={2.8} speed={0.4} height={1.0} />
      <Firefly bounds={4.6} speed={0.5} height={0.8} />
      <Firefly bounds={2.4} speed={0.6} height={1.3} />
    </>
  );
}

function Butterfly({ bounds, speed, height, color }) {
  const group = useRef();
  const left = useRef();
  const right = useRef();
  const { state, step } = useFreeRoam({ bounds, minHeight: height - 0.2, maxHeight: height + 0.4, speed, avoidCenter: 0.9 });
  const prev = useRef(state.pos.clone());
  useFrame(({ clock }, delta) => {
    const pos = step(delta);
    const t = clock.getElapsedTime();
    if (group.current) {
      const dx = pos.x - prev.current.x;
      const dz = pos.z - prev.current.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.0001) group.current.rotation.y = Math.atan2(dx, dz);
      group.current.position.set(pos.x, pos.y + Math.sin(t * 4) * 0.06, pos.z - 0.5);
      prev.current.copy(pos);
    }
    const flap = Math.sin(t * 16) * 0.9;
    if (left.current) left.current.rotation.z = 0.2 + flap;
    if (right.current) right.current.rotation.z = -0.2 - flap;
  });
  return (
    <group ref={group}>
      <group ref={left}>
        <mesh position={[0.06, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.06, 5]} />
          <meshStandardMaterial {...flat(color, { side: THREE.DoubleSide })} />
        </mesh>
      </group>
      <group ref={right}>
        <mesh position={[-0.06, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.06, 5]} />
          <meshStandardMaterial {...flat(color, { side: THREE.DoubleSide })} />
        </mesh>
      </group>
    </group>
  );
}

function GlowStars() {
  const group = useRef(null);
  const shape = useMemo(() => {
    const outline = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 1 : 0.44;
      if (i === 0) outline.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
      else outline.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
    }
    outline.closePath();
    return outline;
  }, []);
  const stars = useMemo(
    () =>
      Array.from({ length: 13 }, (_, i) => ({
        x: -0.86 + (i % 5) * 0.4 + seededRand(i * 17 + 2) * 0.13,
        y: 0.57 + seededRand(i * 23 + 7) * 0.32,
        radius: i % 3 === 0 ? 5 : 3,
        phase: seededRand(i + 11) * Math.PI * 2,
      })),
    [],
  );
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
      {stars.map((_, i) => (
        <mesh key={i} renderOrder={100} frustumCulled={false}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial color={STAR_COLOR} transparent opacity={0.8} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

const usePalette = () => (useNight() ? PALETTE.night : PALETTE.day);

const flat = (color, extra = {}) => ({ color, roughness: 1, metalness: 0, flatShading: true, ...extra });

function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function smoothNoise(x, z) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const u = xf * xf * (3 - 2 * xf);
  const v = zf * zf * (3 - 2 * zf);
  const a = hash2(xi, zi);
  const b = hash2(xi + 1, zi);
  const c = hash2(xi, zi + 1);
  const d = hash2(xi + 1, zi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

const fbm = (x, z) => smoothNoise(x, z) * 0.6 + smoothNoise(x * 2.1 + 5, z * 2.1 + 3) * 0.3 + smoothNoise(x * 4.3 + 9, z * 4.3 + 1) * 0.1;

function hillNorm(x, z) {
  const nx = (x - HILL.center[0]) / HILL.rx;
  const nz = (z - HILL.center[1]) / HILL.rz;
  return Math.sqrt(nx * nx + nz * nz);
}

function hillHeight(x, z) {
  const d = hillNorm(x, z);
  if (d >= 1) return 0;
  const k = Math.cos(d * Math.PI * 0.5);
  return HILL.height * k * k * (0.92 + fbm(x * 0.8, z * 0.8) * 0.16);
}

function groundHeight(x, z) {
  const nearFox = THREE.MathUtils.smoothstep(Math.hypot(x - FOX_POSITION[0], z - FOX_POSITION[1]), 0.7, 1.2);
  const dist = Math.hypot(x, z * 0.8);
  const hills = THREE.MathUtils.smoothstep(dist, 9, 16) * (0.3 + fbm(x * 0.12, z * 0.12) * 1.0);
  return nearFox * fbm(x * 0.7, z * 0.7) * 0.07 + hills;
}

function Ground() {
  const p = usePalette();
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(70, 70, 100, 100);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const other = new THREE.Color();
    const far = new THREE.Color(p.groundFar);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, groundHeight(x, z) - 0.002);
      const n = fbm(x * 0.3 + 3, z * 0.3 + 7);
      const idx = n * (p.ground.length - 1);
      const lo = Math.floor(idx);
      c.set(p.ground[lo]);
      other.set(p.ground[Math.min(p.ground.length - 1, lo + 1)]);
      c.lerp(other, idx - lo);
      c.lerp(far, THREE.MathUtils.smoothstep(Math.hypot(x, z), 7, 18) * 0.4);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, [p]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} flatShading />
    </mesh>
  );
}

function Hill() {
  const p = usePalette();
  const geo = useMemo(() => {
    const g = new THREE.CircleGeometry(1, 48, 0, Math.PI * 2);
    const segs = new THREE.PlaneGeometry(HILL.rx * 2, HILL.rz * 2, 40, 28);
    segs.rotateX(-Math.PI / 2);
    segs.translate(HILL.center[0], 0, HILL.center[1]);
    const pos = segs.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dx = x - DOOR.at[0];
      const dz = z - DOOR.at[1];
      let h = hillHeight(x, z);
      const notch = Math.max(0, 1 - Math.hypot(dx * 1.1, (dz - 0.25) * 1.6) / 0.95);
      h = Math.max(-0.01, h - notch * notch * 1.0);
      pos.setY(i, h > 0 ? h : -0.02);
    }
    g.dispose();
    const geo2 = segs.toNonIndexed();
    const pp = geo2.attributes.position;
    const colors = new Float32Array(pp.count * 3);
    const c = new THREE.Color();
    const top = new THREE.Color(p.hillTop);
    const base = new THREE.Color(p.hillBase);
    for (let i = 0; i < pp.count; i += 3) {
      const x = (pp.getX(i) + pp.getX(i + 1) + pp.getX(i + 2)) / 3;
      const z = (pp.getZ(i) + pp.getZ(i + 1) + pp.getZ(i + 2)) / 3;
      const y = (pp.getY(i) + pp.getY(i + 1) + pp.getY(i + 2)) / 3;
      const h = THREE.MathUtils.clamp(y / HILL.height, 0, 1);
      c.set(p.hill[Math.floor(fbm(x * 0.9, z * 0.9) * p.hill.length) % p.hill.length]);
      c.lerp(top, h * 0.55);
      c.lerp(base, (1 - THREE.MathUtils.smoothstep(h, 0.02, 0.18)) * 0.5);
      for (let k = 0; k < 3; k++) {
        colors[(i + k) * 3] = c.r;
        colors[(i + k) * 3 + 1] = c.g;
        colors[(i + k) * 3 + 2] = c.b;
      }
    }
    geo2.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo2.computeVertexNormals();
    return geo2;
  }, [p]);
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} flatShading />
    </mesh>
  );
}

function DenDoor() {
  const p = usePalette();
  const night = useNight();
  const r = DOOR.radius;
  const arch = useMemo(() => {
    const list = [];
    const n = 11;
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (i / (n - 1));
      list.push({ x: Math.cos(a) * (r + 0.12), y: Math.sin(a) * (r + 0.12), a, s: 0.11 + seededRand(i * 3.3) * 0.04 });
    }
    return list;
  }, [r]);
  return (
    <group position={[DOOR.at[0], 0, DOOR.at[1]]} rotation={[0, 0.05, 0]}>
      <mesh position={[0, 0, -0.02]}>
        <circleGeometry args={[r + 0.06, 18, 0, Math.PI]} />
        <meshStandardMaterial {...flat(p.doorDark)} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <circleGeometry args={[r, 18, 0, Math.PI]} />
        <meshStandardMaterial {...flat(p.door)} />
      </mesh>
      {[-0.5, -0.17, 0.17, 0.5].map((f, i) => {
        const x = f * r;
        const h = Math.sqrt(Math.max(0.0001, r * r - x * x));
        return (
          <mesh key={i} position={[x, h / 2, 0.006]}>
            <planeGeometry args={[0.022, h * 0.94]} />
            <meshStandardMaterial {...flat(p.doorDark)} />
          </mesh>
        );
      })}
      <mesh position={[r * 0.55, r * 0.42, 0.03]}>
        <icosahedronGeometry args={[0.045, 0]} />
        <meshStandardMaterial {...flat(p.doorKnob, { emissive: p.doorKnob, emissiveIntensity: night ? 0.4 : 0.1 })} />
      </mesh>
      {arch.map((st, i) => (
        <mesh key={`s${i}`} position={[st.x, st.y, 0.02]} rotation={[0, 0, st.a]} castShadow>
          <dodecahedronGeometry args={[st.s, 0]} />
          <meshStandardMaterial {...flat(p.stone[i % p.stone.length])} />
        </mesh>
      ))}
      <mesh position={[0, 0.006, 0.42]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.32, 10, Math.PI, Math.PI]} />
        <meshStandardMaterial {...flat(p.stoneDark, { side: THREE.DoubleSide })} />
      </mesh>
    </group>
  );
}

function RoundWindow() {
  const p = usePalette();
  const night = useNight();
  const at = [DOOR.at[0] + 1.15, 0, DOOR.at[1] - 0.55];
  const y = hillHeight(at[0], at[2]) * 0.55 + 0.25;
  return (
    <group position={[at[0], y, at[2] + 0.38]} rotation={[-0.35, -0.25, 0]}>
      <mesh>
        <circleGeometry args={[0.2, 12]} />
        <meshStandardMaterial {...flat(p.window, { emissive: p.window, emissiveIntensity: night ? 1.2 : 0.3 })} />
      </mesh>
      <mesh position={[0, 0, 0.005]}>
        <ringGeometry args={[0.19, 0.25, 12]} />
        <meshStandardMaterial {...flat(p.woodDark)} />
      </mesh>
      {[0, Math.PI / 2].map((a, i) => (
        <mesh key={i} position={[0, 0, 0.006]} rotation={[0, 0, a]}>
          <planeGeometry args={[0.38, 0.025]} />
          <meshStandardMaterial {...flat(p.woodDark)} />
        </mesh>
      ))}
      {night && <pointLight position={[0, 0, 0.4]} color={p.window} intensity={1} distance={2} decay={2} />}
    </group>
  );
}

function Chimney() {
  const p = usePalette();
  const at = [HILL.center[0] + 0.9, HILL.center[1] + 0.2];
  const y = hillHeight(at[0], at[1]);
  const puffs = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    puffs.current.forEach((m, i) => {
      if (!m) return;
      const life = ((t * 0.22 + i / 5) % 1 + 1) % 1;
      m.position.set(Math.sin(t * 0.7 + i) * 0.1 + life * 0.35, y + 0.55 + life * 1.6, Math.cos(t * 0.5 + i) * 0.08);
      m.scale.setScalar(0.12 + life * 0.25);
      m.material.opacity = Math.sin(life * Math.PI) * 0.75;
    });
  });
  return (
    <group position={[at[0], 0, at[1]]}>
      <mesh position={[0, y + 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.16, 0.6, 7]} />
        <meshStandardMaterial {...flat(p.chimney)} />
      </mesh>
      <mesh position={[0, y + 0.57, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.18, 0.06, 7]} />
        <meshStandardMaterial {...flat(p.stoneDark)} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} ref={(el) => (puffs.current[i] = el)}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial {...flat(p.smoke, { transparent: true, opacity: 0, depthWrite: false })} />
        </mesh>
      ))}
    </group>
  );
}

function Lantern() {
  const p = usePalette();
  const night = useNight();
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 1.2) * 0.07;
  });
  const hook = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.0, 0),
        new THREE.Vector3(0, 1.12, 0),
        new THREE.Vector3(0.06, 1.2, 0),
        new THREE.Vector3(0.16, 1.21, 0),
        new THREE.Vector3(0.24, 1.15, 0),
        new THREE.Vector3(0.26, 1.07, 0),
      ]),
    [],
  );
  return (
    <group position={[DOOR.at[0] - 0.95, 0, DOOR.at[1] + 0.35]}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.032, 0.045, 1.0, 6]} />
        <meshStandardMaterial {...flat(p.woodDark)} />
      </mesh>
      <mesh castShadow>
        <tubeGeometry args={[hook, 12, 0.022, 5, false]} />
        <meshStandardMaterial {...flat(p.woodDark)} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 0.06, 6]} />
        <meshStandardMaterial {...flat(p.stoneDark)} />
      </mesh>
      <group ref={ref} position={[0.26, 1.07, 0]}>
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.1, 3]} />
          <meshStandardMaterial {...flat(p.woodDark)} />
        </mesh>
        <mesh position={[0, -0.12, 0]}>
          <coneGeometry args={[0.09, 0.06, 4]} />
          <meshStandardMaterial {...flat(p.woodDark)} />
        </mesh>
        <mesh position={[0, -0.22, 0]}>
          <boxGeometry args={[0.11, 0.15, 0.11]} />
          <meshStandardMaterial color={p.lantern} emissive={p.lantern} emissiveIntensity={night ? 1.4 : 0.4} roughness={1} flatShading toneMapped={false} />
        </mesh>
        <mesh position={[0, -0.305, 0]}>
          <boxGeometry args={[0.13, 0.02, 0.13]} />
          <meshStandardMaterial {...flat(p.woodDark)} />
        </mesh>
        {night && <pointLight position={[0, -0.22, 0.1]} color={p.lantern} intensity={1.4} distance={2.6} decay={2} />}
      </group>
    </group>
  );
}

function Rug() {
  const p = usePalette();
  return (
    <group position={[FOX_POSITION[0], 0, FOX_POSITION[1]]}>
      <mesh position={[0, RUG_TOP / 2, 0]} receiveShadow>
        <cylinderGeometry args={[0.7, 0.72, RUG_TOP, 12]} />
        <meshStandardMaterial {...flat(p.rug)} />
      </mesh>
      {[0.5, 0.32].map((r, i) => (
        <mesh key={i} position={[0, RUG_TOP + 0.002 + i * 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r, r + 0.04, 12]} />
          <meshStandardMaterial {...flat(p.rugTrim)} />
        </mesh>
      ))}
    </group>
  );
}

function mapleCrown(seed, size) {
  return [
    [0, 1, 0, 0.6],
    [0.45, 0.85, 0.1, 0.42],
    [-0.42, 0.88, -0.05, 0.44],
    [0.08, 1.35, -0.08, 0.4],
    [-0.15, 0.75, 0.35, 0.34],
  ].map(([x, y, z, r], i) => ({
    x: x * size,
    y: y * size,
    z: z * size,
    geo: jitterGeometry(new THREE.IcosahedronGeometry(r * size, 0), r * size * 0.22, seed * 11 + i),
    c: i,
  }));
}

function Maple({ at, size = 1, seed = 1, tint = 0, onHill = false }) {
  const p = usePalette();
  const crown = useMemo(() => mapleCrown(seed, size), [seed, size]);
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.55 + seed) * 0.015;
  });
  const y = onHill ? hillHeight(at[0], at[1]) : groundHeight(at[0], at[1]);
  return (
    <group position={[at[0], y, at[1]]} rotation={[0, seed, 0]}>
      <mesh position={[0, 0.6 * size, 0]} castShadow>
        <cylinderGeometry args={[0.07 * size, 0.12 * size, 1.5 * size, 6]} />
        <meshStandardMaterial {...flat(p.trunk)} />
      </mesh>
      <group ref={ref} position={[0, 0.55 * size, 0]}>
        {crown.map((c, i) => (
          <mesh key={i} geometry={c.geo} position={[c.x, c.y, c.z]} castShadow receiveShadow>
            <meshStandardMaterial {...flat(i === 4 ? p.mapleShade : p.maple[(i + tint) % p.maple.length])} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Pine({ at, size = 1, seed = 1 }) {
  const p = usePalette();
  const y = groundHeight(at[0], at[1]);
  return (
    <group position={[at[0], y, at[1]]} scale={size} rotation={[0, seed, 0]}>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 0.4, 5]} />
        <meshStandardMaterial {...flat(p.trunk)} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.65 + i * 0.42, 0]} castShadow receiveShadow>
          <coneGeometry args={[0.62 - i * 0.16, 0.75, 7]} />
          <meshStandardMaterial {...flat(p.pine[(i + seed) % p.pine.length])} />
        </mesh>
      ))}
    </group>
  );
}

const WOODS = (() => {
  const list = [];
  const rows = [
    { z: -5.9, step: 1.25, offset: 0.2, s: 1.15 },
    { z: -6.8, step: 1.3, offset: 0.8, s: 1.3 },
    { z: -7.8, step: 1.4, offset: 0.3, s: 1.45 },
    { z: -8.9, step: 1.5, offset: 0.9, s: 1.6 },
    { z: -10.1, step: 1.6, offset: 0.4, s: 1.75 },
  ];
  rows.forEach((row, r) => {
    for (let x = -7.6 + row.offset; x <= 7.6; x += row.step) {
      const k = list.length;
      const curve = r < 2 ? Math.pow(Math.abs(x) / 7.4, 2) * 2.4 : 0;
      if (hillNorm(x, row.z + curve) < 1.15) continue;
      list.push({
        at: [x + (seededRand(k * 3.7) - 0.5) * 0.35, row.z + curve + (seededRand(k * 5.3) - 0.5) * 0.3],
        size: row.s * (0.85 + seededRand(k * 7.1) * 0.25),
        seed: k + 5,
        kind: (k + r) % 4 === 0 ? "pine" : "maple",
        tint: k % 4,
      });
    }
  });
  [
    [-4.6, -2.6, 1.05, "maple"], [-5.6, -0.9, 1.0, "pine"], [-5.2, 0.9, 0.95, "maple"], [-3.9, 2.6, 0.85, "pine"],
    [4.8, -2.4, 1.05, "maple"], [5.6, -0.6, 1.0, "maple"], [5.1, 1.2, 0.9, "pine"], [4.0, 2.9, 0.85, "maple"],
    [-3.7, -4.4, 1.1, "maple"], [4.3, -4.5, 1.1, "pine"],
  ].forEach(([x, z, s, kind], i) => list.push({ at: [x, z], size: s, seed: 60 + i, kind, tint: i % 4 }));
  return list;
})();

function Woods() {
  return WOODS.map((t, i) => (t.kind === "pine" ? <Pine key={i} {...t} /> : <Maple key={i} {...t} />));
}

function HillTrees() {
  return (
    <>
      <Maple at={[HILL.center[0] - 2.3, HILL.center[1] - 2.0]} size={1.15} seed={3} tint={1} />
      <Maple at={[HILL.center[0] + 2.5, HILL.center[1] - 2.1]} size={1.05} seed={8} tint={2} />
    </>
  );
}

function Pumpkin({ at, s = 1, c = 0, rot = 0 }) {
  const p = usePalette();
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(0.2, 10, 6);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const a = Math.atan2(z, x);
      const ridge = 1 + Math.cos(a * 5) * 0.06;
      pos.setXYZ(i, x * ridge, pos.getY(i) * 0.72, z * ridge);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <group position={[at[0], groundHeight(at[0], at[1]) + 0.13 * s, at[1]]} scale={s} rotation={[0, rot, 0]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshStandardMaterial {...flat(p.pumpkin[c % p.pumpkin.length])} />
      </mesh>
      <mesh position={[0, 0.16, 0]} rotation={[0, 0, 0.3]}>
        <cylinderGeometry args={[0.02, 0.03, 0.1, 5]} />
        <meshStandardMaterial {...flat(p.pumpkinStem)} />
      </mesh>
      <mesh position={[0.08, 0.15, 0.04]} rotation={[0.4, 0, -0.6]} scale={[1, 0.3, 0.7]}>
        <icosahedronGeometry args={[0.06, 0]} />
        <meshStandardMaterial {...flat(p.vine)} />
      </mesh>
    </group>
  );
}

function PumpkinPatch() {
  return (
    <>
      <Pumpkin at={[2.05, 0.55]} s={1.25} c={0} rot={0.4} />
      <Pumpkin at={[2.55, 0.9]} s={0.9} c={1} rot={1.6} />
      <Pumpkin at={[2.35, 0.05]} s={0.75} c={2} rot={2.6} />
      <Pumpkin at={[1.75, 1.15]} s={0.65} c={1} rot={4.1} />
      <Pumpkin at={[-2.3, 1.85]} s={0.85} c={2} rot={0.9} />
    </>
  );
}

function LeafPile({ at, s = 1, seed = 1 }) {
  const p = usePalette();
  const leaves = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => {
        const a = seededRand(seed + i * 2.3) * Math.PI * 2;
        const r = Math.sqrt(seededRand(seed + i * 4.1)) * 0.42;
        const h = (1 - (r / 0.42) ** 2) * 0.24 + seededRand(seed + i * 6.1) * 0.03;
        return { x: Math.cos(a) * r, z: Math.sin(a) * r * 0.8, y: h, rot: [seededRand(i * 1.1) * 1.4 - 0.7, a, seededRand(i * 2.3) * 1.4 - 0.7], c: i % 4 };
      }),
    [seed],
  );
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() + seed;
    const rustle = Math.pow(Math.max(0, Math.sin(t * 0.6)), 20);
    ref.current.scale.set(1 + rustle * 0.05, 1 + rustle * 0.1, 1 + rustle * 0.05);
  });
  return (
    <group position={[at[0], groundHeight(at[0], at[1]), at[1]]} scale={s}>
      <group ref={ref}>
        <mesh position={[0, 0.06, 0]} scale={[0.42, 0.18, 0.34]} receiveShadow>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial {...flat(p.leafPile[3])} />
        </mesh>
        {leaves.map((l, i) => (
          <mesh key={i} position={[l.x, l.y, l.z]} rotation={l.rot} castShadow>
            <circleGeometry args={[0.07, 5]} />
            <meshStandardMaterial {...flat(p.leafPile[l.c], { side: THREE.DoubleSide })} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function LeafPiles() {
  return (
    <>
      <LeafPile at={[-1.45, 0.25]} s={1.2} seed={3} />
      <LeafPile at={[1.25, 2.2]} s={0.9} seed={11} />
      <LeafPile at={[-2.9, -1.4]} s={1.0} seed={19} />
    </>
  );
}

function AppleCrate() {
  const p = usePalette();
  const at = [1.55, -0.85];
  return (
    <group position={[at[0], groundHeight(at[0], at[1]), at[1]]} rotation={[0, -0.4, 0]}>
      <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.28, 0.36]} />
        <meshStandardMaterial {...flat(p.wood)} />
      </mesh>
      {[-0.08, 0.08].map((y, i) => (
        <mesh key={i} position={[0, 0.14 + y, 0.183]}>
          <boxGeometry args={[0.52, 0.04, 0.01]} />
          <meshStandardMaterial {...flat(p.woodDark)} />
        </mesh>
      ))}
      {[[-0.13, 0.05], [0.0, -0.06], [0.13, 0.06], [-0.05, 0.09], [0.1, -0.08], [-0.15, -0.07]].map(([x, z], i) => (
        <mesh key={`a${i}`} position={[x, 0.3, z]} castShadow>
          <icosahedronGeometry args={[0.065, 0]} />
          <meshStandardMaterial {...flat(p.apple)} />
        </mesh>
      ))}
    </group>
  );
}

function PathStones() {
  const p = usePalette();
  const stones = [
    [0.55, 4.6, 0.26], [0.2, 3.85, 0.24], [0.6, 3.15, 0.25], [0.25, 2.45, 0.23], [0.5, 1.8, 0.22], [0.2, 1.15, 0.21], [0.3, 0.5, 0.2],
  ];
  return stones.map(([x, z, r], i) => (
    <mesh key={i} position={[x, groundHeight(x, z) + 0.02, z]} rotation={[0, i * 1.3, 0]} scale={[1, 1, 0.82]} receiveShadow castShadow>
      <cylinderGeometry args={[r, r * 1.08, 0.05, 7]} />
      <meshStandardMaterial {...flat(p.path)} />
    </mesh>
  ));
}

function Bunting() {
  const p = usePalette();
  const r = DOOR.radius + 0.28;
  const curve = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (1 - i / 12);
      pts.push(new THREE.Vector3(DOOR.at[0] + Math.cos(a) * r, Math.sin(a) * r * 0.92 + 0.04, DOOR.at[1] + 0.06));
    }
    return new THREE.CatmullRomCurve3(pts);
  }, [r]);
  const refs = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((m, i) => {
      if (m) m.rotation.x = Math.sin(t * 2 + i * 0.7) * 0.2;
    });
  });
  const flags = Array.from({ length: 9 }, (_, i) => (i + 0.5) / 9);
  return (
    <group>
      <mesh>
        <tubeGeometry args={[curve, 24, 0.008, 3, false]} />
        <meshStandardMaterial {...flat(p.woodDark)} />
      </mesh>
      {flags.map((t, i) => {
        const pt = curve.getPointAt(t);
        return (
          <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[pt.x, pt.y - 0.06, pt.z + 0.01]} rotation={[0, 0, Math.PI]}>
            <coneGeometry args={[0.05, 0.11, 3]} />
            <meshStandardMaterial {...flat(p.bunting[i % p.bunting.length], { side: THREE.DoubleSide })} />
          </mesh>
        );
      })}
    </group>
  );
}

function Mushrooms() {
  const p = usePalette();
  const night = useNight();
  const items = [
    [-0.75, -1.45, 1.0, 0], [-0.55, -1.3, 0.65, 1], [-0.95, -1.25, 0.55, 0],
    [2.9, -1.4, 0.8, 1], [-2.05, 2.55, 0.7, 0], [-1.85, 2.7, 0.5, 1],
  ];
  return items.map(([x, z, s, c], i) => (
    <group key={i} position={[x, groundHeight(x, z), z]} scale={s} rotation={[0, i, (i % 2 ? 1 : -1) * 0.08]}>
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 0.16, 6]} />
        <meshStandardMaterial {...flat(p.mushroomStem)} />
      </mesh>
      <mesh position={[0, 0.17, 0]} castShadow>
        <sphereGeometry args={[0.12, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial {...flat(p.mushroomCap[c], { emissive: night ? p.mushroomCap[c] : "#000000", emissiveIntensity: night ? 0.4 : 0 })} />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[Math.cos(k * 2.1) * 0.06, 0.25, Math.sin(k * 2.1) * 0.06]}>
          <icosahedronGeometry args={[0.016, 0]} />
          <meshStandardMaterial {...flat("#ffffff")} />
        </mesh>
      ))}
    </group>
  ));
}

function scatter(count, seed, accept) {
  const out = [];
  let i = 0;
  while (out.length < count && i < count * 20) {
    const x = (seededRand(seed + i * 1.37) - 0.5) * 13;
    const z = (seededRand(seed + i * 2.71) - 0.5) * 12 + 0.3;
    i++;
    if (accept(x, z)) out.push([x, z, seededRand(seed + i * 4.13)]);
  }
  return out;
}

const onOpenGround = (x, z) => hillNorm(x, z) > 1.02 && Math.hypot(x - FOX_POSITION[0], z - FOX_POSITION[1]) > 0.85 && !(Math.abs(x - 0.4) < 0.45 && z > 0.2 && z < 5) && z > -5;

function LeafLitter() {
  const p = usePalette();
  const ref = useRef();
  const spots = useMemo(() => scatter(220, 91, onOpenGround), []);
  useEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    spots.forEach(([x, z, r], i) => {
      q.setFromEuler(new THREE.Euler(-Math.PI / 2 + (r - 0.5) * 0.3, 0, r * 6.28));
      m.compose(new THREE.Vector3(x, groundHeight(x, z) + 0.012, z), q, new THREE.Vector3(1, 0.7 + r * 0.5, 1));
      ref.current.setMatrixAt(i, m);
      ref.current.setColorAt(i, c.set(p.leafPile[i % p.leafPile.length]));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [spots, p]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spots.length]} receiveShadow>
      <circleGeometry args={[0.06, 5]} />
      <meshStandardMaterial roughness={1} metalness={0} flatShading side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

function Tufts() {
  const p = usePalette();
  const ref = useRef();
  const spots = useMemo(() => scatter(140, 41, onOpenGround), []);
  const geo = useMemo(() => {
    const parts = [];
    for (let k = 0; k < 3; k++) {
      const b = new THREE.ConeGeometry(0.03, 0.22, 3);
      b.translate(0, 0.11, 0);
      b.rotateZ((k - 1) * 0.35);
      b.rotateY(k * 2.1);
      parts.push(b.toNonIndexed());
    }
    const total = parts.reduce((n, b) => n + b.attributes.position.array.length, 0);
    const pos = new Float32Array(total);
    let o = 0;
    parts.forEach((b) => {
      pos.set(b.attributes.position.array, o);
      o += b.attributes.position.array.length;
    });
    const merged = new THREE.BufferGeometry();
    merged.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    merged.computeVertexNormals();
    return merged;
  }, []);
  useEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const c = new THREE.Color();
    spots.forEach(([x, z, r], i) => {
      const s = 0.7 + r * 0.8;
      q.setFromEuler(new THREE.Euler(0, r * 6.28, 0));
      m.compose(new THREE.Vector3(x, groundHeight(x, z), z), q, new THREE.Vector3(s, s, s));
      ref.current.setMatrixAt(i, m);
      ref.current.setColorAt(i, c.set(p.tuft[i % p.tuft.length]));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [spots, p]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, spots.length]} receiveShadow>
      <meshStandardMaterial roughness={1} metalness={0} flatShading />
    </instancedMesh>
  );
}

function Acorns() {
  const p = usePalette();
  const items = useMemo(() => scatter(14, 177, (x, z) => onOpenGround(x, z) && Math.hypot(x, z) < 3.2), []);
  return items.map(([x, z, r], i) => (
    <group key={i} position={[x, groundHeight(x, z) + 0.04, z]} rotation={[0.3, r * 6, 1.2]}>
      <mesh scale={[1, 1.25, 1]}>
        <icosahedronGeometry args={[0.04, 0]} />
        <meshStandardMaterial {...flat(p.acorn)} />
      </mesh>
      <mesh position={[0, 0.035, 0]} scale={[1, 0.5, 1]}>
        <icosahedronGeometry args={[0.045, 0]} />
        <meshStandardMaterial {...flat(p.acornCap)} />
      </mesh>
    </group>
  ));
}

function FallingLeaves() {
  const p = usePalette();
  const refs = useRef([]);
  const leaves = useMemo(() => Array.from({ length: 14 }, (_, i) => ({ x: (seededRand(i * 3.1) - 0.5) * 7, z: -1.5 + (seededRand(i * 5.9) - 0.5) * 5, phase: i / 14, speed: 0.06 + seededRand(i * 2.2) * 0.05, c: i % 4 })), []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((m, i) => {
      if (!m) return;
      const l = leaves[i];
      const life = ((t * l.speed + l.phase) % 1 + 1) % 1;
      m.position.set(l.x + Math.sin(t * 1.4 + i) * 0.35, 3.4 - life * 3.4, l.z + Math.cos(t * 1.1 + i) * 0.25);
      m.rotation.set(t * 2 + i, t * 1.3, t * 1.7 + i);
    });
  });
  return leaves.map((l, i) => (
    <mesh key={i} ref={(el) => (refs.current[i] = el)}>
      <circleGeometry args={[0.07, 5]} />
      <meshStandardMaterial {...flat(p.leafPile[l.c], { side: THREE.DoubleSide })} />
    </mesh>
  ));
}

function LeafPuff({ position, onDone }) {
  const p = usePalette();
  const refs = useRef([]);
  const start = useRef(null);
  const DURATION = 0.8;
  const bits = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ a: (i / 6) * Math.PI * 2, c: i % 4 })), []);
  useFrame(({ clock }) => {
    if (start.current === null) start.current = clock.getElapsedTime();
    const elapsed = clock.getElapsedTime() - start.current;
    if (elapsed > DURATION) {
      onDone();
      return;
    }
    const t = elapsed / DURATION;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const b = bits[i];
      m.position.set(position[0] + Math.cos(b.a) * t * 0.5, RUG_TOP + Math.sin(t * Math.PI) * 0.35, position[1] + Math.sin(b.a) * t * 0.4);
      m.rotation.set(t * 6 + i, t * 4, i);
      m.material.opacity = 1 - t;
    });
  });
  return bits.map((b, i) => (
    <mesh key={i} ref={(el) => (refs.current[i] = el)}>
      <circleGeometry args={[0.05, 5]} />
      <meshStandardMaterial {...flat(p.leafPile[b.c], { side: THREE.DoubleSide, transparent: true })} />
    </mesh>
  ));
}


function useNormalizedFox(size) {
  const gltf = useGLTF(FOX_MODEL);
  return useMemo(() => {
    const clone = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const dim = box.getSize(new THREE.Vector3());
    const scale = size / (dim.y || 1);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    clone.scale.setScalar(scale);
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const mat = o.material;
        if (mat && "roughness" in mat) mat.roughness = Math.min(mat.roughness ?? 0.9, 0.9);
      }
    });
    const wrapper = new THREE.Group();
    wrapper.add(clone);
    wrapper.userData.placement = {
      offset: [-center.x * scale, -box.min.y * scale, -center.z * scale],
      scale,
      box: box.clone(),
    };
    return wrapper;
  }, [gltf.scene, size]);
}

function Fox({ position = FOX_POSITION, onMunch, inline: InlineAnimation = null, inlineProps, variant }) {
  const group = useRef(null);
  const frame = useRef(null);
  const { camera, gl } = useThree();
  const nextMunch = useRef(1.5 + Math.random() * 2.5);
  const pounceAt = useRef(-10);
  const nextGlance = useRef(1 + Math.random() * 2);
  const glance = useRef(0);
  const motion = useRef({ pounce: 0, glance: 0 });
  const model = useNormalizedFox(FOX_HEIGHT);
  const { offset, scale } = model.userData.placement;
  const placementOffset = useMemo(() => [offset[0], offset[1] + RUG_TOP, offset[2]], [offset]);

  const anchorPoints = useMemo(() => {
    const { box } = model.userData.placement;
    const x = position[0] + offset[0] + ((box.min.x + box.max.x) / 2) * scale;
    const z = position[1] + offset[2] + ((box.min.z + box.max.z) / 2) * scale;
    return {
      top: new THREE.Vector3(x, RUG_TOP + offset[1] + box.max.y * scale + BUBBLE_LIFT, z),
      bottom: new THREE.Vector3(x, RUG_TOP + offset[1] + box.min.y * scale, z),
      topWorld: new THREE.Vector3(),
      bottomWorld: new THREE.Vector3(),
    };
  }, [model, position, offset, scale]);

  useLayoutEffect(() => {
    if (group.current) group.current.rotation.y = 0;
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
      nextMunch.current = t + 4 + Math.random() * 3.5;
      pounceAt.current = t;
    }
    const u = (t - pounceAt.current) / POUNCE_TIME;
    if (u > 0.55 && u < 0.6 && !motion.current.landed) {
      motion.current.landed = true;
      onMunch?.(position);
    }
    if (u >= 1) motion.current.landed = false;
    motion.current.pounce = u > 0 && u < 1 ? u : 0;
    if (t > nextGlance.current) {
      nextGlance.current = t + 2 + Math.random() * 2.5;
      glance.current = (Math.random() - 0.5) * 0.35;
    }
    motion.current.glance = glance.current;
    group.current.rotation.y += (glance.current - group.current.rotation.y) * 0.04;
    const leap = u > 0.4 && u < 0.85 ? Math.sin(((u - 0.4) / 0.45) * Math.PI) : 0;
    group.current.position.y = Math.sin(t * 1.2) * 0.01 + leap * 0.12;
  });

  if (InlineAnimation) {
    return (
      <group ref={frame}>
        <InlineAnimation
          {...inlineProps}
          placement={{ homePosition: position, offset: placementOffset, scale, yaw: 0, lean: INLINE_LEAN }}
          idleModelPath={FOX_MODEL}
          variant={variant}
        />
      </group>
    );
  }

  return (
    <group ref={frame}>
      <group ref={group} position={[position[0], 0, position[1]]}>
        <group position={[-position[0], 0, -position[1]]}>
          <FoxMood
            modelUrl={FOX_MODEL}
            idleModelPath={FOX_MODEL}
            placement={{ homePosition: position, offset: placementOffset, scale, yaw: 0, lean: 0 }}
            Rig={FoxIdleRig}
            rigProps={{ motion }}
          />
        </group>
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
    if (this.state.failed) return null;
    return this.props.children;
  }
}

function headHit(clientX, clientY) {
  const a = window.__moodAnchor;
  if (!a) return null;
  const height = a.bottom - a.top;
  const halfWidth = height * 0.4;
  const bottom = a.top + height * 0.5;
  if (clientX < a.x - halfWidth || clientX > a.x + halfWidth || clientY < a.top - height * 0.04 || clientY > bottom) return null;
  return THREE.MathUtils.clamp((clientX - a.x) / (halfWidth * 0.8), -1, 1);
}

function usePetTouch(enabled, onPet, onRelease) {
  const handlers = useRef({ onPet, onRelease });
  handlers.current = { onPet, onRelease };
  useEffect(() => {
    if (!enabled) return undefined;
    let activeId = null;
    const down = (e) => {
      const x = headHit(e.clientX, e.clientY);
      if (x === null) return;
      activeId = e.pointerId;
      handlers.current.onPet(x, true);
      e.stopPropagation();
      if (e.cancelable && e.pointerType !== "mouse") e.preventDefault();
    };
    const move = (e) => {
      if (activeId === null) {
        if (e.pointerType === "mouse") document.body.style.cursor = headHit(e.clientX, e.clientY) === null ? "" : "grab";
        return;
      }
      if (e.pointerId !== activeId) return;
      e.stopPropagation();
      const a = window.__moodAnchor;
      const x = a ? THREE.MathUtils.clamp((e.clientX - a.x) / ((a.bottom - a.top) * 0.34), -1, 1) : 0;
      handlers.current.onPet(x, false);
    };
    const up = (e) => {
      if (activeId === null || e.pointerId !== activeId) return;
      activeId = null;
      handlers.current.onRelease();
    };
    window.addEventListener("pointerdown", down, { capture: true, passive: false });
    window.addEventListener("pointermove", move, { capture: true });
    window.addEventListener("pointerup", up, { capture: true });
    window.addEventListener("pointercancel", up, { capture: true });
    return () => {
      window.removeEventListener("pointerdown", down, { capture: true });
      window.removeEventListener("pointermove", move, { capture: true });
      window.removeEventListener("pointerup", up, { capture: true });
      window.removeEventListener("pointercancel", up, { capture: true });
      document.body.style.cursor = "";
    };
  }, [enabled]);
}

function FoxSlot({ onMunch }) {
  const mood = useMoodAnimation();
  const [petting, setPetting] = useState(false);
  const pet = useRef({ until: 0, x: null });
  const Mood = mood.active ? INLINE_MOODS[mood.mood] || null : null;
  const Inline = petting ? PetFox : Mood;
  const moodActive = (name) => mood.active && mood.mood === name;

  const handlePet = (x, first) => {
    const now = performance.now() / 1000;
    pet.current = first ? { until: Infinity, x: null, downAt: now } : { ...pet.current, until: Infinity, x };
    if (!petting) setPetting(true);
  };
  const handleRelease = () => {
    const now = performance.now() / 1000;
    const downAt = pet.current.downAt ?? now;
    pet.current = { until: Math.max(downAt + PET_HOLD, now + PET_LINGER), x: null };
  };
  const handleDone = () => setPetting(false);
  usePetTouch(true, handlePet, handleRelease);

  if (mood.active && !Inline) return null;
  return (
    <FoxErrorBoundary>
      <Suspense fallback={null}>
        <Fox
          key={petting ? (moodActive("angry") ? "refuse" : moodActive("crying") ? "comfort" : "pet") : Inline ? `${mood.mood}-${mood.variant || ""}` : "idle"}
          variant={mood.variant}
          onMunch={Inline ? undefined : onMunch}
          inline={Inline}
          inlineProps={petting ? { pet, onDone: handleDone, refuse: moodActive("angry"), comfort: moodActive("crying") } : undefined}
        />
      </Suspense>
    </FoxErrorBoundary>
  );
}

const CAM_ELEVATION = 0.62;
const CAM_YAW = -0.35;
const CAM_DISTANCE = 9;
const SCREEN_LIFT = 1.25;
const VIEW_TARGET = [
  FOX_POSITION[0] - Math.sin(CAM_ELEVATION) * Math.sin(CAM_YAW) * SCREEN_LIFT,
  0.5 + Math.cos(CAM_ELEVATION) * SCREEN_LIFT,
  FOX_POSITION[1] - Math.sin(CAM_ELEVATION) * Math.cos(CAM_YAW) * SCREEN_LIFT,
];
const CAM_POSITION = [
  VIEW_TARGET[0] + CAM_DISTANCE * Math.cos(CAM_ELEVATION) * Math.sin(CAM_YAW),
  VIEW_TARGET[1] + CAM_DISTANCE * Math.sin(CAM_ELEVATION),
  VIEW_TARGET[2] + CAM_DISTANCE * Math.cos(CAM_ELEVATION) * Math.cos(CAM_YAW),
];

export function FoxHabitat3D({ showCharacter = true }) {
  const night = useNightModeSetting();
  const L = night ? LIGHTS.night : LIGHTS.day;
  const [puffs, setPuffs] = useState([]);

  const addPuff = (position) => setPuffs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, position }]);
  const removePuff = (id) => setPuffs((prev) => prev.filter((pf) => pf.id !== id));

  useEffect(() => {
    useGLTF.preload(FOX_MODEL);
  }, []);

  useEffect(() => {
    window.__habitatInline = { animal: "fox", moods: Object.keys(INLINE_MOODS) };
    window.dispatchEvent(new CustomEvent("habitat-inline", { detail: window.__habitatInline }));
    return () => {
      window.__habitatInline = null;
      window.__moodAnchor = null;
      window.dispatchEvent(new CustomEvent("habitat-inline", { detail: null }));
    };
  }, []);

  return (
    <div className="habitat-canvas-wrap habitat-canvas-wrap--no-touch-scroll">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        orthographic
        camera={{ position: CAM_POSITION, zoom: 74, near: 0.1, far: 200 }}
        gl={{ toneMappingExposure: L.exposure, powerPreference: "high-performance" }}
        style={{ touchAction: "none" }}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = "none";
        }}
      >
        <NightContext.Provider value={night}>
          <ExposureSync exposure={L.exposure} />
          <color attach="background" args={[L.background]} />
          <fog attach="fog" args={[L.background, night ? 36 : 24, night ? 110 : 75]} />

          <OrbitControls
            makeDefault
            target={VIEW_TARGET}
            enableDamping
            dampingFactor={0.08}
            enablePan
            screenSpacePanning
            panSpeed={1}
            enableRotate
            rotateSpeed={0.6}
            minPolarAngle={0.55}
            maxPolarAngle={1.15}
            minZoom={74}
            maxZoom={150}
            mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
            touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
          />

          <ambientLight intensity={L.ambient} color={L.ambientColor} />
          <directionalLight
            position={[-4, 8, 5]}
            intensity={L.sun}
            color={L.sunColor}
            castShadow
            shadow-bias={-0.0005}
            shadow-normalBias={0.02}
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-7}
            shadow-camera-right={7}
            shadow-camera-top={7}
            shadow-camera-bottom={-7}
          />
          <directionalLight position={[5, 3, -4]} intensity={L.rim} color={L.rimColor} />
          <hemisphereLight args={[L.hemiSky, L.hemiGround, L.hemi]} />
          {night && <GlowStars />}

          <Suspense fallback={null}>
            <Ground />
            <Hill />
            <DenDoor />
            <RoundWindow />
            <Chimney />
            <Lantern />
            <Rug />
            <HillTrees />
            <Woods />
            <PumpkinPatch />
            <LeafPiles />
            <AppleCrate />
            <PathStones />
            <Bunting />
            <Mushrooms />
            <LeafLitter />
            <Tufts />
            <Acorns />
            {puffs.map((pf) => (
              <LeafPuff key={pf.id} position={pf.position} onDone={() => removePuff(pf.id)} />
            ))}
            {night ? (
              <Fireflies />
            ) : (
              <>
                <FallingLeaves />
                <Butterfly bounds={4.2} speed={0.5} height={1.0} color="#f6c64a" />
              </>
            )}
          </Suspense>
          {showCharacter && <FoxSlot onMunch={addPuff} />}
        </NightContext.Provider>
      </Canvas>
    </div>
  );
}

export default FoxHabitat3D;