import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import FeedingKoala from "../animations/koala/FeedingKoala";
import AngryKoala from "../animations/koala/AngryKoala";
import CryingKoala from "../animations/koala/CryingKoala";
import HungryKoala from "../animations/koala/HungryKoala";
import SleepyKoala from "../animations/koala/SleepyKoala";
import SleepingKoala from "../animations/koala/SleepingKoala";
import WokeKoala from "../animations/koala/WokeKoala";
import HappyKoala from "../animations/koala/HappyKoala";
import EnergeticKoala from "../animations/koala/EnergeticKoala";
import QuietKoala from "../animations/koala/QuietKoala";
import OtherKoala from "../animations/koala/OtherKoala";
import PlaytimeKoala from "../animations/koala/PlaytimeKoala";
import DiaperKoala from "../animations/koala/DiaperKoala";
import PetKoala from "../animations/koala/PetKoala";
import { KoalaMood, KoalaIdleRig } from "../animations/koala/koalaRig";

const INLINE_MOODS = {
  feeding: FeedingKoala,
  angry: AngryKoala,
  crying: CryingKoala,
  hungry: HungryKoala,
  sleepy: SleepyKoala,
  sleeping: SleepingKoala,
  woke: WokeKoala,
  groggy: WokeKoala,
  happy: HappyKoala,
  energetic: EnergeticKoala,
  quiet: QuietKoala,
  other: OtherKoala,
  playtime: PlaytimeKoala,
  diaper: DiaperKoala,
};
const INLINE_LEAN = 0.1;
const PET_HOLD = 2.2;
const PET_LINGER = 1.2;
const BUBBLE_LIFT = -0.05;

const KOALA_MODEL_PATH = "/models/characters/koala/koala.glb";
const KOALA_HEIGHT = 1.3;
const DECK_Y = 0;
const DECK_RADIUS = 2.15;
const DECK_THICK = 0.12;
const CUSHION_TOP = DECK_Y + 0.13;
const KOALA_POSITION = [0.15, 0.45];
const KOALA_PERCH_Y = CUSHION_TOP;
const TRUNK_AT = [-0.35, -1.25];
const TRUNK_RADIUS = 0.62;
const HUT_AT = [1.15, -0.85];
const DOOR_SCALE = 1.35;

const LIGHTS = {
  day: {
    exposure: 1.05,
    ambient: 0.75, ambientColor: "#ffe9dc",
    sun: 1.75, sunColor: "#ffd6b0",
    rim: 0.65, rimColor: "#c9b8ff",
    hemiSky: "#ffe1d0", hemiGround: "#6f6a9a", hemi: 0.8,
    fog: "#e8cfe0",
  },
  night: {
    exposure: 1.0,
    ambient: 0.45, ambientColor: "#b9b3ea",
    sun: 0.55, sunColor: "#c8c4ff",
    rim: 0.45, rimColor: "#8fa8ff",
    hemiSky: "#6c6aa8", hemiGround: "#1e1c3a", hemi: 0.6,
    fog: "#2b2950",
  },
};

const PALETTE = {
  day: {
    skyTop: "#b3b4ee",
    skyMid: "#f3c2d6",
    skyLow: "#ffd8bc",
    cloud: "#fff4f0",
    cloudShade: "#f1d8e6",
    farCanopy: ["#c9bfe0", "#d6c3dc", "#bfb6dc"],
    canopy: ["#7fb0a6", "#94c2b2", "#6c9d98", "#a9cfbb"],
    canopyShade: "#5a8487",
    trunk: "#b88c6c",
    trunkDark: "#946a52",
    trunkPatch: "#e3b8a0",
    plank: ["#d9a066", "#cf9459", "#e2ad74"],
    plankDark: "#a8703f",
    rail: "#b98149",
    rope: "#e8cfa0",
    hutWall: "#f3dcb8",
    hutTrim: "#c98f5a",
    roof: ["#e8857a", "#f09a8c"],
    door: "#7f9fd0",
    window: "#ffe6a6",
    cushion: "#f2a6b8",
    cushionTrim: "#ffffff",
    lantern: ["#ffb38a", "#ffe08a", "#f7a6c4"],
    bulb: "#fff1b8",
    pot: "#e48f6e",
    plant: "#7fb39a",
    hammock: "#a8c6f0",
    basket: "#c99a5c",
    leafSnack: "#86b8a0",
    flower: ["#ffd0e0", "#fff2a8", "#c8d8ff"],
    leafFall: ["#9cc4b4", "#f0c0a8", "#d8c4ec"],
  },
  night: {
    skyTop: "#1d1b45",
    skyMid: "#3b3470",
    skyLow: "#5f4a86",
    cloud: "#4a4580",
    cloudShade: "#3b3870",
    farCanopy: ["#3a3768", "#433e72", "#35336a"],
    canopy: ["#355a68", "#3f6872", "#2e505e", "#4a7478"],
    canopyShade: "#253f4c",
    trunk: "#6a5260",
    trunkDark: "#523f4e",
    trunkPatch: "#8a6e7a",
    plank: ["#8a6650", "#7f5d48", "#94705a"],
    plankDark: "#5e4436",
    rail: "#73584a",
    rope: "#a89a86",
    hutWall: "#a8988a",
    hutTrim: "#7a5e4c",
    roof: ["#a85a62", "#b5666c"],
    door: "#4f5f90",
    window: "#ffd98a",
    cushion: "#c27a90",
    cushionTrim: "#e6e0f0",
    lantern: ["#ffb38a", "#ffe08a", "#f7a6c4"],
    bulb: "#fff1b8",
    pot: "#9a5e4e",
    plant: "#3f6a62",
    hammock: "#6a80b0",
    basket: "#7f6448",
    leafSnack: "#4a7468",
    flower: ["#ffd0e0", "#fff2a8", "#c8d8ff"],
    leafFall: ["#6a8a8a", "#a88a80", "#9a8ab4"],
  },
};

const STAR_COLOR = "#fff1c9";
const FIREFLY_COLOR = "#ffe9a0";

const usePalette = () => (useNight() ? PALETTE.night : PALETTE.day);

const flat = (color, extra = {}) => ({ color, roughness: 1, metalness: 0, flatShading: true, ...extra });

function Sky() {
  const p = usePalette();
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(60, 24, 16);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const top = new THREE.Color(p.skyTop);
    const mid = new THREE.Color(p.skyMid);
    const low = new THREE.Color(p.skyLow);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const h = pos.getY(i) / 60;
      if (h > -0.42) c.copy(mid).lerp(top, THREE.MathUtils.smoothstep(h, -0.42, -0.05));
      else c.copy(low).lerp(mid, THREE.MathUtils.smoothstep(h, -0.85, -0.42));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, [p]);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} depthWrite={false} />
    </mesh>
  );
}

function puffCluster(seed, count, spread, size) {
  return Array.from({ length: count }, (_, i) => {
    const a = seededRand(seed + i * 3.3) * Math.PI * 2;
    const r = seededRand(seed + i * 5.1) * spread;
    const s = size * (0.6 + seededRand(seed + i * 7.7) * 0.6);
    return {
      x: Math.cos(a) * r,
      y: (seededRand(seed + i * 9.9) - 0.4) * spread * 0.55,
      z: Math.sin(a) * r * 0.6,
      s,
      geo: jitterGeometry(new THREE.IcosahedronGeometry(s, 0), s * 0.22, seed * 13 + i),
      k: i,
    };
  });
}

function Clouds() {
  const p = usePalette();
  const clouds = useMemo(
    () =>
      [
        { at: [-6, 4.2, -7], seed: 3, speed: 0.05 },
        { at: [4, 5.4, -9], seed: 9, speed: 0.04 },
        { at: [8, 2.6, -6], seed: 15, speed: 0.06 },
        { at: [-9, 1.8, -8], seed: 21, speed: 0.045 },
        { at: [1, 3.0, -10], seed: 27, speed: 0.035 },
      ].map((c) => ({ ...c, puffs: puffCluster(c.seed, 6, 1.1, 0.7) })),
    [],
  );
  const refs = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((g, i) => {
      if (!g) return;
      const c = clouds[i];
      g.position.x = ((c.at[0] + t * c.speed * 6 + 14) % 28) - 14;
    });
  });
  return clouds.map((c, i) => (
    <group key={i} ref={(el) => (refs.current[i] = el)} position={c.at}>
      {c.puffs.map((pf) => (
        <mesh key={pf.k} geometry={pf.geo} position={[pf.x, pf.y * 0.5, pf.z]} scale={[1.3, 0.75, 1]}>
          <meshStandardMaterial {...flat(pf.k % 3 ? p.cloud : p.cloudShade, { fog: false })} />
        </mesh>
      ))}
    </group>
  ));
}

function FarCanopy() {
  const p = usePalette();
  const blobs = useMemo(() => {
    const list = [];
    for (let i = 0; i < 18; i++) {
      const x = -13 + i * 1.6 + (seededRand(i * 2.1) - 0.5) * 0.8;
      list.push({ x, y: -1.4 + seededRand(i * 3.7) * 2.2, z: -9.5 - seededRand(i * 5.3) * 3, s: 1.3 + seededRand(i * 7.1) * 1.0, k: i, geo: jitterGeometry(new THREE.IcosahedronGeometry(1, 0), 0.25, i * 17) });
    }
    return list;
  }, []);
  return blobs.map((b) => (
    <mesh key={b.k} geometry={b.geo} position={[b.x, b.y, b.z]} scale={[b.s * 1.2, b.s, b.s]}>
      <meshStandardMaterial {...flat(p.farCanopy[b.k % p.farCanopy.length])} />
    </mesh>
  ));
}

function LeafCloud({ at, seed, count = 7, spread = 0.9, size = 0.55 }) {
  const p = usePalette();
  const puffs = useMemo(() => puffCluster(seed, count, spread, size), [seed, count, spread, size]);
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.5 + seed) * 0.02;
  });
  return (
    <group ref={ref} position={at}>
      {puffs.map((pf) => (
        <mesh key={pf.k} geometry={pf.geo} position={[pf.x, pf.y, pf.z]} castShadow receiveShadow>
          <meshStandardMaterial {...flat(pf.k === 0 ? p.canopyShade : p.canopy[(pf.k + seed) % p.canopy.length])} />
        </mesh>
      ))}
    </group>
  );
}

function GiantTrunk() {
  const p = usePalette();
  const geo = useMemo(() => {
    const h = 16;
    const g = new THREE.CylinderGeometry(TRUNK_RADIUS * 0.82, TRUNK_RADIUS * 1.15, h, 9, 10);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      pos.setX(i, pos.getX(i) + Math.sin(y * 0.35) * 0.12);
      pos.setZ(i, pos.getZ(i) + Math.cos(y * 0.28) * 0.08);
    }
    const geo2 = g.toNonIndexed();
    const pp = geo2.attributes.position;
    const colors = new Float32Array(pp.count * 3);
    const c = new THREE.Color();
    for (let i = 0; i < pp.count; i += 3) {
      const f = i / 3;
      const r = seededRand(f * 1.7 + 3);
      c.set(r > 0.82 ? p.trunkPatch : r > 0.55 ? p.trunkDark : p.trunk);
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
  const branches = [
    { y: 2.6, a: 0.4, len: 2.4, tilt: 0.75 },
    { y: 3.3, a: 2.6, len: 2.1, tilt: 0.7 },
    { y: -1.6, a: 3.7, len: 2.0, tilt: 0.95 },
    { y: -2.3, a: 0.9, len: 2.3, tilt: 1.0 },
  ];
  return (
    <group position={[TRUNK_AT[0], 0, TRUNK_AT[1]]}>
      <mesh geometry={geo} position={[0, 1.5, 0]} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={1} metalness={0} flatShading />
      </mesh>
      {branches.map((b, i) => (
        <group key={i} position={[0, b.y, 0]} rotation={[0, b.a, 0]}>
          <mesh position={[b.len / 2 * Math.sin(b.tilt), b.len / 2 * Math.cos(b.tilt), 0]} rotation={[0, 0, -b.tilt]} castShadow>
            <cylinderGeometry args={[0.09, 0.2, b.len, 6]} />
            <meshStandardMaterial {...flat(p.trunk)} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Canopy() {
  const t = TRUNK_AT;
  return (
    <>
      <LeafCloud at={[t[0] + 1.6, 4.2, t[1] + 0.6]} seed={3} count={9} spread={1.3} size={0.75} />
      <LeafCloud at={[t[0] - 1.8, 4.6, t[1] - 0.4]} seed={7} count={9} spread={1.3} size={0.75} />
      <LeafCloud at={[t[0] + 0.1, 5.6, t[1] - 0.6]} seed={11} count={10} spread={1.6} size={0.85} />
      <LeafCloud at={[t[0] - 3.4, 3.0, t[1] + 0.4]} seed={15} count={7} spread={1.0} size={0.6} />
      <LeafCloud at={[t[0] + 3.6, 3.4, t[1] - 0.3]} seed={19} count={7} spread={1.0} size={0.6} />
      <LeafCloud at={[t[0] - 1.9, -2.2, t[1] + 0.9]} seed={23} count={8} spread={1.2} size={0.7} />
      <LeafCloud at={[t[0] + 2.4, -2.6, t[1] + 1.6]} seed={27} count={8} spread={1.2} size={0.7} />
      <LeafCloud at={[t[0] + 0.4, -3.4, t[1] + 2.9]} seed={31} count={9} spread={1.5} size={0.8} />
      <LeafCloud at={[t[0] - 3.0, -3.0, t[1] + 2.6]} seed={35} count={7} spread={1.1} size={0.7} />
      <LeafCloud at={[t[0] + 3.8, -2.0, t[1] + 3.2]} seed={39} count={6} spread={1.0} size={0.6} />
    </>
  );
}

function Deck() {
  const p = usePalette();
  const planks = useMemo(() => {
    const list = [];
    const width = 0.3;
    for (let i = -7; i <= 7; i++) {
      const x = i * width;
      const half = Math.sqrt(Math.max(0, DECK_RADIUS * DECK_RADIUS - x * x));
      if (half < 0.2) continue;
      list.push({ x, len: half * 2, c: (i + 7) % 3, tilt: (seededRand(i * 3.3) - 0.5) * 0.01 });
    }
    return list;
  }, []);
  const posts = useMemo(() => Array.from({ length: 14 }, (_, i) => (i / 14) * Math.PI * 2).filter((a) => {
    const x = Math.cos(a) * (DECK_RADIUS - 0.08);
    const z = Math.sin(a) * (DECK_RADIUS - 0.08);
    return !(z > 1.2 && Math.abs(x) < 0.9) && !(x < -1.3 && z < 0.5 && z > -1.2);
  }), []);
  const ropeCurve = useMemo(() => {
    const pts = posts.map((a) => new THREE.Vector3(Math.cos(a) * (DECK_RADIUS - 0.08), DECK_Y + 0.5, Math.sin(a) * (DECK_RADIUS - 0.08)));
    return pts;
  }, [posts]);
  return (
    <group>
      <mesh position={[0, DECK_Y - DECK_THICK - 0.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[DECK_RADIUS * 0.98, DECK_RADIUS * 0.9, 0.12, 14]} />
        <meshStandardMaterial {...flat(p.plankDark)} />
      </mesh>
      {planks.map((pl, i) => (
        <mesh key={i} position={[pl.x, DECK_Y - DECK_THICK / 2, 0]} rotation={[pl.tilt, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.28, DECK_THICK, pl.len]} />
          <meshStandardMaterial {...flat(p.plank[pl.c])} />
        </mesh>
      ))}
      {[0.5, 2.1, 3.7, 5.3].map((a, i) => (
        <mesh key={`beam${i}`} position={[Math.cos(a) * 1.1, DECK_Y - 0.9, Math.sin(a) * 1.1 + TRUNK_AT[1] * 0.2]} rotation={[Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6]} castShadow>
          <cylinderGeometry args={[0.06, 0.07, 1.8, 5]} />
          <meshStandardMaterial {...flat(p.rail)} />
        </mesh>
      ))}
      {posts.map((a, i) => (
        <mesh key={`post${i}`} position={[Math.cos(a) * (DECK_RADIUS - 0.08), DECK_Y + 0.26, Math.sin(a) * (DECK_RADIUS - 0.08)]} castShadow>
          <cylinderGeometry args={[0.04, 0.05, 0.56, 6]} />
          <meshStandardMaterial {...flat(p.rail)} />
        </mesh>
      ))}
      {ropeCurve.slice(0, -1).map((a, i) => {
        const b = ropeCurve[i + 1];
        if (a.distanceTo(b) > 1.4) return null;
        const mid = a.clone().add(b).multiplyScalar(0.5);
        mid.y -= 0.06;
        const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
        return (
          <mesh key={`rope${i}`} castShadow>
            <tubeGeometry args={[curve, 8, 0.014, 4, false]} />
            <meshStandardMaterial {...flat(p.rope)} />
          </mesh>
        );
      })}
    </group>
  );
}

function Cushion() {
  const p = usePalette();
  return (
    <group position={[KOALA_POSITION[0], DECK_Y, KOALA_POSITION[1]]}>
      <mesh position={[0, 0.065, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.62, 0.66, 0.13, 12]} />
        <meshStandardMaterial {...flat(p.cushion)} />
      </mesh>
      <mesh position={[0, 0.132, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.44, 0.48, 12]} />
        <meshStandardMaterial {...flat(p.cushionTrim)} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.57 + 0.4) * 0.64, 0.05, Math.sin(i * 1.57 + 0.4) * 0.64]}>
          <icosahedronGeometry args={[0.05, 0]} />
          <meshStandardMaterial {...flat(p.cushionTrim)} />
        </mesh>
      ))}
    </group>
  );
}

function Hut() {
  const p = usePalette();
  const night = useNight();
  const roof = useMemo(() => {
    const g = new THREE.ConeGeometry(0.95, 0.75, 4, 1);
    g.rotateY(Math.PI / 4);
    return g;
  }, []);
  return (
    <group position={[HUT_AT[0], DECK_Y, HUT_AT[1]]} rotation={[0, -0.55, 0]}>
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 0.9, 0.95]} />
        <meshStandardMaterial {...flat(p.hutWall)} />
      </mesh>
      {[-0.52, 0.52].map((x, i) => (
        <mesh key={i} position={[x, 0.45, 0.47]} castShadow>
          <boxGeometry args={[0.07, 0.92, 0.06]} />
          <meshStandardMaterial {...flat(p.hutTrim)} />
        </mesh>
      ))}
      <mesh geometry={roof} position={[0, 1.27, 0]} castShadow>
        <meshStandardMaterial {...flat(p.roof[0])} />
      </mesh>
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[1.24, 0.06, 1.14]} />
        <meshStandardMaterial {...flat(p.roof[1])} />
      </mesh>
      <group position={[-0.18, 0, 0.48]} scale={DOOR_SCALE}>
        <mesh position={[0, 0.32, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.2, 0.2, 0.02, 12, 1, false, -Math.PI / 2, Math.PI]} />
          <meshStandardMaterial {...flat(p.door)} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.4, 0.32, 0.02]} />
          <meshStandardMaterial {...flat(p.door)} />
        </mesh>
        <mesh position={[0.12, 0.2, 0.02]}>
          <sphereGeometry args={[0.025, 8, 6]} />
          <meshStandardMaterial {...flat(p.hutTrim)} />
        </mesh>
      </group>
      <mesh position={[0.28, 0.55, 0.481]}>
        <circleGeometry args={[0.13, 10]} />
        <meshStandardMaterial {...flat(p.window, { emissive: p.window, emissiveIntensity: night ? 1.1 : 0.25 })} />
      </mesh>
      <mesh position={[0.28, 0.55, 0.483]}>
        <ringGeometry args={[0.12, 0.155, 10]} />
        <meshStandardMaterial {...flat(p.hutTrim)} />
      </mesh>
      {night && <pointLight position={[0.28, 0.6, 0.8]} color={p.window} intensity={1.2} distance={2.2} decay={2} />}
      <mesh position={[0.36, 0.06, 0.62]} castShadow>
        <cylinderGeometry args={[0.1, 0.08, 0.14, 7]} />
        <meshStandardMaterial {...flat(p.pot)} />
      </mesh>
      <mesh position={[0.36, 0.22, 0.62]} castShadow>
        <icosahedronGeometry args={[0.14, 0]} />
        <meshStandardMaterial {...flat(p.plant)} />
      </mesh>
    </group>
  );
}

function Hammock() {
  const p = usePalette();
  const ref = useRef();
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(1.2, 0.42, 12, 4);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / 0.6;
      pos.setZ(i, -(1 - x * x) * 0.22);
    }
    g.rotateX(-Math.PI / 2);
    g.computeVertexNormals();
    return g;
  }, []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.9) * 0.08;
  });
  return (
    <group position={[-1.25, DECK_Y + 0.55, 0.15]} rotation={[0, 1.2, 0]}>
      {[-0.68, 0.68].map((x, i) => (
        <mesh key={i} position={[x, -0.27, 0]} castShadow>
          <cylinderGeometry args={[0.035, 0.045, 0.55, 6]} />
          <meshStandardMaterial {...flat(p.rail)} />
        </mesh>
      ))}
      <group ref={ref}>
        <mesh geometry={geo} castShadow receiveShadow>
          <meshStandardMaterial {...flat(p.hammock, { side: THREE.DoubleSide })} />
        </mesh>
      </group>
    </group>
  );
}

function RopeBridge() {
  const p = usePalette();
  const start = new THREE.Vector3(-DECK_RADIUS * 0.88, DECK_Y - 0.02, -0.55);
  const end = new THREE.Vector3(LOOKOUT.at[0] + LOOKOUT.r * 0.7, LOOKOUT.y + 0.02, LOOKOUT.at[1] + LOOKOUT.r * 0.5);
  const slats = useMemo(() => Array.from({ length: 14 }, (_, i) => i / 13), []);
  const dir = end.clone().sub(start);
  const yaw = Math.atan2(-dir.z, dir.x);
  const sagAt = (t) => start.clone().lerp(end, t).add(new THREE.Vector3(0, -Math.sin(t * Math.PI) * 0.35, 0));
  const ropes = useMemo(
    () =>
      [-0.24, 0.24].map((side) => {
        const pts = Array.from({ length: 12 }, (_, i) => {
          const t = i / 11;
          const v = sagAt(t);
          v.add(new THREE.Vector3(Math.sin(yaw) * side, 0.42 - Math.sin(t * Math.PI) * 0.1, Math.cos(yaw) * side));
          return v;
        });
        return new THREE.CatmullRomCurve3(pts);
      }),
    [],
  );
  return (
    <group>
      {slats.map((t, i) => {
        const v = sagAt(t);
        return (
          <mesh key={i} position={v} rotation={[0, yaw, 0]} castShadow>
            <boxGeometry args={[0.16, 0.04, 0.5]} />
            <meshStandardMaterial {...flat(p.plank[i % 3])} />
          </mesh>
        );
      })}
      {ropes.map((c, i) => (
        <mesh key={`r${i}`}>
          <tubeGeometry args={[c, 24, 0.014, 4, false]} />
          <meshStandardMaterial {...flat(p.rope)} />
        </mesh>
      ))}
    </group>
  );
}

const LOOKOUT = { at: [-3.7, -2.6], y: 0.35, r: 0.85 };

function Lookout() {
  const p = usePalette();
  const night = useNight();
  return (
    <group position={[LOOKOUT.at[0], LOOKOUT.y, LOOKOUT.at[1]]}>
      <mesh position={[0, -3.5, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.45, 7, 7]} />
        <meshStandardMaterial {...flat(p.trunk)} />
      </mesh>
      <mesh position={[0, -0.06, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[LOOKOUT.r, LOOKOUT.r * 0.92, 0.12, 10]} />
        <meshStandardMaterial {...flat(p.plank[1])} />
      </mesh>
      {[0.3, 1.5, 2.7, 3.9, 5.1].map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * (LOOKOUT.r - 0.06), 0.22, Math.sin(a) * (LOOKOUT.r - 0.06)]} castShadow>
          <cylinderGeometry args={[0.035, 0.04, 0.44, 5]} />
          <meshStandardMaterial {...flat(p.rail)} />
        </mesh>
      ))}
      <mesh position={[0, 0.95, 0]} castShadow>
        <coneGeometry args={[LOOKOUT.r * 1.05, 0.55, 8]} />
        <meshStandardMaterial {...flat(p.roof[1])} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 5]} />
        <meshStandardMaterial {...flat(p.rail)} />
      </mesh>
      <mesh position={[0.3, 0.45, 0.3]}>
        <icosahedronGeometry args={[0.1, 1]} />
        <meshStandardMaterial color={p.lantern[1]} emissive={p.lantern[1]} emissiveIntensity={night ? 1.2 : 0.35} roughness={1} flatShading toneMapped={false} />
      </mesh>
      {night && <pointLight position={[0.3, 0.45, 0.3]} color={p.lantern[1]} intensity={0.8} distance={2} decay={2} />}
      <LeafCloud at={[-0.6, 1.4, -0.5]} seed={51} count={6} spread={0.8} size={0.5} />
    </group>
  );
}

function RopeLadder() {
  const p = usePalette();
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.8) * 0.04;
  });
  return (
    <group ref={ref} position={[1.2, DECK_Y - 0.05, 1.68]} rotation={[0, -0.6, 0]}>
      {[-0.17, 0.17].map((x, i) => (
        <mesh key={i} position={[x, -0.9, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 1.8, 4]} />
          <meshStandardMaterial {...flat(p.rope)} />
        </mesh>
      ))}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={`rung${i}`} position={[0, -0.18 - i * 0.28, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.02, 0.02, 0.38, 5]} />
          <meshStandardMaterial {...flat(p.plank[i % 3])} />
        </mesh>
      ))}
    </group>
  );
}

function hangPoint(a, b, t, sag) {
  return a.clone().lerp(b, t).add(new THREE.Vector3(0, -Math.sin(t * Math.PI) * sag, 0));
}

function StringLights() {
  const p = usePalette();
  const night = useNight();
  const strands = useMemo(
    () => [
      [new THREE.Vector3(TRUNK_AT[0] + 0.5, DECK_Y + 2.1, TRUNK_AT[1] + 0.4), new THREE.Vector3(HUT_AT[0] - 0.2, DECK_Y + 1.25, HUT_AT[1] + 0.5), 0.35, 9],
      [new THREE.Vector3(TRUNK_AT[0] - 0.4, DECK_Y + 2.0, TRUNK_AT[1] + 0.45), new THREE.Vector3(-1.85, DECK_Y + 0.55, 0.95), 0.3, 9],
    ],
    [],
  );
  const bulbs = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    bulbs.current.forEach((m, i) => {
      if (!m) return;
      m.material.emissiveIntensity = (night ? 1.6 : 0.5) * (0.75 + Math.sin(t * 2 + i * 1.7) * 0.25);
    });
  });
  let k = 0;
  return strands.map(([a, b, sag, n], si) => {
    const curve = new THREE.CatmullRomCurve3(Array.from({ length: 10 }, (_, i) => hangPoint(a, b, i / 9, sag)));
    return (
      <group key={si}>
        <mesh>
          <tubeGeometry args={[curve, 20, 0.008, 3, false]} />
          <meshStandardMaterial {...flat(p.rope)} />
        </mesh>
        {Array.from({ length: n }, (_, i) => {
          const pos = hangPoint(a, b, (i + 0.5) / n, sag);
          const idx = k++;
          return (
            <mesh key={i} ref={(el) => (bulbs.current[idx] = el)} position={[pos.x, pos.y - 0.04, pos.z]}>
              <icosahedronGeometry args={[0.04, 0]} />
              <meshStandardMaterial color={p.lantern[idx % p.lantern.length]} emissive={p.lantern[idx % p.lantern.length]} emissiveIntensity={0.5} roughness={1} flatShading toneMapped={false} />
            </mesh>
          );
        })}
      </group>
    );
  });
}

function PaperLanterns() {
  const p = usePalette();
  const night = useNight();
  const items = [
    { at: [TRUNK_AT[0] + 1.25, DECK_Y + 1.95, TRUNK_AT[1] + 0.55], c: 0, len: 0.35 },
    { at: [TRUNK_AT[0] - 1.05, DECK_Y + 2.1, TRUNK_AT[1] + 0.75], c: 2, len: 0.45 },
  ];
  const refs = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((g, i) => {
      if (g) g.rotation.z = Math.sin(t * 1.1 + i * 2) * 0.08;
    });
  });
  return items.map((l, i) => (
    <group key={i} ref={(el) => (refs.current[i] = el)} position={l.at}>
      <mesh position={[0, -l.len / 2, 0]}>
        <cylinderGeometry args={[0.006, 0.006, l.len, 3]} />
        <meshStandardMaterial {...flat(p.rope)} />
      </mesh>
      <mesh position={[0, -l.len - 0.13, 0]} scale={[1, 1.2, 1]} castShadow>
        <icosahedronGeometry args={[0.13, 1]} />
        <meshStandardMaterial color={p.lantern[l.c]} emissive={p.lantern[l.c]} emissiveIntensity={night ? 1.2 : 0.35} roughness={1} flatShading toneMapped={false} />
      </mesh>
      {night && <pointLight position={[0, -l.len - 0.13, 0]} color={p.lantern[l.c]} intensity={0.8} distance={2.0} decay={2} />}
    </group>
  ));
}

function DeckDecor() {
  const p = usePalette();
  return (
    <group>
      {[
        [-1.45, -0.75, 0.9],
        [1.75, 0.55, 0.8],
        [-0.6, 1.55, 0.7],
      ].map(([x, z, s], i) => (
        <group key={i} position={[x, DECK_Y, z]} scale={s}>
          <mesh position={[0, 0.09, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.09, 0.18, 7]} />
            <meshStandardMaterial {...flat(p.pot)} />
          </mesh>
          {[0, 1, 2].map((k) => (
            <mesh key={k} position={[Math.cos(k * 2.1) * 0.07, 0.26 + k * 0.03, Math.sin(k * 2.1) * 0.07]} castShadow>
              <icosahedronGeometry args={[0.1, 0]} />
              <meshStandardMaterial {...flat(p.plant)} />
            </mesh>
          ))}
          <mesh position={[0.04, 0.4, 0.02]}>
            <icosahedronGeometry args={[0.045, 0]} />
            <meshStandardMaterial {...flat(p.flower[i % p.flower.length])} />
          </mesh>
        </group>
      ))}
      <group position={[0.95, DECK_Y, 1.2]} rotation={[0, 0.4, 0]}>
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.16, 0.2, 8, 1, true]} />
          <meshStandardMaterial {...flat(p.basket, { side: THREE.DoubleSide })} />
        </mesh>
        {[0, 1, 2, 3, 4].map((k) => (
          <mesh key={k} position={[Math.cos(k * 1.3) * 0.08, 0.22 + (k % 2) * 0.04, Math.sin(k * 1.3) * 0.08]} rotation={[0.4, k, 0.6]} scale={[1, 0.3, 0.55]}>
            <icosahedronGeometry args={[0.09, 0]} />
            <meshStandardMaterial {...flat(p.leafSnack)} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function FallingLeaves() {
  const p = usePalette();
  const refs = useRef([]);
  const leaves = useMemo(() => Array.from({ length: 10 }, (_, i) => ({ x: (seededRand(i * 3.1) - 0.5) * 6, z: (seededRand(i * 5.9) - 0.5) * 3, phase: i / 10, speed: 0.05 + seededRand(i * 2.2) * 0.04, c: i % 3 })), []);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((m, i) => {
      if (!m) return;
      const l = leaves[i];
      const life = ((t * l.speed + l.phase) % 1 + 1) % 1;
      m.position.set(l.x + Math.sin(t * 1.4 + i) * 0.35, 4.2 - life * 7, l.z + Math.cos(t * 1.1 + i) * 0.25);
      m.rotation.set(t * 2 + i, t * 1.3, t * 1.7 + i);
    });
  });
  return leaves.map((l, i) => (
    <mesh key={i} ref={(el) => (refs.current[i] = el)}>
      <circleGeometry args={[0.065, 4]} />
      <meshStandardMaterial {...flat(p.leafFall[l.c], { side: THREE.DoubleSide })} />
    </mesh>
  ));
}

function Moon() {
  return (
    <mesh position={[5.5, 9, -14]}>
      <circleGeometry args={[1.1, 20]} />
      <meshBasicMaterial color="#fff3d0" fog={false} toneMapped={false} />
    </mesh>
  );
}

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

function useSway(amount = 0.05, speed = 1.2) {
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

function useNormalizedModel(size) {
  const gltf = useGLTF(KOALA_MODEL_PATH);
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

function Koala({ position = KOALA_POSITION, inline: InlineAnimation = null, inlineProps, variant }) {
  const group = useRef(null);
  const frame = useRef(null);
  const { camera, gl } = useThree();
  const nextGlance = useRef(1 + Math.random() * 2);
  const glance = useRef(0);
  const model = useNormalizedModel(KOALA_HEIGHT);
  const { offset, scale } = model.userData.placement;
  const placementOffset = useMemo(() => [offset[0], offset[1] + KOALA_PERCH_Y, offset[2]], [offset]);

  const anchorPoints = useMemo(() => {
    const { box } = model.userData.placement;
    const x = position[0] + offset[0] + ((box.min.x + box.max.x) / 2) * scale;
    const z = position[1] + offset[2] + ((box.min.z + box.max.z) / 2) * scale;
    return {
      top: new THREE.Vector3(x, KOALA_PERCH_Y + offset[1] + box.max.y * scale + BUBBLE_LIFT, z),
      bottom: new THREE.Vector3(x, KOALA_PERCH_Y + offset[1] + box.min.y * scale, z),
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
    if (t > nextGlance.current) {
      nextGlance.current = t + 3 + Math.random() * 3;
      glance.current = (Math.random() - 0.5) * 0.3;
    }
    group.current.rotation.y += (glance.current - group.current.rotation.y) * 0.03;
  });

  if (InlineAnimation) {
    return (
      <group ref={frame}>
        <InlineAnimation
          {...inlineProps}
          placement={{ homePosition: position, offset: placementOffset, scale, yaw: 0, lean: INLINE_LEAN }}
          idleModelPath={KOALA_MODEL_PATH}
          variant={variant}
        />
      </group>
    );
  }

  return (
    <group ref={frame}>
      <group ref={group} position={[position[0], 0, position[1]]}>
        <group position={[-position[0], 0, -position[1]]}>
          <KoalaMood
            modelUrl={KOALA_MODEL_PATH}
            idleModelPath={KOALA_MODEL_PATH}
            placement={{ homePosition: position, offset: placementOffset, scale, yaw: 0, lean: 0 }}
            Rig={KoalaIdleRig}
          />
        </group>
      </group>
    </group>
  );
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

function KoalaSlot() {
  const mood = useMoodAnimation();
  const [petting, setPetting] = useState(false);
  const pet = useRef({ until: 0, x: null });
  const Mood = mood.active ? INLINE_MOODS[mood.mood] || null : null;
  const Inline = petting ? PetKoala : Mood;
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
    <KoalaErrorBoundary>
      <Suspense fallback={null}>
        <Koala
          key={petting ? (moodActive("angry") ? "refuse" : moodActive("crying") ? "comfort" : "pet") : Inline ? `${mood.mood}-${mood.variant || ""}` : "idle"}
          variant={mood.variant}
          inline={Inline}
          inlineProps={petting ? { pet, onDone: handleDone, refuse: moodActive("angry"), comfort: moodActive("crying") } : undefined}
        />
      </Suspense>
    </KoalaErrorBoundary>
  );
}

class KoalaErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("Koala model failed to load:", error);
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

const CAM_ELEVATION = 0.5;
const CAM_YAW = 0.32;
const CAM_DISTANCE = 9;
const VIEW_TARGET = [0.15, 2.0, 0.2];
const CAM_POSITION = [
  VIEW_TARGET[0] + CAM_DISTANCE * Math.cos(CAM_ELEVATION) * Math.sin(CAM_YAW),
  VIEW_TARGET[1] + CAM_DISTANCE * Math.sin(CAM_ELEVATION),
  VIEW_TARGET[2] + CAM_DISTANCE * Math.cos(CAM_ELEVATION) * Math.cos(CAM_YAW),
];

const KoalaHabitat3D = ({ showCharacter = true }) => {
  const night = useNightModeSetting();
  const L = night ? LIGHTS.night : LIGHTS.day;

  useEffect(() => {
    useGLTF.preload(KOALA_MODEL_PATH);
  }, []);

  useEffect(() => {
    window.__habitatInline = { animal: "koala", moods: Object.keys(INLINE_MOODS) };
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
          <color attach="background" args={[L.fog]} />
          <fog attach="fog" args={[L.fog, 14, 34]} />

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
            minPolarAngle={0.75}
            maxPolarAngle={1.3}
            minZoom={74}
            maxZoom={150}
            mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
            touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_PAN }}
          />

          <ambientLight intensity={L.ambient} color={L.ambientColor} />
          <directionalLight
            position={[5, 9, 4]}
            intensity={L.sun}
            color={L.sunColor}
            castShadow
            shadow-bias={-0.0005}
            shadow-normalBias={0.02}
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-6}
            shadow-camera-right={6}
            shadow-camera-top={7}
            shadow-camera-bottom={-5}
          />
          <directionalLight position={[-6, 3, -3]} intensity={L.rim} color={L.rimColor} />
          <hemisphereLight args={[L.hemiSky, L.hemiGround, L.hemi]} />

          <Sky />
          {night && <GlowStars />}
          {night && <Moon />}

          <Suspense fallback={null}>
            <Clouds />
            <FarCanopy />
            <GiantTrunk />
            <Canopy />
            <Deck />
            <Cushion />
            <Hut />
            <Hammock />
            <RopeBridge />
            <Lookout />
            <RopeLadder />
            <StringLights />
            <PaperLanterns />
            <DeckDecor />
            {night ? (
              <Fireflies />
            ) : (
              <>
                <FallingLeaves />
                <Butterfly bounds={3.4} speed={0.45} height={1.3} color="#ffd36b" />
                <Butterfly bounds={3.8} speed={0.4} height={1.6} color="#c8d8ff" />
              </>
            )}
          </Suspense>
          {showCharacter && <KoalaSlot />}
        </NightContext.Provider>
      </Canvas>
    </div>
  );
};

export default KoalaHabitat3D;