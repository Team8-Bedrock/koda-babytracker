import React, { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import "../../styling/components/habitats.css";
import { useGroundedOffset, seededRand } from "./habitatUtils";
import FeedingFrog from "../animations/frog/FeedingFrog";
import AngryFrog from "../animations/frog/AngryFrog";
import CryingFrog from "../animations/frog/CryingFrog";
import HungryFrog from "../animations/frog/HungryFrog";
import SleepyFrog from "../animations/frog/SleepyFrog";
import SleepingFrog from "../animations/frog/SleepingFrog";
import WokeFrog from "../animations/frog/WokeFrog";
import HappyFrog from "../animations/frog/HappyFrog";
import EnergeticFrog from "../animations/frog/EnergeticFrog";
import QuietFrog from "../animations/frog/QuietFrog";
import OtherFrog from "../animations/frog/OtherFrog";
import PlaytimeFrog from "../animations/frog/PlaytimeFrog";
import DiaperFrog from "../animations/frog/DiaperFrog";
import PetFrog from "../animations/frog/PetFrog";
import { FrogMood, FrogIdleRig, FROG_MODELS } from "../animations/frog/frogRig";

const INLINE_MOODS = {
  feeding: FeedingFrog,
  angry: AngryFrog,
  crying: CryingFrog,
  hungry: HungryFrog,
  sleepy: SleepyFrog,
  sleeping: SleepingFrog,
  woke: WokeFrog,
  groggy: WokeFrog,
  happy: HappyFrog,
  energetic: EnergeticFrog,
  quiet: QuietFrog,
  other: OtherFrog,
  playtime: PlaytimeFrog,
  diaper: DiaperFrog,
};
const INLINE_LEAN = 0.1;
const PET_HOLD = 2.2;
const PET_LINGER = 1.2;
const isFrogModel = (model) => /characters\/frog\/frog\.glb/.test(String(model || ""));
const BUBBLE_LIFT = -0.12;
function useNightModeSetting() {
  const [night, setNight] = React.useState(() => typeof window !== "undefined" && localStorage.getItem("koda-dark-mode") === "true");
  React.useEffect(() => {
    const onMode = (e) => setNight(e?.detail && typeof e.detail.isDarkMode === "boolean" ? e.detail.isDarkMode : localStorage.getItem("koda-dark-mode") === "true");
    window.addEventListener("koda-dark-mode", onMode);
    return () => window.removeEventListener("koda-dark-mode", onMode);
  }, []);
  return night;
}
const NightContext = React.createContext(false);
const useNight = () => React.useContext(NightContext);

const LIGHTS = {
  day: {
    background: "#d4ebbd", exposure: 1.08,
    ambient: 0.7, ambientColor: "#fff1d8",
    sun: 1.9, sunColor: "#ffe6bc",
    rim: 0.45, rimColor: "#ffd9ad",
    hemiSky: "#fff7e0", hemiGround: "#6c8a3a", hemi: 0.85,
  },
  night: {
    background: "#24405e", exposure: 1.0,
    ambient: 0.55, ambientColor: "#c3d4f0",
    sun: 0.75, sunColor: "#cfe0ff",
    rim: 0.5, rimColor: "#98c8e0",
    hemiSky: "#8eb0de", hemiGround: "#22403a", hemi: 0.7,
  },
};

const PALETTE = {
  day: {
    grass: ["#8cc455", "#97cc5a", "#80bb4e", "#a5d063", "#76b04a"],
    grassFar: "#b4d36a",
    bank: "#a97a4b",
    bankLip: "#8f6640",
    waterShallow: "#6cb88f",
    waterMid: "#479a7c",
    waterDeep: "#2f7a63",
    glint: "#e9fbe6",
    pad: "#77c056",
    padInner: "#93d26b",
    padVein: "#5fa847",
    leaf: ["#6aac48", "#7fbd55", "#5a9a44", "#73b44e"],
    leafDark: "#4f8a3c",
    trunk: "#8a5d3b",
    rock: ["#a7b3c6", "#97a4b9", "#b6c0d0"],
    rockWet: "#6f8496",
    stepping: "#dccaa2",
    cattailStalk: "#c49a5c",
    cattailHead: "#ee6c39",
    reed: "#7fb24f",
    dandelion: "#fbfbf4",
    flowers: ["#fff3b8", "#ffffff", "#ffc7da", "#ffd36b"],
    mushroomCap: ["#ff7b6b", "#ffb3c2", "#ffd36b"],
    mushroomStem: "#fff4e2",
    wood: "#b98a5a",
    woodDark: "#93693f",
    lotus: ["#ffd3e2", "#fff6fa"],
    boat: "#fff8ef",
    boatSail: "#ffb3c6",
    bloom: "#ffe36e",
  },
  night: {
    grass: ["#3f7a63", "#457f67", "#3a725d", "#4b876b", "#356a56"],
    grassFar: "#4b8070",
    bank: "#5e5444",
    bankLip: "#4c4437",
    waterShallow: "#3f8aa0",
    waterMid: "#2b6b8a",
    waterDeep: "#1b4766",
    glint: "#d8ecff",
    pad: "#3f8a5c",
    padInner: "#4f9a68",
    padVein: "#347a4f",
    leaf: ["#346a52", "#3f7a5c", "#2e5e49", "#4c8466"],
    leafDark: "#28503f",
    trunk: "#4f3d33",
    rock: ["#6d7c94", "#7a89a0", "#8794aa"],
    rockWet: "#4a5a70",
    stepping: "#8e8a86",
    cattailStalk: "#7d6a52",
    cattailHead: "#b8603e",
    reed: "#3f7656",
    dandelion: "#e4ecff",
    flowers: ["#fff1b0", "#e8f0ff", "#ffcfe2", "#ffe08a"],
    mushroomCap: ["#ff8f7a", "#ffc2d2", "#ffe08a"],
    mushroomStem: "#e9ecf6",
    wood: "#6f5640",
    woodDark: "#584332",
    lotus: ["#ffd9e8", "#fff7fb"],
    boat: "#e6ecf8",
    boatSail: "#ffc2d2",
    bloom: "#fff1a0",
  },
};

const NIGHT = { firefly: "#e6ff8a", star: "#fff1c9" };

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

const POND_CENTER = [0, -1.0];
const POND_RX = 3.6;
const POND_RZ_FRONT = 2.45;
const POND_RZ_BACK = 2.9;
const HOME_PAD_POSITION = [0, -1.2];
const WATER_Y = 0.02;

const pondWobble = (theta) => 1 + 0.08 * Math.sin(3 * theta + 0.6) + 0.05 * Math.sin(5 * theta + 1.7) + 0.035 * Math.sin(7 * theta + 0.3);

function pondPoint(theta, s = 1) {
  const rz = Math.sin(theta) >= 0 ? POND_RZ_FRONT : POND_RZ_BACK;
  const r = pondWobble(theta) * s;
  return [POND_CENTER[0] + Math.cos(theta) * POND_RX * r, POND_CENTER[1] + Math.sin(theta) * rz * r];
}

function pondNorm(x, z) {
  const dx = x - POND_CENTER[0];
  const dz = z - POND_CENTER[1];
  const rz = dz >= 0 ? POND_RZ_FRONT : POND_RZ_BACK;
  const nx = dx / POND_RX;
  const nz = dz / rz;
  const theta = Math.atan2(nz, nx);
  return Math.sqrt(nx * nx + nz * nz) / pondWobble(theta);
}

function pondShape(s = 1, segments = 64) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segments; i++) {
    const [x, z] = pondPoint((i / segments) * Math.PI * 2, s);
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  }
  return shape;
}

function pondRingShape(outer, inner, segments = 64) {
  const shape = pondShape(outer, segments);
  const hole = new THREE.Path();
  for (let i = segments; i >= 0; i--) {
    const [x, z] = pondPoint((i / segments) * Math.PI * 2, inner);
    if (i === segments) hole.moveTo(x, -z);
    else hole.lineTo(x, -z);
  }
  shape.holes.push(hole);
  return shape;
}

function paintFaces(geometry, colorAt) {
  const geo = geometry.index ? geometry.toNonIndexed() : geometry;
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3;
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3;
    colorAt(x, y, z, c, i / 3);
    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = c.r;
      colors[(i + k) * 3 + 1] = c.g;
      colors[(i + k) * 3 + 2] = c.b;
    }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

const POND2 = { center: [0.75, -5.95], rx: 1.35, rz: 0.75 };

function pond2Norm(x, z) {
  const nx = (x - POND2.center[0]) / POND2.rx;
  const nz = (z - POND2.center[1]) / POND2.rz;
  const theta = Math.atan2(nz, nx);
  return Math.sqrt(nx * nx + nz * nz) / (1 + 0.07 * Math.sin(3 * theta + 2.1) + 0.04 * Math.sin(5 * theta + 0.4));
}

function pond2Point(theta, s = 1) {
  const r = (1 + 0.07 * Math.sin(3 * theta + 2.1) + 0.04 * Math.sin(5 * theta + 0.4)) * s;
  return [POND2.center[0] + Math.cos(theta) * POND2.rx * r, POND2.center[1] + Math.sin(theta) * POND2.rz * r];
}

function pond2Shape(s = 1, segments = 40) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= segments; i++) {
    const [x, z] = pond2Point((i / segments) * Math.PI * 2, s);
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  }
  return shape;
}

const FOREST_START = 7.0;

function groundHeight(x, z) {
  const d = pondNorm(x, z);
  const near = Math.min(THREE.MathUtils.smoothstep(d, 1.12, 1.6), THREE.MathUtils.smoothstep(pond2Norm(x, z), 1.1, 1.5));
  const dist = Math.hypot(x, z * 0.8);
  const hills = THREE.MathUtils.smoothstep(dist, 8.5, 16) * (0.25 + fbm(x * 0.12, z * 0.12) * 0.9);
  return near * (fbm(x * 0.7, z * 0.7) * 0.07 + hills);
}

function Ground() {
  const p = usePalette();
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(70, 70, 90, 90);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      pos.setY(i, groundHeight(x, z) - 0.002);
    }
    const far = new THREE.Color(p.grassFar);
    const shade = new THREE.Color(p.leafDark);
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const other = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const n = fbm(x * 0.28 + 3, z * 0.28 + 7);
      const idx = n * (p.grass.length - 1);
      const lo = Math.floor(idx);
      c.set(p.grass[lo]);
      other.set(p.grass[Math.min(p.grass.length - 1, lo + 1)]);
      c.lerp(other, idx - lo);
      c.lerp(far, THREE.MathUtils.smoothstep(Math.hypot(x, z), 7, 18) * 0.35);
      const forest = THREE.MathUtils.smoothstep(-z, FOREST_START - 0.5 - Math.pow(Math.abs(x) / 7.4, 2) * 2.2, FOREST_START + 0.4 - Math.pow(Math.abs(x) / 7.4, 2) * 2.2);
      c.lerp(shade, forest * 0.55);
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

function LittlePond() {
  const p = usePalette();
  const geos = useMemo(() => {
    const mk = (shape) => {
      const g = new THREE.ShapeGeometry(shape, 4);
      g.rotateX(-Math.PI / 2);
      return g;
    };
    const ring = pond2Shape(1.1);
    const hole = new THREE.Path();
    const segs = 40;
    for (let i = segs; i >= 0; i--) {
      const [x, z] = pond2Point((i / segs) * Math.PI * 2, 0.99);
      if (i === segs) hole.moveTo(x, -z);
      else hole.lineTo(x, -z);
    }
    ring.holes.push(hole);
    const lip = new THREE.ExtrudeGeometry(ring, { depth: 0.045, bevelEnabled: false, curveSegments: 4 });
    lip.rotateX(-Math.PI / 2);
    return { lip, shallow: mk(pond2Shape(1.0)), deep: mk(pond2Shape(0.7)) };
  }, []);
  const pads = useMemo(() => [
    { at: pond2Point(2.6, 0.55), r: 0.22, rot: 1.0, flower: true },
    { at: pond2Point(0.4, 0.6), r: 0.17, rot: 3.4 },
    { at: pond2Point(4.4, 0.45), r: 0.15, rot: 5.0 },
  ], []);
  const cattails = useMemo(() => {
    const [cx, cz] = pond2Point(3.4, 1.08);
    return Array.from({ length: 4 }, (_, i) => ({ x: cx + (seededRand(i * 4.4) - 0.5) * 0.3, z: cz + (seededRand(i * 6.1) - 0.5) * 0.2, h: 0.6 + seededRand(i * 2.2) * 0.35 }));
  }, []);
  const refs = useSway(cattails.length, 0.05, 1.2);
  return (
    <group>
      <mesh geometry={geos.lip} position={[0, -0.025, 0]} receiveShadow castShadow>
        <meshStandardMaterial {...flat(p.bank)} />
      </mesh>
      <mesh geometry={geos.shallow} position={[0, WATER_Y, 0]} receiveShadow>
        <meshStandardMaterial {...flat(p.waterShallow, { roughness: 0.75 })} />
      </mesh>
      <mesh geometry={geos.deep} position={[0, WATER_Y + 0.003, 0]} receiveShadow>
        <meshStandardMaterial {...flat(p.waterMid, { roughness: 0.75 })} />
      </mesh>
      {pads.map((pd, i) => (
        <LilyPad key={i} index={i + 20} at={pd.at} r={pd.r} rot={pd.rot} flower={pd.flower} />
      ))}
      {cattails.map((c, i) => (
        <group key={i} position={[c.x, 0, c.z]}>
          <group ref={(el) => (refs.current[i] = el)}>
            <mesh position={[0, c.h / 2, 0]} castShadow>
              <cylinderGeometry args={[0.012, 0.018, c.h, 5]} />
              <meshStandardMaterial {...flat(p.cattailStalk)} />
            </mesh>
            <mesh position={[0, c.h * 0.86, 0]} castShadow>
              <capsuleGeometry args={[0.04, c.h * 0.2, 2, 6]} />
              <meshStandardMaterial {...flat(p.cattailHead)} />
            </mesh>
          </group>
        </group>
      ))}
      <Boulder at={pond2Point(5.6, 1.12)} s={[0.3, 0.24, 0.28]} rot={1.3} seed={41} />
      <Boulder at={pond2Point(0.0, 1.15)} s={[0.22, 0.18, 0.2]} rot={0.4} seed={47} />
    </group>
  );
}

function PondBank() {
  const p = usePalette();
  const lip = useMemo(() => {
    const g = new THREE.ExtrudeGeometry(pondRingShape(1.075, 0.985), { depth: 0.05, bevelEnabled: false, curveSegments: 4 });
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  const inner = useMemo(() => {
    const g = new THREE.ShapeGeometry(pondShape(1.0), 4);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  return (
    <group>
      <mesh geometry={lip} position={[0, -0.03, 0]} receiveShadow castShadow>
        <meshStandardMaterial {...flat(p.bank)} />
      </mesh>
      <mesh geometry={inner} position={[0, 0.004, 0]}>
        <meshStandardMaterial {...flat(p.bankLip)} />
      </mesh>
    </group>
  );
}

function Water() {
  const p = usePalette();
  const layers = useMemo(
    () =>
      [
        [0.995, "waterShallow", 0],
        [0.9, "waterMid", 0.002],
        [0.68, "waterDeep", 0.004],
      ].map(([s, key, lift]) => {
        const g = new THREE.ShapeGeometry(pondShape(s), 6);
        g.rotateX(-Math.PI / 2);
        return { g, key, lift };
      }),
    [],
  );
  const glints = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = seededRand(i * 9.1 + 2) * Math.PI * 2;
        const r = 0.25 + seededRand(i * 4.3 + 1) * 0.6;
        const [x, z] = pondPoint(a, r);
        return { x, z, len: 0.25 + seededRand(i * 2.7) * 0.4, phase: seededRand(i * 7.7) * 6, speed: 0.12 + seededRand(i * 3.3) * 0.12 };
      }),
    [],
  );
  const refs = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((m, i) => {
      if (!m) return;
      const gl = glints[i];
      const life = ((t * gl.speed + gl.phase) % 1 + 1) % 1;
      m.position.set(gl.x + Math.sin(t * 0.3 + i) * 0.15, WATER_Y + 0.008, gl.z + Math.cos(t * 0.25 + i) * 0.08);
      m.material.opacity = Math.sin(life * Math.PI) * 0.35;
      m.scale.set(gl.len * (0.7 + Math.sin(life * Math.PI) * 0.3), 1, 1);
    });
  });
  return (
    <group>
      {layers.map((l) => (
        <mesh key={l.key} geometry={l.g} position={[0, WATER_Y + l.lift, 0]} receiveShadow>
          <meshStandardMaterial {...flat(p[l.key], { roughness: 0.75 })} />
        </mesh>
      ))}
      {glints.map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} rotation={[-Math.PI / 2, 0, 0.12]}>
          <planeGeometry args={[1, 0.035]} />
          <meshBasicMaterial color={p.glint} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function makePadGeometry(radius, notch = 0.5, thickness = 0.035, segments = 14) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  for (let i = 0; i <= segments; i++) {
    const a = notch / 2 + (i / segments) * (Math.PI * 2 - notch);
    shape.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
  }
  shape.lineTo(0, 0);
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 1 });
  g.rotateX(-Math.PI / 2);
  return g;
}

function HomePad({ position = HOME_PAD_POSITION }) {
  const p = usePalette();
  const outer = useMemo(() => makePadGeometry(0.95, 0.55, 0.04, 16), []);
  const inner = useMemo(() => makePadGeometry(0.68, 0.55, 0.012, 14), []);
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.x = Math.sin(t * 0.7) * 0.008;
    ref.current.rotation.z = Math.cos(t * 0.6) * 0.008;
  });
  return (
    <group ref={ref} position={[position[0], WATER_Y + 0.004, position[1]]} rotation={[0, 0.85, 0]}>
      <mesh geometry={outer} castShadow receiveShadow>
        <meshStandardMaterial {...flat(p.pad)} />
      </mesh>
      <mesh geometry={inner} position={[0, 0.04, 0]} receiveShadow>
        <meshStandardMaterial {...flat(p.padInner)} />
      </mesh>
      {[0.9, 1.9, 2.9, 3.9, 4.9, 5.6].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.36, 0.054, -Math.sin(a) * 0.36]} rotation={[-Math.PI / 2, 0, a]}>
          <planeGeometry args={[0.66, 0.03]} />
          <meshStandardMaterial {...flat(p.padVein)} />
        </mesh>
      ))}
    </group>
  );
}

function Lotus({ position, scale = 1, glow = false }) {
  const p = usePalette();
  const night = useNight();
  const petals = useMemo(() => Array.from({ length: 7 }, (_, i) => (i / 7) * Math.PI * 2), []);
  return (
    <group position={position} scale={scale}>
      {petals.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * 0.07, 0.06, Math.sin(a) * 0.07]} rotation={[0, -a, -0.75]} castShadow>
          <coneGeometry args={[0.05, 0.16, 4]} />
          <meshStandardMaterial {...flat(p.lotus[i % 2], { emissive: night && glow ? p.lotus[0] : "#000000", emissiveIntensity: night && glow ? 0.4 : 0 })} />
        </mesh>
      ))}
      <mesh position={[0, 0.07, 0]}>
        <icosahedronGeometry args={[0.045, 0]} />
        <meshStandardMaterial {...flat(p.bloom, { emissive: night ? p.bloom : "#000000", emissiveIntensity: night ? 0.6 : 0 })} />
      </mesh>
    </group>
  );
}

const LILYPADS = [
  { at: [-2.1, -0.4], r: 0.42, rot: 0.6, flower: true },
  { at: [-1.4, -2.4], r: 0.34, rot: 2.1 },
  { at: [1.9, -2.2], r: 0.46, rot: 4.0, flower: true },
  { at: [2.6, -0.5], r: 0.3, rot: 1.2 },
  { at: [-0.6, -3.0], r: 0.28, rot: 5.1 },
  { at: [1.2, -3.2], r: 0.24, rot: 3.3 },
  { at: [-2.7, -1.6], r: 0.26, rot: 0.2 },
  { at: [1.5, 0.95], r: 0.27, rot: 2.6 },
];

function LilyPad({ at, r, rot, flower, index }) {
  const p = usePalette();
  const geo = useMemo(() => makePadGeometry(r, 0.6, 0.02, 12), [r]);
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() + index * 1.7;
    ref.current.position.y = WATER_Y + 0.006 + Math.sin(t * 0.9) * 0.004;
    ref.current.rotation.y = rot + Math.sin(t * 0.3) * 0.08;
  });
  return (
    <group ref={ref} position={[at[0], WATER_Y + 0.006, at[1]]}>
      <mesh geometry={geo} receiveShadow castShadow>
        <meshStandardMaterial {...flat(index % 2 ? p.pad : p.padInner)} />
      </mesh>
      {flower && <Lotus position={[r * 0.15, 0.02, r * 0.1]} scale={0.75 + r * 0.5} glow />}
    </group>
  );
}

function LilyPads() {
  return LILYPADS.map((l, i) => <LilyPad key={i} index={i} {...l} />);
}

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

const BOULDERS = [
  { at: [-3.15, -2.2], s: [0.75, 0.6, 0.65], rot: 0.4, seed: 3 },
  { at: [3.35, -1.7], s: [0.62, 0.52, 0.58], rot: 1.9, seed: 11 },
  { at: [2.35, 1.35], s: [0.36, 0.3, 0.34], rot: 0.9, seed: 27 },
  { at: [-2.85, 1.25], s: [0.3, 0.24, 0.3], rot: 5.2, seed: 31 },
];

function Boulder({ at, s, rot, seed }) {
  const p = usePalette();
  const geo = useMemo(() => {
    const base = jitterGeometry(new THREE.IcosahedronGeometry(1, 1), 0.28, seed);
    const wet = new THREE.Color(p.rockWet);
    return paintFaces(base, (x, y, z, c, f) => {
      c.set(p.rock[f % p.rock.length]);
      if (y < -0.25) c.lerp(wet, 0.65);
    });
  }, [p, seed]);
  return (
    <mesh geometry={geo} position={[at[0], s[1] * 0.42, at[1]]} scale={s} rotation={[0.08, rot, -0.05]} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={1} metalness={0} flatShading />
    </mesh>
  );
}

function Boulders() {
  return BOULDERS.map((b, i) => <Boulder key={i} {...b} />);
}

function PebbleRing() {
  const p = usePalette();
  const items = useMemo(() => {
    const list = [];
    for (let i = 0; i < 34; i++) {
      const a = (i / 34) * Math.PI * 2 + seededRand(i * 2.3) * 0.12;
      const [x, z] = pondPoint(a, 1.05 + seededRand(i * 4.1) * 0.05);
      if (Math.hypot(x - 1.95, z - 1.55) < 0.7) continue;
      list.push({ x, z, s: 0.07 + seededRand(i * 6.7) * 0.07, r: seededRand(i) * 6, c: i % 3 });
    }
    return list;
  }, []);
  return items.map((it, i) => (
    <mesh key={i} position={[it.x, 0.03, it.z]} scale={[it.s * 1.3, it.s * 0.6, it.s]} rotation={[0, it.r, 0]} castShadow receiveShadow>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial {...flat(p.rock[it.c])} />
    </mesh>
  ));
}

function useSway(count, amount = 0.05, speed = 1.2) {
  const refs = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((g, i) => {
      if (!g) return;
      g.rotation.z = Math.sin(t * speed + i * 1.3) * amount;
      g.rotation.x = Math.cos(t * speed * 0.8 + i * 0.7) * amount * 0.5;
    });
  });
  return refs;
}

const CATTAIL_CLUSTERS = [
  { at: [-3.35, 0.15], n: 6 },
  { at: [3.4, 0.0], n: 5 },
  { at: [-2.45, -3.75], n: 5 },
  { at: [2.75, -3.45], n: 5 },
  { at: [-1.25, 1.6], n: 4 },
  { at: [3.0, 3.9], n: 4 },
];

function Cattails() {
  const p = usePalette();
  const stalks = useMemo(() => {
    const list = [];
    CATTAIL_CLUSTERS.forEach((cl, ci) => {
      for (let i = 0; i < cl.n; i++) {
        const a = seededRand(ci * 17 + i * 3.3) * Math.PI * 2;
        const r = seededRand(ci * 11 + i * 5.1) * 0.32;
        list.push({ x: cl.at[0] + Math.cos(a) * r, z: cl.at[1] + Math.sin(a) * r, h: 0.75 + seededRand(ci * 7 + i) * 0.6, lean: (seededRand(ci + i * 9) - 0.5) * 0.25 });
      }
    });
    return list;
  }, []);
  const refs = useSway(stalks.length, 0.045, 1.1);
  return stalks.map((s, i) => (
    <group key={i} position={[s.x, 0, s.z]} rotation={[0, 0, s.lean]}>
      <group ref={(el) => (refs.current[i] = el)}>
        <mesh position={[0, s.h / 2, 0]} castShadow>
          <cylinderGeometry args={[0.014, 0.02, s.h, 5]} />
          <meshStandardMaterial {...flat(p.cattailStalk)} />
        </mesh>
        <mesh position={[0, s.h * 0.86, 0]} castShadow>
          <capsuleGeometry args={[0.045, s.h * 0.2, 2, 6]} />
          <meshStandardMaterial {...flat(p.cattailHead)} />
        </mesh>
        <mesh position={[0, s.h * 1.02, 0]}>
          <cylinderGeometry args={[0.006, 0.008, s.h * 0.12, 4]} />
          <meshStandardMaterial {...flat(p.cattailStalk)} />
        </mesh>
        <mesh position={[0.05, s.h * 0.3, 0]} rotation={[0, 0, -0.35]}>
          <coneGeometry args={[0.025, s.h * 0.55, 3]} />
          <meshStandardMaterial {...flat(p.reed)} />
        </mesh>
      </group>
    </group>
  ));
}

function teardropGeometry(radius, height) {
  const pts = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = t * height;
    const r = radius * Math.sin(Math.PI * Math.pow(t, 0.75)) * (1 - t * 0.35);
    pts.push(new THREE.Vector2(Math.max(0.001, r), y));
  }
  return new THREE.LatheGeometry(pts, 7);
}

const TREES = (() => {
  const list = [];
  const rows = [
    { z: -FOREST_START, step: 1.15, offset: 0, s: 1.0 },
    { z: -FOREST_START - 0.8, step: 1.2, offset: 0.55, s: 1.1 },
    { z: -FOREST_START - 1.6, step: 1.25, offset: 0.1, s: 1.2 },
    { z: -FOREST_START - 2.4, step: 1.35, offset: 0.7, s: 1.3 },
    { z: -FOREST_START - 3.3, step: 1.45, offset: 0.25, s: 1.45 },
    { z: -FOREST_START - 4.3, step: 1.55, offset: 0.85, s: 1.6 },
  ];
  rows.forEach((row, r) => {
    for (let x = -7.6 + row.offset; x <= 7.6; x += row.step) {
      const k = list.length;
      const curve = r < 3 ? Math.pow(Math.abs(x) / 7.4, 2) * 2.2 : 0;
      list.push({
        at: [x + (seededRand(k * 3.7) - 0.5) * 0.3, row.z + curve + (seededRand(k * 5.3) - 0.5) * 0.3],
        kind: (k + r) % 3 === 0 ? "drop" : "puff",
        s: row.s * (0.9 + seededRand(k * 7.1) * 0.25),
        c: k % 3,
      });
    }
  });
  [
    [-4.6, -5.0, 0.85], [-3.3, -5.6, 0.8], [3.6, -5.2, 0.85], [4.9, -4.6, 0.9],
    [-6.2, -2.4, 1.0], [-6.6, -0.9, 0.95], [-5.9, 0.6, 0.95], [6.2, -2.1, 1.0], [6.5, -0.6, 0.95], [6.0, 0.9, 0.95], [-5.6, -3.6, 0.9], [5.7, -3.4, 0.9],
  ].forEach(([x, z, sc], i) => {
    list.push({ at: [x, z], kind: i % 2 ? "drop" : "puff", s: sc, c: i % 3 });
  });
  return list;
})();

function Tree({ at, kind, s, c, index }) {
  const p = usePalette();
  const color = p.leaf[c % p.leaf.length];
  const drop = useMemo(() => teardropGeometry(0.62, 2.1), []);
  const puffs = useMemo(
    () =>
      [
        [0, 1.25, 0, 0.72],
        [0.42, 1.05, 0.12, 0.5],
        [-0.38, 1.0, -0.1, 0.52],
        [0.05, 1.7, -0.05, 0.45],
      ].map(([x, y, z, r], i) => ({ x, y, z, r, geo: jitterGeometry(new THREE.IcosahedronGeometry(r, 0), r * 0.18, index * 13 + i) })),
    [index],
  );
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.z = Math.sin(t * 0.6 + index) * 0.012;
  });
  const y = groundHeight(at[0], at[1]);
  return (
    <group position={[at[0], y, at[1]]} scale={s}>
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.6, 5]} />
        <meshStandardMaterial {...flat(p.trunk)} />
      </mesh>
      <group ref={ref}>
        {kind === "drop" ? (
          <mesh geometry={drop} position={[0, 0.35, 0]} castShadow receiveShadow>
            <meshStandardMaterial {...flat(color)} />
          </mesh>
        ) : (
          puffs.map((pf, i) => (
            <mesh key={i} geometry={pf.geo} position={[pf.x, pf.y, pf.z]} castShadow receiveShadow>
              <meshStandardMaterial {...flat(i % 2 ? color : p.leaf[(c + 1) % p.leaf.length])} />
            </mesh>
          ))
        )}
      </group>
    </group>
  );
}

function Trees() {
  return TREES.map((t, i) => <Tree key={i} index={i} {...t} />);
}

const BUSHES = [
  ...Array.from({ length: 12 }, (_, i) => {
    const x = -6.0 + i * 1.1 + (seededRand(i * 2.9) - 0.5) * 0.3;
    const curve = Math.pow(Math.abs(x) / 7.4, 2) * 1.6;
    return { at: [x, -4.45 + curve], s: 0.38 + seededRand(i * 4.7) * 0.1, berries: i % 3 === 1 };
  }).filter((b) => Math.abs(b.at[0] - POND2.center[0]) > 1.7),
  { at: [-1.6, -6.3], s: 0.4, berries: true },
  { at: [2.6, -6.4], s: 0.42 },
  { at: [-4.3, -1.0], s: 0.45 },
  { at: [4.4, 0.6], s: 0.5, berries: true },
  { at: [-3.4, 2.9], s: 0.42 },
  { at: [3.3, 3.2], s: 0.46 },
  { at: [-1.9, 4.5], s: 0.5, berries: true },
  { at: [2.5, 5.0], s: 0.55 },
  { at: [-3.0, 5.6], s: 0.48 },
];

function Bush({ at, s, berries, index }) {
  const p = usePalette();
  const blobs = useMemo(
    () =>
      [
        [0, 0.45, 0, 0.55],
        [0.42, 0.32, 0.1, 0.4],
        [-0.4, 0.3, 0.05, 0.38],
      ].map(([x, y, z, r], i) => ({ x, y, z, geo: jitterGeometry(new THREE.IcosahedronGeometry(r, 0), r * 0.2, index * 7 + i * 3) })),
    [index],
  );
  const y = groundHeight(at[0], at[1]);
  return (
    <group position={[at[0], y, at[1]]} scale={s}>
      {blobs.map((b, i) => (
        <mesh key={i} geometry={b.geo} position={[b.x, b.y, b.z]} castShadow receiveShadow>
          <meshStandardMaterial {...flat(i === 0 ? p.leaf[1] : p.leaf[(index + i) % p.leaf.length])} />
        </mesh>
      ))}
      {berries &&
        [0, 1, 2, 3, 4].map((i) => (
          <mesh key={`b${i}`} position={[Math.cos(i * 1.3) * 0.45, 0.45 + Math.sin(i * 2.1) * 0.2, 0.42]}>
            <icosahedronGeometry args={[0.06, 0]} />
            <meshStandardMaterial {...flat(p.flowers[2])} />
          </mesh>
        ))}
    </group>
  );
}

function Bushes() {
  return BUSHES.map((b, i) => <Bush key={i} index={i} {...b} />);
}

const DANDELIONS = [
  [-2.2, 2.6], [-2.55, 2.85], [2.75, 2.5], [-4.6, -1.9], [4.7, -2.6], [3.4, 4.6], [-1.4, 4.0], [-1.15, 4.2],
];

function Dandelions() {
  const p = usePalette();
  const refs = useSway(DANDELIONS.length, 0.06, 1.4);
  const seeds = useRef([]);
  const seedData = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ from: DANDELIONS[i % DANDELIONS.length], phase: i / 6, drift: 0.6 + seededRand(i * 3.9) * 0.6 })), []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    seeds.current.forEach((m, i) => {
      if (!m) return;
      const d = seedData[i];
      const life = ((t * 0.08 + d.phase) % 1 + 1) % 1;
      m.position.set(d.from[0] + life * 2.2 * d.drift + Math.sin(t * 1.3 + i) * 0.15, 0.7 + life * 1.8, d.from[1] - life * 1.2);
      m.material.opacity = Math.sin(life * Math.PI) * 0.9;
    });
  });
  return (
    <>
      {DANDELIONS.map(([x, z], i) => (
        <group key={i} position={[x, groundHeight(x, z), z]}>
          <group ref={(el) => (refs.current[i] = el)}>
            <mesh position={[0, 0.24, 0]}>
              <cylinderGeometry args={[0.008, 0.01, 0.48, 4]} />
              <meshStandardMaterial {...flat(p.reed)} />
            </mesh>
            <mesh position={[0, 0.52, 0]} castShadow>
              <icosahedronGeometry args={[0.1, 1]} />
              <meshStandardMaterial {...flat(p.dandelion)} />
            </mesh>
          </group>
        </group>
      ))}
      {seedData.map((_, i) => (
        <mesh key={`s${i}`} ref={(el) => (seeds.current[i] = el)}>
          <icosahedronGeometry args={[0.022, 0]} />
          <meshBasicMaterial color={p.dandelion} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function scatter(count, seed, accept) {
  const out = [];
  let i = 0;
  while (out.length < count && i < count * 20) {
    const x = (seededRand(seed + i * 1.37) - 0.5) * 13;
    const z = (seededRand(seed + i * 2.71) - 0.5) * 14 + 0.2;
    i++;
    if (accept(x, z)) out.push([x, z, seededRand(seed + i * 4.13)]);
  }
  return out;
}

const onLand = (x, z) => pondNorm(x, z) > 1.18 && pond2Norm(x, z) > 1.15 && Math.hypot(x - 0.55, z - 2.9) > 0.55 && Math.hypot(x - 1.35, z - 4.25) > 0.6;

function GrassTufts() {
  const p = usePalette();
  const ref = useRef();
  const spots = useMemo(() => scatter(220, 41, onLand), []);
  const geo = useMemo(() => {
    const blades = [];
    for (let k = 0; k < 3; k++) {
      const b = new THREE.ConeGeometry(0.03, 0.2, 3);
      b.translate(0, 0.1, 0);
      b.rotateZ((k - 1) * 0.35);
      b.rotateY(k * 2.1);
      blades.push(b);
    }
    const merged = new THREE.BufferGeometry();
    const parts = blades.map((b) => b.toNonIndexed());
    const total = parts.reduce((n, b) => n + b.attributes.position.count, 0);
    const pos = new Float32Array(total * 3);
    let o = 0;
    parts.forEach((b) => {
      pos.set(b.attributes.position.array, o);
      o += b.attributes.position.array.length;
    });
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
      ref.current.setColorAt(i, c.set(p.grass[(i * 3) % p.grass.length]).multiplyScalar(0.85));
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

function Wildflowers() {
  const p = usePalette();
  const night = useNight();
  const ref = useRef();
  const spots = useMemo(() => scatter(160, 77, onLand), []);
  useEffect(() => {
    if (!ref.current) return;
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    spots.forEach(([x, z, r], i) => {
      const s = 0.8 + r * 0.6;
      m.compose(new THREE.Vector3(x, groundHeight(x, z) + 0.06 * s, z), new THREE.Quaternion(), new THREE.Vector3(s, s * 0.7, s));
      ref.current.setMatrixAt(i, m);
      ref.current.setColorAt(i, c.set(p.flowers[i % p.flowers.length]));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
  }, [spots, p]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, spots.length]}>
      <icosahedronGeometry args={[0.045, 0]} />
      <meshStandardMaterial roughness={1} metalness={0} flatShading emissive={night ? "#3a3f2a" : "#000000"} />
    </instancedMesh>
  );
}

const STEPPING = [
  { at: [0.75, 3.75], r: 0.32, rot: 0.3 },
  { at: [0.25, 3.0], r: 0.28, rot: 1.1 },
  { at: [0.7, 2.25], r: 0.3, rot: 2.0 },
  { at: [0.95, 1.55], r: 0.24, rot: 0.6 },
];

function SteppingStones() {
  const p = usePalette();
  return STEPPING.map((s, i) => {
    const inWater = pondNorm(s.at[0], s.at[1]) < 1;
    const y = inWater ? WATER_Y + 0.02 : groundHeight(s.at[0], s.at[1]) + 0.02;
    return (
      <mesh key={i} position={[s.at[0], y, s.at[1]]} rotation={[0, s.rot, 0]} scale={[1, 1, 0.82]} castShadow receiveShadow>
        <cylinderGeometry args={[s.r, s.r * 1.08, 0.06, 8]} />
        <meshStandardMaterial {...flat(p.stepping)} />
      </mesh>
    );
  });
}

const MUSHROOMS = [
  { at: [-2.45, 2.15], s: 1.0, c: 0 },
  { at: [-2.25, 2.35], s: 0.7, c: 1 },
  { at: [-2.6, 2.4], s: 0.55, c: 0 },
  { at: [3.05, -2.75], s: 0.8, c: 2 },
  { at: [3.25, -2.6], s: 0.55, c: 1 },
  { at: [-3.6, -3.1], s: 0.7, c: 1 },
  { at: [1.85, 4.15], s: 0.9, c: 0 },
  { at: [2.05, 4.3], s: 0.6, c: 2 },
  { at: [-0.95, 5.1], s: 0.75, c: 1 },
];

function Mushrooms() {
  const p = usePalette();
  const night = useNight();
  return MUSHROOMS.map((m, i) => (
    <group key={i} position={[m.at[0], groundHeight(m.at[0], m.at[1]), m.at[1]]} scale={m.s} rotation={[0, i, (i % 2 ? 1 : -1) * 0.08]}>
      <mesh position={[0, 0.07, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.04, 0.14, 6]} />
        <meshStandardMaterial {...flat(p.mushroomStem)} />
      </mesh>
      <mesh position={[0, 0.15, 0]} castShadow>
        <sphereGeometry args={[0.1, 7, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial {...flat(p.mushroomCap[m.c], { emissive: night ? p.mushroomCap[m.c] : "#000000", emissiveIntensity: night ? 0.45 : 0 })} />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[Math.cos(k * 2.1) * 0.05, 0.22, Math.sin(k * 2.1) * 0.05]}>
          <icosahedronGeometry args={[0.014, 0]} />
          <meshStandardMaterial {...flat("#ffffff")} />
        </mesh>
      ))}
    </group>
  ));
}

function Boardwalk() {
  const p = usePalette();
  const planks = [0, 1, 2, 3, 4];
  return (
    <group position={[2.2, 0.06, 1.55]} rotation={[0, -0.55, 0]}>
      {planks.map((i) => (
        <mesh key={i} position={[0, 0, -i * 0.21]} rotation={[0, (seededRand(i * 3.1) - 0.5) * 0.08, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.62, 0.05, 0.17]} />
          <meshStandardMaterial {...flat(i % 2 ? p.wood : p.woodDark)} />
        </mesh>
      ))}
      {[
        [-0.33, -0.05],
        [0.33, -0.05],
        [-0.33, -0.85],
        [0.33, -0.85],
      ].map(([x, z], i) => (
        <mesh key={`p${i}`} position={[x, 0, z]} castShadow>
          <cylinderGeometry args={[0.04, 0.045, 0.24, 6]} />
          <meshStandardMaterial {...flat(p.woodDark)} />
        </mesh>
      ))}
    </group>
  );
}

function makeSignTexture(night) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = night ? "#6b5440" : "#c99a64";
  ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = night ? "rgba(0,0,0,0.12)" : "rgba(120,80,40,0.18)";
  for (let i = 0; i < 5; i++) ctx.fillRect(0, 22 + i * 52, 512, 6);
  ctx.strokeStyle = night ? "#4f3d2e" : "#8f6640";
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 498, 242);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 92px 'Fredoka', 'Baloo 2', 'Nunito', sans-serif";
  ctx.lineWidth = 12;
  ctx.strokeStyle = night ? "#3c2e22" : "#7a5434";
  ctx.strokeText("Frog Land", 256, 122);
  ctx.fillStyle = night ? "#fff1c9" : "#fff8e8";
  ctx.fillText("Frog Land", 256, 122);
  ctx.fillStyle = night ? "#8fd18a" : "#6fbf4f";
  [[70, 205], [442, 205]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.ellipse(x, y, 22, 11, -0.5, 0, Math.PI * 2);
    ctx.fill();
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function WelcomeSign({ at = [1.35, 4.25] }) {
  const p = usePalette();
  const night = useNight();
  const tex = useMemo(() => makeSignTexture(night), [night]);
  useEffect(() => () => tex.dispose(), [tex]);
  const leaf = useRef();
  useFrame(({ clock }) => {
    if (leaf.current) leaf.current.rotation.z = Math.sin(clock.getElapsedTime() * 1.6) * 0.15 - 0.4;
  });
  const y = groundHeight(at[0], at[1]);
  return (
    <group position={[at[0], y, at[1]]} rotation={[0, -0.28, 0]}>
      {[-0.42, 0.42].map((x, i) => (
        <mesh key={i} position={[x, 0.36, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.055, 0.72, 6]} />
          <meshStandardMaterial {...flat(p.woodDark)} />
        </mesh>
      ))}
      <mesh position={[0, 0.58, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.12, 0.48, 0.07]} />
        <meshStandardMaterial {...flat(p.wood)} />
      </mesh>
      <mesh position={[0, 0.58, 0.037]}>
        <planeGeometry args={[1.08, 0.44]} />
        <meshStandardMaterial map={tex} roughness={1} metalness={0} emissive={night ? "#ffe9b0" : "#000000"} emissiveMap={night ? tex : null} emissiveIntensity={night ? 0.25 : 0} />
      </mesh>
      <group position={[-0.5, 0.84, 0]}>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.01, 0.012, 0.12, 4]} />
          <meshStandardMaterial {...flat(p.reed)} />
        </mesh>
        <group ref={leaf} position={[0, 0.12, 0]}>
          <mesh position={[0.06, 0, 0]} scale={[1, 0.25, 0.6]}>
            <icosahedronGeometry args={[0.07, 0]} />
            <meshStandardMaterial {...flat(p.leaf[1])} />
          </mesh>
        </group>
      </group>
      <Lotus position={[0.62, 0, 0.18]} scale={0.7} glow />
    </group>
  );
}

function PaperBoat({ start = [-1.95, -2.0] }) {
  const p = usePalette();
  const ref = useRef();
  const hull = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.2, 0.06);
    shape.lineTo(0.2, 0.06);
    shape.lineTo(0.13, -0.02);
    shape.lineTo(-0.13, -0.02);
    shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
    g.translate(0, 0, -0.06);
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * 0.08;
    const a = t * Math.PI * 2;
    ref.current.position.set(start[0] + Math.sin(a) * 0.55, WATER_Y + 0.03 + Math.sin(clock.getElapsedTime() * 1.6) * 0.008, start[1] + Math.cos(a) * 0.35);
    ref.current.rotation.set(Math.sin(clock.getElapsedTime() * 1.3) * 0.05, -a + Math.PI / 2, Math.sin(clock.getElapsedTime() * 1.1) * 0.06);
  });
  return (
    <group ref={ref}>
      <mesh geometry={hull} castShadow>
        <meshStandardMaterial {...flat(p.boat)} />
      </mesh>
      <mesh position={[0, 0.13, 0]} castShadow>
        <coneGeometry args={[0.08, 0.16, 3]} />
        <meshStandardMaterial {...flat(p.boatSail)} />
      </mesh>
    </group>
  );
}

function Butterfly({ bounds, speed, height, color }) {
  const group = useRef();
  const left = useRef();
  const right = useRef();
  const { state, step } = useFreeRoam({ bounds, minHeight: height - 0.2, maxHeight: height + 0.4, speed, avoidCenter: 0.8 });
  const prev = useRef(state.pos.clone());
  useFrame(({ clock }, delta) => {
    const pos = step(delta);
    const t = clock.getElapsedTime();
    if (group.current) {
      const dx = pos.x - prev.current.x;
      const dz = pos.z - prev.current.z;
      if (Math.abs(dx) + Math.abs(dz) > 0.0001) group.current.rotation.y = Math.atan2(dx, dz);
      group.current.position.set(pos.x, pos.y + Math.sin(t * 4) * 0.06, pos.z);
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

function Butterflies() {
  return (
    <>
      <Butterfly bounds={4.5} speed={0.55} height={0.9} color="#ffd36b" />
      <Butterfly bounds={5} speed={0.5} height={1.1} color="#ffc2d8" />
    </>
  );
}

function Fireflies() {
  return (
    <>
      <Firefly bounds={4} speed={0.5} height={0.8} />
      <Firefly bounds={3.6} speed={0.55} height={1.0} />
      <Firefly bounds={4.6} speed={0.45} height={0.65} />
      <Firefly bounds={3.2} speed={0.4} height={0.9} />
      <Firefly bounds={5} speed={0.5} height={0.7} />
      <Firefly bounds={2.8} speed={0.6} height={1.1} />
    </>
  );
}

const PAD_TOP = 0.076;

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
      {stars.map((_, i) => (
        <mesh key={i} renderOrder={100} frustumCulled={false}>
          <shapeGeometry args={[shape]} />
          <meshBasicMaterial color={NIGHT.star} transparent opacity={0.8} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
function ExposureSync({ exposure }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMappingExposure = exposure;
  }, [gl, exposure]);
  return null;
}
function makeMatte(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (!m) return;
      if ("roughness" in m) m.roughness = 1;
      if ("metalness" in m) m.metalness = 0;
      if ("clearcoat" in m) m.clearcoat = 0;
      if ("specularIntensity" in m) m.specularIntensity = 0;
      m.needsUpdate = true;
    });
  });
  return root;
}
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
function RippleRing({ position, onDone }) {
  const ref = useRef();
  const startRef = useRef(null);
  const DURATION = 1.8;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (startRef.current === null) startRef.current = clock.getElapsedTime();
    const elapsed = clock.getElapsedTime() - startRef.current;
    if (elapsed > DURATION) {
      onDone();
      return;
    }
    const t = elapsed / DURATION;
    const scale = 0.3 + t * 4.2;
    ref.current.scale.setScalar(scale);
    ref.current.material.opacity = (1 - t) * 0.6;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.025, position[1]]}>
      <ringGeometry args={[0.5, 0.68, 48]} />
      <meshBasicMaterial color="#eaf7f1" transparent opacity={0.6} side={THREE.DoubleSide} />
    </mesh>
  );
}
function RippleManager({ ripples, onRippleDone }) {
  return (
    <>
      {ripples.map((r) => (
        <RippleRing key={r.id} position={r.position} onDone={() => onRippleDone(r.id)} />
      ))}
    </>
  );
}
function useFreeRoam({ bounds = 8, minHeight = 0.6, maxHeight = 1.3, speed = 0.6, avoidCenter = 0 } = {}) {
  const state = useMemo(() => {
    const randPoint = () => {
      let x, z;
      do {
        x = (Math.random() - 0.5) * bounds * 2;
        z = (Math.random() - 0.5) * bounds * 2;
      } while (avoidCenter && Math.hypot(x, z) < avoidCenter);
      return new THREE.Vector3(x, minHeight + Math.random() * (maxHeight - minHeight), z);
    };
    return { pos: randPoint(), target: randPoint() };
  }, [bounds, minHeight, maxHeight, avoidCenter]);

  const step = (delta) => {
    const dir = state.target.clone().sub(state.pos);
    const dist = dir.length();
    if (dist < 0.15) {
      let x, z;
      do {
        x = (Math.random() - 0.5) * bounds * 2;
        z = (Math.random() - 0.5) * bounds * 2;
      } while (avoidCenter && Math.hypot(x, z) < avoidCenter);
      state.target.set(x, minHeight + Math.random() * (maxHeight - minHeight), z);
    } else {
      dir.normalize();
      state.pos.addScaledVector(dir, Math.min(speed * delta, dist));
    }
    return state.pos;
  };

  return { state, step };
}
function Firefly({ bounds, speed, height }) {
  const ref = useRef();
  const { step } = useFreeRoam({ bounds, minHeight: height - 0.2, maxHeight: height + 0.3, speed });
  const bobPhase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }, delta) => {
    const pos = step(delta);
    if (ref.current) {
      ref.current.position.set(pos.x, pos.y + Math.sin(clock.getElapsedTime() * 2 + bobPhase) * 0.08, pos.z);
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.025, 8, 8]} />
      <meshBasicMaterial color={NIGHT.firefly} toneMapped={false} />
      <pointLight color={NIGHT.firefly} intensity={0.3} distance={0.9} />
    </mesh>
  );
}
const DRAGONFLY_PLACEMENTS = [
  { bounds: 5.5, speed: 0.9, height: 1.1, color: "#5ad1c4" },
  { bounds: 4.2, speed: 1.1, height: 1.3, color: "#f2a65a" },
];
function Dragonfly({ bounds, speed, height, color }) {
  const group = useRef();
  const wingRef = useRef();
  const { state, step } = useFreeRoam({ bounds, minHeight: height - 0.2, maxHeight: height + 0.35, speed });
  const prevPos = useRef(state.pos.clone());
  useFrame(({ clock }, delta) => {
    const pos = step(delta);
    if (group.current) {
      const dx = pos.x - prevPos.current.x;
      const dz = pos.z - prevPos.current.z;
      if (Math.abs(dx) > 0.0001 || Math.abs(dz) > 0.0001) {
        const targetYaw = Math.atan2(dx, dz);
        let angleDelta = targetYaw - group.current.rotation.y;
        while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
        while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
        group.current.rotation.y += angleDelta * 0.12;
      }
      group.current.position.set(pos.x, pos.y + Math.sin(clock.getElapsedTime() * 3) * 0.05, pos.z);
      prevPos.current.copy(pos);
    }
    if (wingRef.current) {
      wingRef.current.scale.y = 0.6 + Math.abs(Math.sin(clock.getElapsedTime() * 28)) * 0.6;
    }
  });
  return (
    <group ref={group}>
      <mesh castShadow scale={[1, 1, 4.4]}>
        <sphereGeometry args={[0.028, 8, 6]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.2} />
      </mesh>
      <group ref={wingRef} position={[0, 0.02, 0]}>
        <mesh position={[0.08, 0, 0.03]} rotation={[0, 0.3, 0]}>
          <planeGeometry args={[0.16, 0.05]} />
          <meshStandardMaterial color="#eaffff" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.08, 0, 0.03]} rotation={[0, -0.3, 0]}>
          <planeGeometry args={[0.16, 0.05]} />
          <meshStandardMaterial color="#eaffff" transparent opacity={0.55} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}
function Dragonflies() {
  return (
    <>
      {DRAGONFLY_PLACEMENTS.map((d, i) => (
        <Dragonfly key={i} {...d} />
      ))}
    </>
  );
}
const FROG_BASE_YAW = 0;
function IdleCharacter({ modelPath, homePosition, onRipple, scale = 2.1, inline: InlineAnimation = null, variant, inlineProps }) {
  const group = useRef();
  const frame = useRef();
  const motion = useRef({ hop: 0, glance: 0 });
  const rigged = isFrogModel(modelPath);
  const { camera, gl } = useThree();
  const { scene } = useGLTF(modelPath);
  const object = useMemo(() => makeMatte(scene.clone()), [scene]);
  const measured = useGroundedOffset(object);
  const offset = useMemo(() => {
    if (!rigged) return measured;
    object.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(object);
    if (b.isEmpty()) return measured;
    const s = typeof scale === "number" ? scale : 1;
    return [-s * (b.min.x + b.max.x) / 2, PAD_TOP - s * b.min.y, -s * (b.min.z + b.max.z) / 2];
  }, [rigged, measured, object, scale]);
  const anchorPoints = useMemo(() => {
    const b = new THREE.Box3().setFromObject(object);
    if (b.isEmpty()) return null;
    const s = typeof scale === "number" ? scale : 1;
    const x = homePosition[0] + offset[0] + ((b.min.x + b.max.x) / 2) * s;
    const z = homePosition[1] + offset[2] + ((b.min.z + b.max.z) / 2) * s;
    return {
      top: new THREE.Vector3(x, offset[1] + b.max.y * s + BUBBLE_LIFT, z),
      bottom: new THREE.Vector3(x, offset[1] + b.min.y * s, z),
      topWorld: new THREE.Vector3(),
      bottomWorld: new THREE.Vector3(),
    };
  }, [object, offset, scale, homePosition]);

  const nextHop = useRef(2 + Math.random() * 2);
  const nextGlance = useRef(1 + Math.random() * 2);
  const baseYaw = useRef(FROG_BASE_YAW);
  const glanceOffset = useRef(0);

  useFrame(({ clock }) => {
    if (anchorPoints && frame.current) {
      frame.current.updateWorldMatrix(true, false);
      anchorPoints.topWorld.copy(anchorPoints.top).applyMatrix4(frame.current.matrixWorld);
      anchorPoints.bottomWorld.copy(anchorPoints.bottom).applyMatrix4(frame.current.matrixWorld);
      publishMoodAnchor(camera, gl, anchorPoints.topWorld, anchorPoints.bottomWorld);
    }

    if (!group.current) return;
    const t = clock.getElapsedTime();

    if (t > nextHop.current) {
      nextHop.current = t + 3 + Math.random() * 3.5;
      onRipple?.(homePosition);
    }

    const timeSincePlan = nextHop.current - t;
    const justHopped = timeSincePlan > 2.8 && timeSincePlan < 3.2;
    const hopY = justHopped
      ? Math.abs(Math.sin((3 - timeSincePlan) * 10)) * 0.1
      : Math.sin(t * 1.6) * 0.035;
    motion.current.hop = justHopped ? Math.abs(Math.sin((3 - timeSincePlan) * 10)) : 0;
    const breathSquash = justHopped
      ? 1 + Math.sin((3 - timeSincePlan) * 10) * 0.06
      : 1 + Math.sin(t * 1.1) * 0.015;

    if (t > nextGlance.current) {
      nextGlance.current = t + 2 + Math.random() * 2.5;
      glanceOffset.current = (Math.random() - 0.5) * 0.35;
    }
    const targetYaw = baseYaw.current + glanceOffset.current;
    let angleDelta = targetYaw - group.current.rotation.y;
    while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
    while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
    group.current.rotation.y += angleDelta * 0.04;
    motion.current.glance = glanceOffset.current;
    group.current.position.y = (rigged ? 0 : offset[1]) + hopY;
    group.current.scale.set(1 / Math.sqrt(breathSquash), breathSquash, 1 / Math.sqrt(breathSquash));
  });

  if (InlineAnimation) {
    return (
      <group ref={frame}>
        <InlineAnimation
          {...inlineProps}
          placement={{ homePosition, offset, scale, yaw: FROG_BASE_YAW, lean: INLINE_LEAN }}
          idleModelPath={modelPath}
          variant={variant}
        />
      </group>
    );
  }

  if (rigged) {
    return (
      <group ref={frame}>
        <group ref={group} position={[homePosition[0], 0, homePosition[1]]} rotation={[0, FROG_BASE_YAW, 0]}>
          <group position={[-homePosition[0], 0, -homePosition[1]]}>
            <FrogMood
              modelUrl={modelPath}
              idleModelPath={modelPath}
              placement={{ homePosition, offset, scale, yaw: 0, lean: 0 }}
              Rig={FrogIdleRig}
              rigProps={{ motion }}
            />
          </group>
        </group>
      </group>
    );
  }

  return (
    <group ref={frame}>
      <group ref={group} position={[homePosition[0], 0, homePosition[1]]} rotation={[0, FROG_BASE_YAW, 0]}>
        <primitive
          object={object}
          scale={scale}
          position={[offset[0], 0, offset[2]]}
        />
      </group>
    </group>
  );
}
const FROG_SCALE = 2.75;
function headHit(clientX, clientY) {
  const a = window.__moodAnchor;
  if (!a) return null;
  const height = a.bottom - a.top;
  const halfWidth = height * 0.42;
  const bottom = a.top + height * 0.52;
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
function FrogSlot({ characterModel, onRipple }) {
  const mood = useMoodAnimation();
  const [petting, setPetting] = useState(false);
  const pet = useRef({ until: 0, x: null });
  const canPet = isFrogModel(characterModel);
  const canInline = canPet || mood.mood === "feeding";
  const Mood = mood.active && canInline ? INLINE_MOODS[mood.mood] || null : null;
  const Inline = petting && canPet ? PetFrog : Mood;
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
  usePetTouch(canPet, handlePet, handleRelease);

  if (mood.active && !Inline) return null;
  const pettingNow = petting && canPet;
  return (
    <CharacterErrorBoundary position={HOME_PAD_POSITION}>
      <IdleCharacter
        key={pettingNow ? (moodActive("angry") ? "refuse" : moodActive("crying") ? "comfort" : "pet") : Inline ? `${mood.mood}-${mood.variant || ""}` : "idle"}
        variant={mood.variant}
        modelPath={characterModel}
        homePosition={HOME_PAD_POSITION}
        onRipple={Inline ? undefined : onRipple}
        scale={FROG_SCALE}
        inline={Inline}
        inlineProps={pettingNow ? { pet, onDone: handleDone, refuse: moodActive("angry"), comfort: moodActive("crying") } : undefined}
      />
    </CharacterErrorBoundary>
  );
}
class CharacterErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}
const ISO_DISTANCE = 7.8;
const ISO_ELEVATION = Math.atan(1 / Math.sqrt(2)) + 0.08;
const ISO_YAW = 0;
const VIEW_SHIFT_Z = -2.15;
const VIEW_TARGET = [0, 0.7, VIEW_SHIFT_Z];
const ISO_POSITION = [
  ISO_DISTANCE * Math.cos(ISO_ELEVATION) * Math.sin(ISO_YAW),
  ISO_DISTANCE * Math.sin(ISO_ELEVATION),
  ISO_DISTANCE * Math.cos(ISO_ELEVATION) * Math.cos(ISO_YAW) + VIEW_SHIFT_Z,
];

const FrogHabitat3D = ({ characterModel, showCharacter = true }) => {
  const night = useNightModeSetting();
  const L = night ? LIGHTS.night : LIGHTS.day;
  const [ripples, setRipples] = useState([]);

  useEffect(() => {
    if (isFrogModel(characterModel)) useGLTF.preload(FROG_MODELS.idle);
  }, [characterModel]);

  useEffect(() => {
    window.__habitatInline = { animal: "frog", moods: isFrogModel(characterModel) ? Object.keys(INLINE_MOODS) : ["feeding"] };
    window.dispatchEvent(new CustomEvent("habitat-inline", { detail: window.__habitatInline }));
    return () => {
      window.__habitatInline = null;
      window.__moodAnchor = null;
      window.dispatchEvent(new CustomEvent("habitat-inline", { detail: null }));
    };
  }, [characterModel]);

  const addRipple = (position) => {
    setRipples((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, position }]);
  };
  const removeRipple = (id) => {
    setRipples((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="habitat-canvas-wrap habitat-canvas-wrap--no-touch-scroll">
      <Canvas
        shadows
        dpr={[1, 1.75]}
        orthographic
        camera={{ position: ISO_POSITION, zoom: 74, near: 0.1, far: 200 }}
        gl={{ toneMappingExposure: L.exposure, powerPreference: "high-performance" }}
        style={{ touchAction: "none" }}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = "none";
        }}
      >
        <NightContext.Provider value={night}>
          <ExposureSync exposure={L.exposure} />
          <color attach="background" args={[L.background]} />
          <fog attach="fog" args={[L.background, night ? 40 : 26, night ? 120 : 80]} />

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
            maxPolarAngle={1.05}
            minZoom={74}
            maxZoom={150}
            mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
            touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
          />

          <ambientLight intensity={L.ambient} color={L.ambientColor} />
          <directionalLight
            position={[4, 8, 5]}
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
          <directionalLight position={[-5, 3, -4]} intensity={L.rim} color={L.rimColor} />
          <hemisphereLight args={[L.hemiSky, L.hemiGround, L.hemi]} />
          {night && <GlowStars />}

          <React.Suspense fallback={null}>
            <Ground />
            <PondBank />
            <LittlePond />
            <Water />
            <HomePad />
            <Lotus position={[HOME_PAD_POSITION[0] + 0.72, WATER_Y, HOME_PAD_POSITION[1] + 0.45]} scale={1.1} glow />
            <LilyPads />
            <PaperBoat />
            <Boulders />
            <PebbleRing />
            <Cattails />
            <Trees />
            <Bushes />
            <Dandelions />
            <GrassTufts />
            <Wildflowers />
            <SteppingStones />
            <Mushrooms />
            <Boardwalk />
            <WelcomeSign />
            <RippleManager ripples={ripples} onRippleDone={removeRipple} />
            {night ? <Fireflies /> : (
              <>
                <Dragonflies />
                <Butterflies />
              </>
            )}
            {showCharacter && (
              <CharacterErrorBoundary position={HOME_PAD_POSITION}>
                <React.Suspense fallback={null}>
                  <FrogSlot characterModel={characterModel || FROG_MODELS.idle} onRipple={addRipple} />
                </React.Suspense>
              </CharacterErrorBoundary>
            )}
          </React.Suspense>
        </NightContext.Provider>
      </Canvas>
    </div>
  );
};

export default FrogHabitat3D;