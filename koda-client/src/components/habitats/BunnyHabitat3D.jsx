import React, { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import "../../styling/components/habitats.css";
import { DEFAULT_MODEL } from "../../constants/avatars";
import { useGroundedOffset, seededRand, drawWrapped } from "./habitatUtils";
import FeedingBunny from "../animations/bunny/FeedingBunny";
import AngryBunny from "../animations/bunny/AngryBunny";
import CryingBunny from "../animations/bunny/CryingBunny";
import HungryBunny from "../animations/bunny/HungryBunny";
import SleepyBunny from "../animations/bunny/SleepyBunny";
import SleepingBunny from "../animations/bunny/SleepingBunny";
import WokeBunny from "../animations/bunny/WokeBunny";
import HappyBunny from "../animations/bunny/HappyBunny";
import EnergeticBunny from "../animations/bunny/EnergeticBunny";
import QuietBunny from "../animations/bunny/QuietBunny";
import OtherBunny from "../animations/bunny/OtherBunny";
import PlaytimeBunny from "../animations/bunny/PlaytimeBunny";
import DiaperBunny from "../animations/bunny/DiaperBunny";
import PetBunny from "../animations/bunny/PetBunny";
import { BunnyMood, BunnyPrincessIdleRig } from "../animations/bunny/bunnyRig";

const INLINE_MOODS = {
  feeding: FeedingBunny,
  angry: AngryBunny,
  crying: CryingBunny,
  hungry: HungryBunny,
  sleepy: SleepyBunny,
  sleeping: SleepingBunny,
  woke: WokeBunny,
  groggy: WokeBunny,
  happy: HappyBunny,
  energetic: EnergeticBunny,
  quiet: QuietBunny,
  other: OtherBunny,
  playtime: PlaytimeBunny,
  diaper: DiaperBunny,
};
const BUNNY_MOOD_MODELS = ["/models/characters/bunny/bunny.glb", "/models/habitats/carrot.glb"];
const INLINE_LEAN = 0.22;
const PET_HOLD = 2.2;
const PET_LINGER = 1.2;

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
    background: "#fbdde8", exposure: 1.1,
    ambient: 0.82, ambientColor: "#fff2f6",
    sun: 1.8, sunColor: "#fff1ec",
    rim: 0.45, rimColor: "#ffc6dc",
    hemiSky: "#ffe8f1", hemiGround: "#a9d4a4", hemi: 1.0,
  },
  night: {
    background: "#5b4a7c", exposure: 1.0,
    ambient: 0.66, ambientColor: "#ecd8f4",
    sun: 0.8, sunColor: "#f0deff",
    rim: 0.6, rimColor: "#ffbcd8",
    hemiSky: "#d6bce8", hemiGround: "#4f5a6a", hemi: 0.8,
  },
};
const NIGHT = {
  tuft: ["#6d9a86", "#7caa92"],
  fence: "#e6e2f2",
  fenceCap: "#ddd8ec",
  firefly: "#ffe9a0",
  star: "#fff1c9",
  wish: "#fff6d8",
};

const DUSK = new THREE.Color("#7d6d9c");
const soften = (hex, night) => (night ? `#${new THREE.Color(hex).lerp(DUSK, 0.32).getHexString()}` : hex);

const PICKET_COLORS = ["#ffc9da", "#fff0b3", "#c9f0d6", "#c6e4f7", "#e4d2fa"];
const EGG_SETS = [
  ["#ffd1df", "#ffffff", "#ff9fbf"],
  ["#fff1a8", "#ffb3c8", "#9fd8f0"],
  ["#c8f0d8", "#ffffff", "#ffb3c8"],
  ["#cfe6fb", "#fff1a8", "#ff9fbf"],
  ["#e4d4fb", "#ffffff", "#ffd1df"],
];

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

const _anchorV = new THREE.Vector3();
function publishMoodAnchor(camera, gl, box) {
  const rect = gl.domElement.getBoundingClientRect();
  const toScreen = (y) => {
    _anchorV.set((box.min.x + box.max.x) / 2, y, (box.min.z + box.max.z) / 2).project(camera);
    return [rect.left + ((_anchorV.x + 1) / 2) * rect.width, rect.top + ((1 - _anchorV.y) / 2) * rect.height];
  };
  const [x, top] = toScreen(box.max.y);
  const [, bottom] = toScreen(box.min.y);
  const prev = window.__moodAnchor;
  if (prev && Math.abs(prev.x - x) < 0.5 && Math.abs(prev.top - top) < 0.5 && Math.abs(prev.bottom - bottom) < 0.5) return;
  window.__moodAnchor = { x, top, bottom };
  window.dispatchEvent(new CustomEvent("mood-anchor", { detail: window.__moodAnchor }));
}


let spotTexture = null;
function getSpotTexture() {
  if (!spotTexture) {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    spotTexture = new THREE.CanvasTexture(c);
  }
  return spotTexture;
}

function BunnySpot({ box }) {
  const night = useNight();
  const tex = getSpotTexture();
  const x = (box.min.x + box.max.x) / 2;
  const z = (box.min.z + box.max.z) / 2;
  const width = box.max.x - box.min.x;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.022, z]}>
      <planeGeometry args={[width * 0.95, width * 0.75]} />
      <meshBasicMaterial map={tex} color={night ? "#5e4e80" : "#c48aa6"} transparent opacity={night ? 0.3 : 0.26} depthWrite={false} />
    </mesh>
  );
}

function ContactShadow({ position = [0, 0], radius = 0.4, opacity = 0.18 }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.018, position[1]]}>
      <circleGeometry args={[radius, 24]} />
      <meshBasicMaterial color="#d49ab0" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

const MEADOW_TEX_SIZE = 256;
function buildMeadowTexture(night = false) {
  const SIZE = MEADOW_TEX_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");

  const H = night ? 30 : 0;
  const S = night ? 0.5 : 1;
  const L = night ? 0.66 : 1;
  ctx.fillStyle = night ? "hsl(140, 22%, 42%)" : "hsl(112, 44%, 74%)";
  ctx.fillRect(0, 0, SIZE, SIZE);

  for (let i = 0; i < 90; i++) {
    const seed = i * 53 + 7;
    const bx = seededRand(seed * 1.3) * SIZE;
    const by = seededRand(seed * 2.9) * SIZE;
    const r = 22 + (seed % 26);
    const hue = 100 + (seed % 14) + H;
    const light = (66 + (seed % 10)) * L;
    drawWrapped(ctx, bx, by, SIZE, r, (cx, cy) => {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `hsla(${hue}, ${52 * S}%, ${light}%, 0.45)`);
      grad.addColorStop(1, `hsla(${hue}, ${52 * S}%, ${light}%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  for (let i = 0; i < 320; i++) {
    const seed = i * 91 + 13;
    const bx = seededRand(seed * 1.7) * SIZE;
    const by = seededRand(seed * 3.1) * SIZE;
    const hue = 104 + (seed % 10) + H;
    const a = seededRand(seed) * Math.PI;
    ctx.fillStyle = `hsla(${hue + 6}, ${48 * S}%, ${80 * L}%, 0.55)`;
    drawWrapped(ctx, bx, by, SIZE, 4, (cx, cy) => {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.2, 3.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  for (let i = 0; i < 24; i++) {
    const seed = i * 97 + 11;
    const bx = seededRand(seed * 2.3) * SIZE;
    const by = seededRand(seed * 4.7) * SIZE;
    drawWrapped(ctx, bx, by, SIZE, 6, (cx, cy) => {
      ctx.fillStyle = night ? "hsl(140, 20%, 34%)" : "hsl(112, 34%, 58%)";
      for (let l = 0; l < 3; l++) {
        const a = (l / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(cx + Math.cos(a) * 2.4, cy + Math.sin(a) * 2.4, 2.0, 1.4, a, 0, Math.PI * 2);
        ctx.fill();
      }
      if (seed % 2 === 0) {
        ctx.fillStyle = "rgba(255,175,205,0.92)";
        ctx.beginPath();
        ctx.arc(cx, cy - 3, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  for (let i = 0; i < 28; i++) {
    const seed = i * 71 + 5;
    const bx = seededRand(seed * 3.7) * SIZE;
    const by = seededRand(seed * 5.9) * SIZE;
    const petal = seed % 3 === 0 ? "rgba(216,196,255,0.85)" : "rgba(255,205,225,0.85)";
    drawWrapped(ctx, bx, by, SIZE, 4, (dx, dy) => {
      ctx.fillStyle = petal;
      for (let q = 0; q < 5; q++) {
        const a = (q / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(dx + Math.cos(a) * 1.6, dy + Math.sin(a) * 1.6, 1, 0.7, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffcf5c";
      ctx.beginPath();
      ctx.arc(dx, dy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Ground({ size = 100 }) {
  const night = useNight();
  const tex = useMemo(() => buildMeadowTexture(night), [night]);
  const repeats = size / 2.75;
  useEffect(() => {
    tex.repeat.set(repeats, repeats);
    return () => tex.dispose();
  }, [tex, repeats]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial key={night ? "n" : "d"} map={tex} roughness={1} />
    </mesh>
  );
}

const DIRT_PALETTE = {
  day: { edge: [250, 214, 224], mid: [252, 224, 232], core: [255, 236, 241], dark: [232, 166, 190], light: [255, 248, 250] },
  night: { edge: [132, 112, 148], mid: [140, 120, 156], core: [150, 130, 166], dark: [104, 86, 124], light: [196, 176, 212] },
};
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function buildDirtTexture(night = false) {
  const P = night ? DIRT_PALETTE.night : DIRT_PALETTE.day;
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 512);

  const C = 256;

  const blobs = 26;
  for (let i = 0; i < blobs; i++) {
    const a = (i / blobs) * Math.PI * 2;
    const r = 150 + seededRand(i * 4.3) * 46;
    const cx = C + Math.cos(a) * r * 0.66;
    const cy = C + Math.sin(a) * r * 0.66;
    const rad = 96 + seededRand(i * 9.1) * 48;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, rgba(P.mid, 0.92));
    g.addColorStop(0.6, rgba(P.edge, 0.78));
    g.addColorStop(1, rgba(P.edge, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const core = ctx.createRadialGradient(C, C, 0, C, C, 250);
  core.addColorStop(0, rgba(P.core, 1));
  core.addColorStop(0.62, rgba(P.mid, 1));
  core.addColorStop(0.86, rgba(P.edge, 0.76));
  core.addColorStop(1, rgba(P.edge, 0));
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = rgba(P.dark, 0.1);
  for (let i = 0; i < 70; i++) {
    const a = seededRand(i * 1.7) * Math.PI * 2;
    const r = seededRand(i * 3.9) * 200;
    ctx.beginPath();
    ctx.ellipse(C + Math.cos(a) * r, C + Math.sin(a) * r, 6 + seededRand(i * 2.7) * 4, 3.5, a, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = rgba(P.light, 0.5);
  for (let i = 0; i < 90; i++) {
    const a = seededRand(i * 5.1) * Math.PI * 2;
    const r = seededRand(i * 2.3) * 195;
    ctx.beginPath();
    ctx.arc(C + Math.cos(a) * r, C + Math.sin(a) * r, 1.6 + seededRand(i * 7.3) * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = rgba(P.dark, 0.1);

  for (let i = 0; i < 22; i++) {
    const a = seededRand(i * 6.7) * Math.PI * 2;
    const r = 40 + seededRand(i * 3.1) * 150;
    const px = C + Math.cos(a) * r;
    const py = C + Math.sin(a) * r;
    const rot = seededRand(i * 8.9) * Math.PI * 2;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);

    ctx.beginPath();
    ctx.ellipse(0, 3, 4.2, 5.6, 0, 0, Math.PI * 2);
    ctx.fill();

    for (let t = -1; t <= 1; t++) {
      ctx.beginPath();
      ctx.ellipse(t * 3.6, -4.2, 1.5, 2, t * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  const vig = ctx.createRadialGradient(C, C, 196, C, C, 256);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, 512, 512);
  ctx.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildDirtAlpha() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 512, 512);
  const C = 256;

  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r = 150 + seededRand(i * 4.3) * 46;
    const cx = C + Math.cos(a) * r * 0.66;
    const cy = C + Math.sin(a) * r * 0.66;
    const rad = 96 + seededRand(i * 9.1) * 48;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.6, "rgba(255,255,255,0.85)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const core = ctx.createRadialGradient(C, C, 0, C, C, 250);
  core.addColorStop(0, "rgba(255,255,255,1)");
  core.addColorStop(0.7, "rgba(255,255,255,1)");
  core.addColorStop(0.88, "rgba(255,255,255,0.8)");
  core.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, 512, 512);

  const vig = ctx.createRadialGradient(C, C, 190, C, C, 256);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,1)");
  ctx.globalCompositeOperation = "destination-out";
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, 512, 512);
  ctx.globalCompositeOperation = "source-over";

  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

const PEN_WIDTH = 7.2;
const PEN_DEPTH = 6.2;

function DirtPen() {
  const night = useNight();
  const tex = useMemo(() => buildDirtTexture(night), [night]);
  const mask = useMemo(() => buildDirtAlpha(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
      <planeGeometry args={[PEN_WIDTH + 1.6, PEN_DEPTH + 2.6]} />
      <meshStandardMaterial
        map={tex}
        alphaMap={mask}
        color="#ffffff"
        transparent
        roughness={0.95}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-1}
      />
    </mesh>
  );
}

const TUFT_RING = Array.from({ length: 54 }).map((_, i) => {
  const t = i / 54;
  const edge = Math.floor(t * 4);
  const u = (t * 4) % 1;
  const hw = 7.2 / 2 - 0.12;
  const hd = 6.2 / 2 - 0.12;
  const jitter = (seededRand(i * 3.1) - 0.5) * 0.18;
  let x = 0;
  let z = 0;
  if (edge === 0) { x = -hw + u * hw * 2; z = -hd + jitter; }
  else if (edge === 1) { x = hw + jitter; z = -hd + u * hd * 2; }
  else if (edge === 2) { x = hw - u * hw * 2; z = hd + jitter; }
  else { x = -hw + jitter; z = hd - u * hd * 2; }
  return { x, z, s: 0.7 + seededRand(i * 7.7) * 0.7, r: seededRand(i * 5.3) * Math.PI };
});

function GrassTufts() {
  const night = useNight();
  return (
    <>
      {TUFT_RING.map((t, i) => (
        <group key={i} position={[t.x, 0, t.z]} rotation={[0, t.r, 0]} scale={t.s}>
          {[0, 1, 2].map((b) => {
            const a = (b / 3) * Math.PI * 2 + t.r;
            return (
              <mesh key={b} position={[Math.cos(a) * 0.04, 0.07, Math.sin(a) * 0.04]} rotation={[0.22 * Math.cos(a), a, 0.22 * Math.sin(a)]}>
                <coneGeometry args={[0.022, 0.16, 4]} />
                <meshStandardMaterial color={night ? NIGHT.tuft[b % 2] : b % 2 === 0 ? "#9fd49a" : "#b6e2a8"} roughness={0.9} />
              </mesh>
            );
          })}
        </group>
      ))}
    </>
  );
}

function generateFencePerimeter(width, depth, spacing, gate) {
  const posts = [];
  const halfW = width / 2;
  const halfD = depth / 2;

  const addEdge = (x1, z1, x2, z2, angle) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.round(len / spacing));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + dx * t;
      const z = z1 + dz * t;
      if (gate && Math.abs(x - gate.x) < gate.width / 2 && Math.abs(z - gate.z) < gate.width / 2) {
        continue;
      }
      posts.push({ x, z, angle });
    }
  };

  addEdge(-halfW, -halfD, halfW, -halfD, 0);
  addEdge(-halfW, halfD, halfW, halfD, 0);
  addEdge(-halfW, -halfD, -halfW, halfD, Math.PI / 2);
  addEdge(halfW, -halfD, halfW, halfD, Math.PI / 2);

  return posts;
}

const FENCE_GATE = { x: 0, z: PEN_DEPTH / 2, width: 1.4 };
const FENCE_POSTS = generateFencePerimeter(PEN_WIDTH, PEN_DEPTH, 0.42, FENCE_GATE);

function FencePost({ x, z, angle, index = 0 }) {
  const night = useNight();
  const color = soften(PICKET_COLORS[index % PICKET_COLORS.length], night);
  return (
    <group position={[x, 0, z]} rotation={[0, angle, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.17, 0.6, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.6, 0]} scale={[1, 1, 0.3]} castShadow>
        <sphereGeometry args={[0.085, 18, 12]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    </group>
  );
}

function Fence() {
  const night = useNight();
  const rail = soften("#ffdbe6", night);
  const halfW = PEN_WIDTH / 2;
  const halfD = PEN_DEPTH / 2;
  const railY = [0.18, 0.42];
  const gateHalf = FENCE_GATE.width / 2;
  const frontSeg = halfW - gateHalf;
  const frontCenter = (halfW + gateHalf) / 2;
  return (
    <>
      {FENCE_POSTS.map((p, i) => (
        <FencePost key={i} index={i} x={p.x} z={p.z} angle={p.angle} />
      ))}
      {railY.map((y, i) => (
        <React.Fragment key={i}>
          <mesh position={[0, y, -halfD]} castShadow>
            <boxGeometry args={[PEN_WIDTH, 0.05, 0.03]} />
            <meshStandardMaterial color={rail} roughness={0.85} />
          </mesh>
          <mesh position={[-frontCenter, y, halfD]} castShadow>
            <boxGeometry args={[frontSeg, 0.05, 0.03]} />
            <meshStandardMaterial color={rail} roughness={0.85} />
          </mesh>
          <mesh position={[frontCenter, y, halfD]} castShadow>
            <boxGeometry args={[frontSeg, 0.05, 0.03]} />
            <meshStandardMaterial color={rail} roughness={0.85} />
          </mesh>
          <mesh position={[-halfW, y, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[PEN_DEPTH, 0.05, 0.03]} />
            <meshStandardMaterial color={rail} roughness={0.85} />
          </mesh>
          <mesh position={[halfW, y, 0]} rotation={[0, Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[PEN_DEPTH, 0.05, 0.03]} />
            <meshStandardMaterial color={rail} roughness={0.85} />
          </mesh>
        </React.Fragment>
      ))}
      {[-gateHalf, gateHalf].map((x, i) => (
        <group key={`gp-${i}`} position={[x, 0, halfD]}>
          <mesh position={[0, 0.38, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.13, 0.76, 0.13]} />
            <meshStandardMaterial color={soften("#fff6f0", night)} roughness={0.85} />
          </mesh>
          <group position={[0, 0.87, 0]} rotation={[0, i ? -0.6 : 0.6, i ? -0.15 : 0.15]}>
            <EasterEgg size={0.085} set={i ? 3 : 0} />
          </group>
        </group>
      ))}
    </>
  );
}

const ENTRANCE_STONES = [
  { x: -0.1, z: 3.6, s: 0.3 },
  { x: 0.22, z: 4.05, s: 0.26 },
  { x: -0.16, z: 4.5, s: 0.28 },
];

function Entrance() {
  const halfD = PEN_DEPTH / 2;
  return (
    <group>
      {ENTRANCE_STONES.map((s, i) => (
        <mesh key={i} position={[s.x, 0.02, s.z]} rotation={[-Math.PI / 2, 0, i]} receiveShadow>
          <circleGeometry args={[s.s, 10]} />
          <meshStandardMaterial color="#fbe4ec" roughness={0.95} />
        </mesh>
      ))}

      {[-1.0, 1.0].map((x, i) => (
        <group key={`pot-${i}`} position={[x, 0, halfD + 0.18]}>
          <mesh position={[0, 0.11, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.15, 0.11, 0.22, 14]} />
            <meshStandardMaterial color="#f7bccd" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.23, 0]}>
            <cylinderGeometry args={[0.155, 0.155, 0.04, 14]} />
            <meshStandardMaterial color="#efa6bc" roughness={0.85} />
          </mesh>
          {[0, 1, 2, 3].map((f) => {
            const a = (f / 4) * Math.PI * 2 + i;
            return (
              <group key={f} position={[Math.cos(a) * 0.07, 0.3, Math.sin(a) * 0.07]}>
                <mesh position={[0, -0.03, 0]}>
                  <cylinderGeometry args={[0.008, 0.008, 0.1, 5]} />
                  <meshStandardMaterial color="#7ea24c" />
                </mesh>
                <mesh>
                  <sphereGeometry args={[0.05, 10, 10]} />
                  <meshStandardMaterial color={f % 2 === 0 ? "#ffb1d3" : "#fff0a6"} roughness={0.7} />
                </mesh>
              </group>
            );
          })}
        </group>
      ))}

      <group position={[0.75, 0, halfD + 0.55]} rotation={[0, -0.4, 0]}>
        <mesh position={[0, 0.12, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.42, 0.24, 0.32]} />
          <meshStandardMaterial color="#d9b184" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.12, 0.163]}>
          <boxGeometry args={[0.44, 0.06, 0.01]} />
          <meshStandardMaterial color="#bb8f63" roughness={0.9} />
        </mesh>
        {[-0.1, 0.05, 0.15].map((cx, i) => (
          <group key={i} position={[cx, 0.27, (i - 1) * 0.07]} rotation={[0.2 * i, i, 0.35]}>
            <mesh rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.045, 0.22, 8]} />
              <meshStandardMaterial color="#f08c3c" roughness={0.65} />
            </mesh>
            <mesh position={[0, 0.14, 0]}>
              <coneGeometry args={[0.05, 0.12, 5]} />
              <meshStandardMaterial color="#79a844" roughness={0.8} />
            </mesh>
          </group>
        ))}
      </group>

      <EggBasket position={[-0.8, halfD + 0.62]} rotation={0.4} />

      {[-0.45, 0.45].map((x, i) => (
        <group key={`t-${i}`} position={[x, 0, halfD + 0.06]}>
          {[0, 1, 2].map((b) => (
            <mesh key={b} position={[(b - 1) * 0.05, 0.09, 0]} rotation={[0, 0, (b - 1) * 0.3]}>
              <coneGeometry args={[0.025, 0.2, 4]} />
              <meshStandardMaterial color={b % 2 ? "#9dbd57" : "#87ab48"} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

const BUNTING_COLORS = ["#ffb6d9", "#fff3b0", "#bfe6f2", "#c9b8ff", "#c8f2b0"];

function BuntingFlag({ x, y, z, color, phase }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 1.5 + phase) * 0.08;
  });
  return (
    <group ref={ref} position={[x, y, z]}>
      <mesh rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.06, 0.1, 3]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
    </group>
  );
}

function Bunting() {
  const halfW = PEN_WIDTH / 2;
  const z = -PEN_DEPTH / 2;
  const y = 0.34;
  const count = 9;
  const flags = Array.from({ length: count }).map((_, i) => ({
    x: -halfW + 0.5 + (i / (count - 1)) * (PEN_WIDTH - 1),
    y,
    z,
    color: BUNTING_COLORS[i % BUNTING_COLORS.length],
    phase: i * 0.6,
  }));
  return (
    <>
      {flags.map((f, i) => (
        <BuntingFlag key={i} {...f} />
      ))}
    </>
  );
}

const eggTextures = new Map();
function getEggTexture(setIndex) {
  const key = setIndex % EGG_SETS.length;
  if (eggTextures.has(key)) return eggTextures.get(key);
  const [base, a, b] = EGG_SETS[key];
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 128, 256);
  ctx.fillStyle = a;
  ctx.beginPath();
  ctx.moveTo(0, 112);
  for (let x = 0; x <= 128; x += 16) {
    ctx.lineTo(x, x % 32 === 0 ? 100 : 124);
  }
  ctx.lineTo(128, 146);
  for (let x = 128; x >= 0; x -= 16) {
    ctx.lineTo(x, x % 32 === 0 ? 134 : 158);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = b;
  [62, 196].forEach((y, row) => {
    for (let x = row * 12 + 8; x < 128; x += 24) {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.fillStyle = a;
  ctx.fillRect(0, 222, 128, 6);
  ctx.fillRect(0, 34, 128, 6);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  eggTextures.set(key, tex);
  return tex;
}

function EasterEgg({ size = 0.1, set = 0 }) {
  const night = useNight();
  const tex = getEggTexture(set);
  return (
    <mesh scale={[size, size * 1.32, size]} castShadow>
      <sphereGeometry args={[1, 20, 16]} />
      <meshStandardMaterial map={tex} roughness={0.7} emissive={night ? EGG_SETS[set % EGG_SETS.length][0] : "#000000"} emissiveIntensity={night ? 0.18 : 0} />
    </mesh>
  );
}

const EGG_PLACEMENTS = [
  [-0.95, 0.95], [1.25, 1.0], [-2.6, 0.6], [2.75, 0.35], [-0.45, -1.95],
  [0.95, -2.25], [-2.95, -2.2], [2.6, 2.25], [-2.35, 2.3], [0.25, 2.45],
  [-4.4, 1.6], [4.5, -1.3], [3.7, 4.1], [-3.4, -4.0],
].map(([x, z], i) => ({
  x,
  z,
  set: i,
  size: 0.085 + seededRand(i * 3.7) * 0.035,
  tilt: (seededRand(i * 5.9) - 0.5) * 0.9,
  spin: seededRand(i * 7.1) * Math.PI * 2,
}));

function ScatteredEggs() {
  return (
    <>
      {EGG_PLACEMENTS.map((e, i) => (
        <group key={i} position={[e.x, e.size * 1.15, e.z]} rotation={[0, e.spin, e.tilt]}>
          <EasterEgg size={e.size} set={e.set} />
        </group>
      ))}
    </>
  );
}

const PLANTER_WOOD = "#f4cdbd";
const PLANTER_WOOD_DARK = "#e6b29f";

function CarrotSprout({ position, phase }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 1.4 + phase) * 0.08;
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.012, 0]}>
        <sphereGeometry args={[0.03, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#f59a52" roughness={0.7} />
      </mesh>
      <group ref={ref} position={[0, 0.02, 0]}>
        {[-0.35, 0, 0.35].map((a, i) => (
          <mesh key={i} position={[Math.sin(a) * 0.02, 0.05, 0]} rotation={[0, 0, a]} scale={[1, 1, 0.5]}>
            <coneGeometry args={[0.018, 0.1, 5]} />
            <meshStandardMaterial color={i === 1 ? "#7cc46e" : "#94d384"} roughness={0.9} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Strawberry({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.03, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.028, 0.05, 10]} />
        <meshStandardMaterial color="#ff7f9a" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.056, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.024, 6]} />
        <meshStandardMaterial color="#7cc46e" side={THREE.DoubleSide} roughness={0.9} />
      </mesh>
    </group>
  );
}

function RoseArch({ position = [0, 0, -0.45] }) {
  const night = useNight();
  const roses = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 15) * Math.PI;
        return {
          p: [Math.cos(a) * 0.52, 0.62 + Math.sin(a) * 0.32, (seededRand(i * 3.3) - 0.5) * 0.06],
          color: ["#ffb3c8", "#ff9fbf", "#ffd1df", "#ffffff"][i % 4],
          r: 0.035 + seededRand(i * 5.1) * 0.015,
        };
      }),
    [],
  );
  return (
    <group position={position}>
      {[-0.52, 0.52].map((x) => (
        <mesh key={x} position={[x, 0.31, 0]} castShadow>
          <boxGeometry args={[0.05, 0.62, 0.05]} />
          <meshStandardMaterial color="#fff6f0" roughness={0.85} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, 0]} scale={[1, 0.62, 1]} castShadow>
        <torusGeometry args={[0.52, 0.022, 8, 28, Math.PI]} />
        <meshStandardMaterial color="#fff6f0" roughness={0.85} />
      </mesh>
      {roses.map((r, i) => (
        <group key={i} position={r.p}>
          <mesh>
            <sphereGeometry args={[r.r, 10, 8]} />
            <meshStandardMaterial color={soften(r.color, night)} emissive={r.color} emissiveIntensity={night ? 0.15 : 0.04} roughness={0.75} />
          </mesh>
          <mesh position={[r.r * 0.9, -r.r * 0.6, 0.01]} rotation={[0, 0, 0.8]} scale={[1, 0.5, 0.4]}>
            <sphereGeometry args={[r.r * 0.9, 8, 6]} />
            <meshStandardMaterial color="#8fcf86" roughness={0.9} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function WateringCan({ position, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={0.55}>
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.12, 0.24, 16]} />
        <meshStandardMaterial color="#bfe6da" roughness={0.6} />
      </mesh>
      <mesh position={[0.16, 0.18, 0]} rotation={[0, 0, -0.9]}>
        <cylinderGeometry args={[0.018, 0.03, 0.22, 10]} />
        <meshStandardMaterial color="#a9dccc" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.27, 0]}>
        <torusGeometry args={[0.08, 0.014, 8, 16, Math.PI]} />
        <meshStandardMaterial color="#a9dccc" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.12, 0.116]}>
        <circleGeometry args={[0.035, 12]} />
        <meshStandardMaterial color="#ffb3c8" roughness={0.7} />
      </mesh>
    </group>
  );
}

function BabyBunny({ position, color, scale = 1, phase = 0, facing = 0 }) {
  const root = useRef();
  const head = useRef();
  const earL = useRef();
  const earR = useRef();
  const tail = useRef();
  const nextHop = useRef(2 + phase);
  const hopAt = useRef(-10);
  const yaw = useRef(facing);
  const targetYaw = useRef(facing);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (t > nextHop.current) {
      hopAt.current = t;
      nextHop.current = t + 3 + seededRand(Math.floor(t) + phase * 7) * 3;
      targetYaw.current = facing + (seededRand(Math.floor(t * 3) + phase) - 0.5) * 1.4;
    }
    const h = t - hopAt.current;
    const hop = h >= 0 && h < 0.35 ? Math.sin((h / 0.35) * Math.PI) : 0;
    const land = h >= 0.35 && h < 0.5 ? Math.sin(((h - 0.35) / 0.15) * Math.PI) : 0;
    const nibbling = hop === 0 && Math.sin(t * 0.6 + phase * 2) > 0.3;
    yaw.current += (targetYaw.current - yaw.current) * 0.06;
    if (root.current) {
      root.current.position.y = hop * 0.07;
      root.current.rotation.y = yaw.current;
      const sq = 1 + hop * 0.12 - land * 0.08;
      root.current.scale.set(scale / Math.sqrt(sq), scale * sq, scale / Math.sqrt(sq));
    }
    if (head.current) head.current.rotation.x = nibbling ? 0.25 + Math.sin(t * 18) * 0.06 : Math.sin(t * 1.2 + phase) * 0.05 - hop * 0.15;
    const twitch = Math.max(0, Math.sin(t * 0.9 + phase * 3) - 0.92) * 6;
    if (earL.current) earL.current.rotation.set(-0.25 - hop * 0.5, 0, 0.18 + Math.sin(t * 25) * 0.15 * twitch);
    if (earR.current) earR.current.rotation.set(-0.25 - hop * 0.5, 0, -0.18);
    if (tail.current) tail.current.scale.setScalar(1 + Math.max(0, Math.sin(t * 10 + phase)) * 0.15 * (nibbling ? 1 : 0));
  });
  return (
    <group position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <circleGeometry args={[0.1 * scale, 16]} />
        <meshBasicMaterial color="#c58aa0" transparent opacity={0.18} depthWrite={false} />
      </mesh>
      <group ref={root}>
        <mesh position={[0, 0.085, 0]} scale={[1, 0.85, 1.15]} castShadow>
          <sphereGeometry args={[0.09, 18, 14]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        <mesh ref={tail} position={[0, 0.09, -0.105]}>
          <sphereGeometry args={[0.032, 12, 10]} />
          <meshStandardMaterial color="#ffffff" roughness={1} />
        </mesh>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.04, 0.02, 0.07]} scale={[0.8, 0.5, 1.2]}>
            <sphereGeometry args={[0.028, 10, 8]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
        ))}
        <group ref={head} position={[0, 0.15, 0.06]}>
          <mesh position={[0, 0.02, 0.01]} castShadow>
            <sphereGeometry args={[0.066, 18, 14]} />
            <meshStandardMaterial color={color} roughness={0.9} />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} ref={side < 0 ? earL : earR} position={[side * 0.03, 0.07, 0]}>
              <mesh position={[0, 0.05, 0]} scale={[1, 1, 0.55]}>
                <capsuleGeometry args={[0.018, 0.07, 4, 10]} />
                <meshStandardMaterial color={color} roughness={0.9} />
              </mesh>
              <mesh position={[0, 0.05, 0.009]} scale={[1, 1, 0.3]}>
                <capsuleGeometry args={[0.009, 0.055, 4, 8]} />
                <meshStandardMaterial color="#ffb8cc" roughness={0.9} />
              </mesh>
            </group>
          ))}
          {[-1, 1].map((side) => (
            <mesh key={`e${side}`} position={[side * 0.027, 0.03, 0.068]}>
              <sphereGeometry args={[0.009, 8, 6]} />
              <meshStandardMaterial color="#2b1a12" roughness={0.4} />
            </mesh>
          ))}
          {[-1, 1].map((side) => (
            <mesh key={`c${side}`} position={[side * 0.04, 0.008, 0.058]} scale={[1, 0.6, 0.4]}>
              <sphereGeometry args={[0.014, 8, 6]} />
              <meshBasicMaterial color="#ffb3c8" transparent opacity={0.7} />
            </mesh>
          ))}
          <mesh position={[0, 0.013, 0.075]}>
            <sphereGeometry args={[0.008, 8, 6]} />
            <meshStandardMaterial color="#ff9fb8" roughness={0.6} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

function GardenNook({ position = [-1.7, -1.0], rotation = 0.3 }) {
  const night = useNight();
  const carrots = useMemo(
    () =>
      [-1, 1].flatMap((row) =>
        Array.from({ length: 4 }, (_, i) => ({ p: [-0.33 + i * 0.22, 0.14, row * 0.12], phase: i + row * 2 })),
      ),
    [],
  );
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <RoseArch />
      <group position={[0, 0, -0.05]}>
        <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.14, 0.5]} />
          <meshStandardMaterial color={soften(PLANTER_WOOD, night)} roughness={0.9} />
        </mesh>
        {[0.035, 0.105].map((y) => (
          <mesh key={y} position={[0, y, 0.252]}>
            <boxGeometry args={[1.0, 0.006, 0.004]} />
            <meshStandardMaterial color={PLANTER_WOOD_DARK} roughness={0.9} />
          </mesh>
        ))}
        <mesh position={[0, 0.142, 0]}>
          <boxGeometry args={[0.92, 0.01, 0.42]} />
          <meshStandardMaterial color="#8a6650" roughness={1} />
        </mesh>
        {carrots.map((c, i) => (
          <CarrotSprout key={i} position={c.p} phase={c.phase} />
        ))}
      </group>
      <group position={[0.75, 0, 0.12]}>
        <mesh position={[0, 0.05, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.16, 0.14, 0.1, 16]} />
          <meshStandardMaterial color={soften(PLANTER_WOOD, night)} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.14, 16]} />
          <meshStandardMaterial color="#8fcf86" roughness={1} />
        </mesh>
        {[[-0.06, 0.1, 0.03], [0.05, 0.1, -0.04], [0.02, 0.1, 0.07]].map((p, i) => (
          <Strawberry key={i} position={p} />
        ))}
      </group>
      <WateringCan position={[-0.72, 0, 0.2]} rotation={0.6} />
      <BabyBunny position={[0.35, 0, 0.45]} color="#fffaf6" phase={0.4} facing={-0.5} />
      <BabyBunny position={[-0.3, 0, 0.5]} color="#f6dcc6" scale={0.9} phase={1.7} facing={0.3} />
      <BabyBunny position={[0.85, 0, 0.5]} color="#e9e2f0" scale={0.8} phase={3.1} facing={-1.2} />
    </group>
  );
}

function EggBasket({ position, rotation = 0 }) {
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.08, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.12, 0.16, 18]} />
        <meshStandardMaterial color="#e0b088" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.018, 8, 24]} />
        <meshStandardMaterial color="#cf9a72" roughness={0.95} />
      </mesh>
      {[0.05, 0.11].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.14 + y * 0.2, 0.008, 6, 24]} />
          <meshStandardMaterial color="#cf9a72" roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.16, 0]}>
        <torusGeometry args={[0.15, 0.014, 8, 24, Math.PI]} />
        <meshStandardMaterial color="#cf9a72" roughness={0.95} />
      </mesh>
      {[
        [-0.06, 0.2, 0.02, 0.3, 1],
        [0.06, 0.2, -0.03, -0.25, 3],
        [0.0, 0.22, 0.07, 0.1, 0],
        [-0.02, 0.21, -0.08, -0.4, 4],
      ].map(([x, y, z, r, set], i) => (
        <group key={i} position={[x, y, z]} rotation={[r * 0.5, 0, r]}>
          <EasterEgg size={0.055} set={set} />
        </group>
      ))}
      <group position={[0, 0.31, 0]}>
        {[-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.035, 0, 0]} rotation={[0, 0, side * 1.2]} scale={[1, 0.6, 0.5]}>
            <coneGeometry args={[0.035, 0.07, 10]} />
            <meshStandardMaterial color="#ff9fbf" roughness={0.6} />
          </mesh>
        ))}
        <mesh>
          <sphereGeometry args={[0.018, 8, 8]} />
          <meshStandardMaterial color="#ff8fb2" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

let cloudTexture = null;
function getCloudTexture() {
  if (cloudTexture) return cloudTexture;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext("2d");
  [[70, 78, 42], [118, 58, 52], [170, 74, 44], [210, 86, 30], [40, 92, 28], [128, 92, 40]].forEach(([x, y, r]) => {
    const g = ctx.createRadialGradient(x, y - r * 0.3, r * 0.2, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.75, "rgba(255,246,250,0.95)");
    g.addColorStop(1, "rgba(255,226,238,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  });
  const shade = ctx.createLinearGradient(0, 70, 0, 128);
  shade.addColorStop(0, "rgba(255,190,214,0)");
  shade.addColorStop(1, "rgba(255,190,214,0.55)");
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 256, 128);
  ctx.globalCompositeOperation = "source-over";
  cloudTexture = new THREE.CanvasTexture(c);
  cloudTexture.colorSpace = THREE.SRGBColorSpace;
  return cloudTexture;
}

const CLOUDS = [
  { x: -0.78, y: 0.86, width: 0.42, speed: 0.012, phase: 0 },
  { x: -0.12, y: 0.93, width: 0.5, speed: 0.008, phase: 0.6 },
  { x: 0.55, y: 0.84, width: 0.4, speed: 0.01, phase: 1.3 },
  { x: 1.1, y: 0.94, width: 0.34, speed: 0.009, phase: 2.1 },
];

function Clouds() {
  const night = useNight();
  const group = useRef(null);
  const tex = getCloudTexture();
  useFrame(({ camera, clock }) => {
    if (!group.current || !camera.isOrthographicCamera) return;
    group.current.position.copy(camera.position);
    group.current.quaternion.copy(camera.quaternion);
    const halfWidth = (camera.right - camera.left) / (2 * camera.zoom);
    const halfHeight = (camera.top - camera.bottom) / (2 * camera.zoom);
    const t = clock.getElapsedTime();
    group.current.children.forEach((mesh, i) => {
      const cl = CLOUDS[i];
      const x = ((cl.x + 1.4 + t * cl.speed) % 2.8) - 1.4;
      mesh.position.set(x * halfWidth, cl.y * halfHeight + Math.sin(t * 0.4 + cl.phase) * halfHeight * 0.01, -0.6);
      const w = cl.width * halfWidth;
      mesh.scale.set(w, w * 0.5, 1);
    });
  });
  return (
    <group ref={group}>
      {CLOUDS.map((_, i) => (
        <mesh key={i} renderOrder={99} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={tex} color={night ? "#b9a6d6" : "#ffffff"} transparent opacity={night ? 0.45 : 0.9} depthTest={false} depthWrite={false} toneMapped={false} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

const BLOSSOM_TREES = [
  { position: [-2.9, -4.0], height: 1.9, seed: 3 },
  { position: [0.9, -4.3], height: 2.2, seed: 11 },
  { position: [3.6, -3.8], height: 1.8, seed: 19 },
  { position: [-4.7, -1.2], height: 1.7, seed: 27 },
  { position: [4.8, 1.4], height: 1.6, seed: 35 },
];
const BLOSSOM_COLORS = ["#ffc4d8", "#ffd6e4", "#ffb0c9", "#ffe6ef"];

function BlossomTree({ position, height, seed }) {
  const night = useNight();
  const ref = useRef();
  const phase = useMemo(() => seededRand(seed) * 6, [seed]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.5 + phase) * 0.008;
  });
  const puffs = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2 + seededRand(seed + i) * 0.8;
        const r = i === 0 ? 0 : 0.28 + seededRand(seed * 3 + i) * 0.22;
        return {
          p: [Math.cos(a) * r, height * (0.82 + seededRand(seed * 5 + i) * 0.22) + (i === 0 ? 0.12 : 0), Math.sin(a) * r * 0.8],
          r: (i === 0 ? 0.42 : 0.26 + seededRand(seed * 7 + i) * 0.12) * (height / 1.9),
          color: BLOSSOM_COLORS[(i + seed) % BLOSSOM_COLORS.length],
        };
      }),
    [height, seed],
  );
  return (
    <group position={[position[0], 0, position[1]]} ref={ref}>
      <mesh position={[0, height * 0.38, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.05, 0.09, height * 0.76, 8]} />
        <meshStandardMaterial color={night ? "#6f5a6e" : "#a87b6c"} roughness={0.95} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.16, height * 0.66, 0]} rotation={[0, 0, -side * 0.7]} castShadow>
          <cylinderGeometry args={[0.025, 0.04, 0.4, 6]} />
          <meshStandardMaterial color={night ? "#6f5a6e" : "#a87b6c"} roughness={0.95} />
        </mesh>
      ))}
      {puffs.map((f, i) => (
        <mesh key={i} position={f.p} castShadow>
          <icosahedronGeometry args={[f.r, 2]} />
          <meshStandardMaterial color={soften(f.color, night)} emissive={f.color} emissiveIntensity={night ? 0.12 : 0.06} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function BlossomTrees() {
  return (
    <>
      {BLOSSOM_TREES.map((tr, i) => (
        <BlossomTree key={i} {...tr} />
      ))}
    </>
  );
}

const FALLING_PETALS = Array.from({ length: 22 }, (_, i) => ({
  x: (seededRand(i * 3.1 + 1) - 0.5) * 9,
  z: (seededRand(i * 5.3 + 2) - 0.5) * 8,
  speed: 0.18 + seededRand(i * 7.7) * 0.14,
  phase: seededRand(i * 9.1) * 10,
  color: BLOSSOM_COLORS[i % BLOSSOM_COLORS.length],
}));

function FallingPetals() {
  const night = useNight();
  const refs = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((m, i) => {
      if (!m) return;
      const p = FALLING_PETALS[i];
      const life = ((t * p.speed + p.phase) % 1 + 1) % 1;
      m.position.set(p.x + Math.sin(t * 0.8 + p.phase) * 0.35, 2.4 - life * 2.4, p.z + Math.cos(t * 0.6 + p.phase) * 0.25);
      m.rotation.set(Math.sin(t * 1.6 + p.phase) * 0.9 + 1.1, t * 0.7 + p.phase, Math.cos(t * 2 + p.phase) * 0.8);
      m.material.opacity = Math.min(1, life * 8, (1 - life) * 6) * (night ? 0.7 : 0.95);
    });
  });
  return (
    <>
      {FALLING_PETALS.map((p, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} scale={[0.6, 1, 1]}>
          <circleGeometry args={[0.035, 8]} />
          <meshStandardMaterial color={p.color} side={THREE.DoubleSide} transparent opacity={0} roughness={0.7} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

const TULIP_COLORS = ["#ff9fbf", "#ffc8a8", "#d9c2ff", "#fff0a6", "#ffb7d0"];
const TULIP_BEDS = [
  { center: [-2.85, -2.35], count: 7, seed: 4 },
  { center: [2.95, -2.45], count: 6, seed: 9 },
  { center: [-2.95, 2.0], count: 6, seed: 14 },
  { center: [3.0, 1.9], count: 7, seed: 21 },
];

function Tulip({ position, color, height, tilt }) {
  const night = useNight();
  const c = soften(color, night);
  return (
    <group position={position} rotation={[tilt, 0, tilt * 0.6]}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.008, 0.01, height, 5]} />
        <meshStandardMaterial color="#7fbf76" roughness={0.9} />
      </mesh>
      <mesh position={[0.025, height * 0.35, 0]} rotation={[0, 0, -0.6]} scale={[0.35, 1, 0.15]}>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color="#8fcf86" roughness={0.9} />
      </mesh>
      <group position={[0, height, 0]}>
        {[0, 1, 2].map((k) => {
          const a = (k / 3) * Math.PI * 2;
          return (
            <mesh key={k} position={[Math.cos(a) * 0.015, 0.03, Math.sin(a) * 0.015]} rotation={[Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]} scale={[0.75, 1.2, 0.75]}>
              <sphereGeometry args={[0.035, 10, 8]} />
              <meshStandardMaterial color={c} emissive={c} emissiveIntensity={night ? 0.15 : 0.04} roughness={0.7} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function TulipBeds() {
  const tulips = useMemo(
    () =>
      TULIP_BEDS.flatMap((bed) =>
        Array.from({ length: bed.count }, (_, i) => {
          const a = seededRand(bed.seed * 11 + i) * Math.PI * 2;
          const r = Math.sqrt(seededRand(bed.seed * 13 + i)) * 0.32;
          return {
            position: [bed.center[0] + Math.cos(a) * r, 0, bed.center[1] + Math.sin(a) * r * 0.8],
            color: TULIP_COLORS[(i + bed.seed) % TULIP_COLORS.length],
            height: 0.16 + seededRand(bed.seed * 17 + i) * 0.1,
            tilt: (seededRand(bed.seed * 19 + i) - 0.5) * 0.25,
          };
        }),
      ),
    [],
  );
  return (
    <>
      {tulips.map((tl, i) => (
        <Tulip key={i} {...tl} />
      ))}
    </>
  );
}

const FAIRY_BULBS = Array.from({ length: 15 }, (_, i) => i);

function FairyLights() {
  const night = useNight();
  const refs = useRef([]);
  const halfW = PEN_WIDTH / 2;
  const z = -PEN_DEPTH / 2 + 0.02;
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    refs.current.forEach((m, i) => {
      if (!m) return;
      m.material.emissiveIntensity = night ? 1.1 + Math.sin(t * 2 + i * 1.3) * 0.35 : 0.25;
    });
  });
  return (
    <>
      {FAIRY_BULBS.map((i) => {
        const u = i / (FAIRY_BULBS.length - 1);
        const x = -halfW + 0.3 + u * (PEN_WIDTH - 0.6);
        const sag = Math.sin(((u * 4) % 1) * Math.PI) * 0.06;
        const color = ["#fff2c4", "#ffd1e2", "#e6dcff"][i % 3];
        return (
          <mesh key={i} ref={(el) => (refs.current[i] = el)} position={[x, 0.5 - sag, z]}>
            <sphereGeometry args={[0.028, 10, 8]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
}

function BunnyPlayCorner({ position = [1.9, -1.1], rotation = -0.3 }) {
  const stones = [
    [-0.22, 0.09, 0.42],
    [-0.14, 0.27, 0.3],
    [0.0, 0.35, 0.26],
    [0.15, 0.28, 0.3],
    [0.23, 0.1, 0.4],
  ];

  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <mesh position={[0, -0.08, 0]} scale={[1, 0.6, 0.9]} castShadow receiveShadow>
        <sphereGeometry args={[0.6, 24, 16]} />
        <meshStandardMaterial color="#a9dca2" roughness={1} flatShading />
      </mesh>
      <mesh position={[0.03, 0.0, -0.04]} scale={[0.8, 0.48, 0.7]}>
        <sphereGeometry args={[0.6, 20, 14]} />
        <meshStandardMaterial color="#bfe8b4" roughness={1} flatShading />
      </mesh>

      <group position={[0, 0, 0.45]}>
        <mesh position={[0, 0.08, 0]}>
          <planeGeometry args={[0.28, 0.16]} />
          <meshStandardMaterial color="#483425" roughness={1} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <circleGeometry args={[0.14, 20, 0, Math.PI]} />
          <meshStandardMaterial color="#483425" roughness={1} />
        </mesh>
        <mesh position={[0, 0.17, 0.015]}>
          <ringGeometry args={[0.14, 0.175, 20, 1, 0, Math.PI]} />
          <meshStandardMaterial color="#b58a62" side={THREE.DoubleSide} roughness={1} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0.13]}>
          <circleGeometry args={[0.19, 14]} />
          <meshStandardMaterial color="#bb9068" roughness={1} />
        </mesh>
      </group>

      {stones.map(([x, y, z], i) => (
        <mesh
          key={i}
          position={[x, y + 0.02, z]}
          rotation={[seededRand(i * 3.1), seededRand(i * 5.7) * 3, seededRand(i * 7.3)]}
          castShadow
        >
          <dodecahedronGeometry args={[0.05 + seededRand(i * 9.1) * 0.025, 0]} />
          <meshStandardMaterial color="#cbb79b" roughness={1} flatShading />
        </mesh>
      ))}

      {Array.from({ length: 16 }).map((_, i) => {
        const a = seededRand(i * 2.7) * Math.PI * 2;
        const r = 0.15 + seededRand(i * 4.9) * 0.33;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r * 0.9;
        const y = 0.29 - (r / 0.48) * 0.26;
        const bloom = i % 2 === 0;
        return (
          <group key={i} position={[x, y, z]}>
            <mesh rotation={[0.2, a, 0.22]}>
              <coneGeometry args={[0.013, 0.1, 4]} />
              <meshStandardMaterial color="#7ba055" roughness={1} />
            </mesh>
            {bloom && (
              <group position={[0, 0.07, 0]}>
                {[0, 1, 2, 3, 4].map((p) => (
                  <mesh
                    key={p}
                    position={[
                      Math.cos((p / 5) * Math.PI * 2) * 0.022,
                      0,
                      Math.sin((p / 5) * Math.PI * 2) * 0.022,
                    ]}
                  >
                    <sphereGeometry args={[0.016, 8, 8]} />
                    <meshStandardMaterial
                      color={["#ffc2d9", "#fff3b0", "#f2a2bb", "#ffd9ec"][i % 4]}
                      roughness={0.75}
                    />
                  </mesh>
                ))}
                <mesh>
                  <sphereGeometry args={[0.014, 8, 8]} />
                  <meshStandardMaterial color="#ffd77a" roughness={0.7} />
                </mesh>
              </group>
            )}
          </group>
        );
      })}

      {[
        [-0.34, 0.5, 0.5],
        [-0.2, 0.6, -0.3],
        [0.28, 0.56, 0.9],
      ].map(([x, z, rot], i) => (
        <group key={i} position={[x, 0.05, z]} rotation={[Math.PI / 2 - 0.35, rot, 0]}>
          <mesh castShadow>
            <coneGeometry args={[0.035, 0.16, 10]} />
            <meshStandardMaterial color="#ef8f4b" roughness={0.7} />
          </mesh>
          {[0, 1, 2].map((l) => (
            <mesh
              key={l}
              position={[0, 0.11, 0]}
              rotation={[0.25 * (l - 1), (l / 3) * Math.PI, 0.2]}
            >
              <coneGeometry args={[0.016, 0.09, 5]} />
              <meshStandardMaterial color="#7ba055" roughness={1} />
            </mesh>
          ))}
        </group>
      ))}

      {Array.from({ length: 8 }).map((_, i) => {
        const a = seededRand(i * 6.2) * Math.PI * 2;
        const r = 0.42 + seededRand(i * 8.8) * 0.22;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, 0.012, 0.2 + Math.sin(a) * r * 0.5]}
            rotation={[-Math.PI / 2, 0, a]}
          >
            <circleGeometry args={[0.03 + seededRand(i * 2.2) * 0.02, 7]} />
            <meshStandardMaterial color="#b98f68" roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
}

const HEART_SHAPE = (() => {
  const h = new THREE.Shape();
  h.moveTo(0, -0.7);
  h.bezierCurveTo(-1.1, 0.05, -0.55, 0.85, 0, 0.35);
  h.bezierCurveTo(0.55, 0.85, 1.1, 0.05, 0, -0.7);
  return h;
})();

function Signpost({ position = [1.6, PEN_DEPTH / 2 + 0.3], rotation = 0.15 }) {
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.035, 0.64, 8]} />
        <meshStandardMaterial color="#e2a8b4" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.56, 0]} castShadow>
        <boxGeometry args={[0.42, 0.24, 0.03]} />
        <meshStandardMaterial color="#fff4f7" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.555, 0.017]} scale={0.06}>
        <shapeGeometry args={[HEART_SHAPE]} />
        <meshStandardMaterial color="#ff9fb8" />
      </mesh>
    </group>
  );
}

const FLOWER_COLORS = ["#ffd9e8", "#fff3b0", "#ffffff", "#ffc2d9", "#d9c2ff"];

function Flower({ position, color }) {
  const night = useNight();
  const petalColor = FLOWER_COLORS[color % FLOWER_COLORS.length];
  return (
    <group position={[position[0], 0.012, position[1]]}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06]}
            rotation={[-Math.PI / 2, 0, a]}
          >
            <sphereGeometry args={[0.045, 8, 6]} />
            <meshStandardMaterial color={petalColor} emissive={night ? petalColor : "#000000"} emissiveIntensity={night ? 0.22 : 0} roughness={0.8} />
          </mesh>
        );
      })}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#ffe37a" roughness={0.5} />
      </mesh>
    </group>
  );
}

function generateFlowerScatter(count, seedOffset) {
  const flowers = [];
  const halfW = PEN_WIDTH / 2 + 0.5;
  const halfD = PEN_DEPTH / 2 + 0.5;
  let seed = seedOffset;
  let attempts = 0;
  while (flowers.length < count && attempts < count * 30) {
    attempts++;
    seed += 1;
    const angle = seededRand(seed * 12.9) * Math.PI * 2;
    const radius = 4.2 + seededRand(seed * 7.7 + 1) * 3.6;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < halfW && Math.abs(z) < halfD) continue;
    const color = Math.floor(seededRand(seed * 3.3 + 2) * FLOWER_COLORS.length);
    flowers.push({ position: [x, z], color });
  }
  return flowers;
}

const FLOWER_PLACEMENTS = generateFlowerScatter(46, 41);

function Flowers() {
  return (
    <>
      {FLOWER_PLACEMENTS.map((f, i) => (
        <Flower key={i} position={f.position} color={f.color} />
      ))}
    </>
  );
}

const MUSHROOM_COLORS = ["#ffb3c8", "#ffd1df", "#e2c4fb"];

function Mushroom({ position, color, scale = 1, rotation = 0 }) {
  const night = useNight();
  const capColor = MUSHROOM_COLORS[color % MUSHROOM_COLORS.length];
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 0.06, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.032, 0.12, 8]} />
        <meshStandardMaterial color="#fff8ef" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.13, 0]} castShadow>
        <sphereGeometry args={[0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={capColor} emissive={night ? capColor : "#000000"} emissiveIntensity={night ? 0.55 : 0} roughness={0.8} />
      </mesh>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.035, 0.155, Math.sin(a) * 0.035]}>
            <sphereGeometry args={[0.012, 6, 6]} />
            <meshStandardMaterial color="#fff8ef" />
          </mesh>
        );
      })}
    </group>
  );
}

const MUSHROOM_CLUSTER_PLACEMENTS = [
  { position: [-1.6, 4.0], color: 0, scale: 1.1, rotation: 0.4 },
  { position: [-1.85, 4.15], color: 1, scale: 0.75, rotation: 1.2 },
  { position: [2.7, 3.6], color: 2, scale: 1.0, rotation: 2.0 },
  { position: [2.9, 3.4], color: 0, scale: 0.7, rotation: 0.8 },
  { position: [-4.0, -3.0], color: 1, scale: 0.9, rotation: 1.6 },
  { position: [4.0, -2.0], color: 2, scale: 0.85, rotation: 0.5 },
];

function Mushrooms() {
  return (
    <>
      {MUSHROOM_CLUSTER_PLACEMENTS.map((m, i) => (
        <Mushroom key={i} {...m} />
      ))}
    </>
  );
}

const ROCK_PLACEMENTS = [
  { position: [-4.1, -1.0], scale: 0.3, rotation: 0.6 },
  { position: [4.3, 0.6], scale: 0.26, rotation: 2.0 },
];

function Rocks() {
  return (
    <>
      {ROCK_PLACEMENTS.map((r, i) => (
        <mesh
          key={i}
          position={[r.position[0], r.scale * 0.4, r.position[1]]}
          rotation={[0.2, r.rotation, 0.1]}
          scale={r.scale}
          castShadow
          receiveShadow
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#e4d8ea" roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}

const DANDELION_PLACEMENTS = [
  { position: [-6.2, 2.4] },
  { position: [5.8, -2.8] },
  { position: [-3.0, 6.4] },
  { position: [4.6, 5.6] },
];

function Dandelion({ position }) {
  const night = useNight();
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.008, 0.012, 0.36, 5]} />
        <meshStandardMaterial color="#6a8f4a" />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <sphereGeometry args={[0.09, 10, 10]} />
        <meshStandardMaterial
          color={night ? NIGHT.wish : "#fdfdf5"}
          emissive={night ? NIGHT.wish : "#000000"}
          emissiveIntensity={night ? 0.7 : 0}
          transparent
          opacity={0.85}
          roughness={1}
        />
      </mesh>
    </group>
  );
}

function Dandelions() {
  return (
    <>
      {DANDELION_PLACEMENTS.map((d, i) => (
        <Dandelion key={i} {...d} />
      ))}
    </>
  );
}

function DriftingSeed({ radius, speed, phase }) {
  const night = useNight();
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = (clock.getElapsedTime() * speed + phase) % 6;
    const cycle = t / 6;
    ref.current.position.set(
      Math.sin(phase * 3) * radius + Math.sin(t * 0.8) * 0.4,
      0.3 + cycle * 2.2,
      Math.cos(phase * 3) * radius + Math.cos(t * 0.6) * 0.4
    );
    ref.current.material.opacity = Math.sin(cycle * Math.PI) * 0.85;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.018, 6, 6]} />
      <meshStandardMaterial
        color={night ? NIGHT.wish : "#ffffff"}
        emissive={night ? NIGHT.wish : "#000000"}
        emissiveIntensity={night ? 0.9 : 0}
        transparent
        opacity={0}
      />
    </mesh>
  );
}

function DriftingSeeds() {
  const seeds = [
    { radius: 2.5, speed: 0.5, phase: 0 },
    { radius: 3.2, speed: 0.4, phase: 1.7 },
    { radius: 1.8, speed: 0.6, phase: 3.4 },
    { radius: 2.9, speed: 0.45, phase: 5.1 },
  ];
  return (
    <>
      {seeds.map((s, i) => (
        <DriftingSeed key={i} {...s} />
      ))}
    </>
  );
}

const BUTTERFLY_PLACEMENTS = [
  { radius: 2.0, speed: 0.35, height: 1.0, phase: 0, color: "#ffb7d6", accent: "#fff4f9", scale: 1.0 },
  { radius: 1.5, speed: 0.5, height: 1.3, phase: 2.1, color: "#ffe89c", accent: "#fffdf0", scale: 0.9 },
  { radius: 2.6, speed: 0.28, height: 0.85, phase: 4.2, color: "#cbbcff", accent: "#f6f2ff", scale: 1.05 },
  { radius: 1.15, speed: 0.62, height: 1.55, phase: 1.1, color: "#aee5f5", accent: "#f0fbff", scale: 0.85 },
];

function Wing({ color, accent, flip = 1 }) {
  return (
    <group scale={[flip, 1, 1]}>
      <mesh position={[0.085, 0, 0.018]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.82, 1]}>
        <circleGeometry args={[0.085, 20]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.95} roughness={0.45} />
      </mesh>
      <mesh position={[0.086, 0.0012, 0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.5, 0.42, 0.5]}>
        <circleGeometry args={[0.085, 16]} />
        <meshStandardMaterial color={accent} side={THREE.DoubleSide} transparent opacity={0.9} roughness={0.4} />
      </mesh>
      <mesh position={[0.062, -0.0012, -0.045]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.9, 1]}>
        <circleGeometry args={[0.055, 18]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.88} roughness={0.5} />
      </mesh>
    </group>
  );
}

function Butterfly({ radius, speed, height, phase, color, accent, scale = 1 }) {
  const group = useRef();
  const wingL = useRef();
  const wingR = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const a = t * speed + phase;
    if (group.current) {
      const x = Math.cos(a) * radius;
      const z = Math.sin(a * 2) * radius * 0.55;
      const y = height + Math.sin(t * 1.4 + phase) * 0.22 + Math.sin(t * 3.1 + phase) * 0.05;
      const prev = group.current.position;
      group.current.rotation.y = Math.atan2(x - prev.x, z - prev.z);
      group.current.position.set(x, y, z);
      group.current.rotation.z = Math.sin(t * 1.1 + phase) * 0.16;
    }
    const flap = 0.45 + Math.sin(t * 9 + phase) * 0.7;
    if (wingL.current) wingL.current.rotation.z = flap;
    if (wingR.current) wingR.current.rotation.z = -flap;
  });
  return (
    <group ref={group} scale={scale}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <capsuleGeometry args={[0.014, 0.035, 4, 10]} />
        <meshStandardMaterial color="#8a6f8f" roughness={0.55} />
      </mesh>
      <mesh position={[0, 0.008, 0.038]}>
        <sphereGeometry args={[0.018, 12, 12]} />
        <meshStandardMaterial color="#9b7ea1" roughness={0.55} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.009, 0.02, 0.045]} rotation={[-0.5, 0, s * 0.4]}>
          <mesh position={[0, 0.022, 0]}>
            <cylinderGeometry args={[0.0015, 0.0015, 0.045, 4]} />
            <meshStandardMaterial color="#9b7ea1" />
          </mesh>
          <mesh position={[0, 0.046, 0]}>
            <sphereGeometry args={[0.0075, 8, 8]} />
            <meshStandardMaterial color={accent} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <group ref={wingL} position={[0.006, 0.008, 0]}>
        <Wing color={color} accent={accent} flip={1} />
      </group>
      <group ref={wingR} position={[-0.006, 0.008, 0]}>
        <Wing color={color} accent={accent} flip={-1} />
      </group>
    </group>
  );
}

function Butterflies() {
  return (
    <>
      {BUTTERFLY_PLACEMENTS.map((b, i) => (
        <Butterfly key={i} {...b} />
      ))}
    </>
  );
}

function Fireflies({ count = 14 }) {
  const ref = useRef();
  const data = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: (seededRand(i * 3.3 + 1) - 0.5) * 8,
        y: 0.3 + seededRand(i * 5.1 + 2) * 1.4,
        z: (seededRand(i * 7.7 + 3) - 0.5) * 7,
        p: seededRand(i * 9.9) * 6.28,
      })),
    [count],
  );
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.children.forEach((m, i) => {
      const d = data[i];
      m.position.set(d.x + Math.sin(t * 0.4 + d.p) * 0.4, d.y + Math.sin(t * 0.7 + d.p * 1.7) * 0.2, d.z + Math.cos(t * 0.35 + d.p) * 0.4);
      m.material.opacity = 0.35 + Math.abs(Math.sin(t * 2 + d.p)) * 0.6;
    });
  });
  return (
    <group ref={ref}>
      {data.map((_, i) => (
        <mesh key={i}>
          <sphereGeometry args={[0.035, 8, 6]} />
          <meshBasicMaterial color={NIGHT.firefly} transparent opacity={0.8} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Stars() {
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

function PoofRing({ position, onDone }) {
  const ref = useRef();
  const startRef = useRef(null);
  const DURATION = 0.5;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (startRef.current === null) startRef.current = clock.getElapsedTime();
    const elapsed = clock.getElapsedTime() - startRef.current;
    if (elapsed > DURATION) {
      onDone();
      return;
    }
    const t = elapsed / DURATION;
    ref.current.scale.setScalar(0.1 + t * 0.5);
    ref.current.material.opacity = (1 - t) * 0.45;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.03, position[1]]}>
      <ringGeometry args={[0.1, 0.16, 20]} />
      <meshBasicMaterial color="#fff8ef" transparent opacity={0.45} side={THREE.DoubleSide} />
    </mesh>
  );
}

function PoofManager({ poofs, onPoofDone }) {
  return (
    <>
      {poofs.map((p) => (
        <PoofRing key={p.id} position={p.position} onDone={() => onPoofDone(p.id)} />
      ))}
    </>
  );
}

const BUNNY_BASE_YAW = 0;

function IdleBunny({ modelPath, homePosition, onHop, scale = 1, inline: InlineAnimation = null, variant, inlineProps }) {
  const group = useRef();
  const body = useRef();
  const motion = useRef({ hop: 0, glance: 0, busy: false });
  const { camera, gl } = useThree();
  const { scene } = useGLTF(modelPath);
  const object = useMemo(() => makeMatte(scene.clone()), [scene]);
  const offset = useGroundedOffset(object);
  const rigged = isBunnyModel(modelPath);
  const anchorBox = useMemo(() => {
    const b = new THREE.Box3().setFromObject(object);
    if (b.isEmpty()) return null;
    const s = typeof scale === "number" ? scale : 1;
    return new THREE.Box3(
      new THREE.Vector3(homePosition[0] + offset[0] + b.min.x * s, offset[1] + b.min.y * s, homePosition[1] + offset[2] + b.min.z * s),
      new THREE.Vector3(homePosition[0] + offset[0] + b.max.x * s, offset[1] + b.max.y * s, homePosition[1] + offset[2] + b.max.z * s),
    );
  }, [object, offset, scale, homePosition]);

  const nextHop = useRef(1.5 + Math.random() * 2);
  const nextGlance = useRef(1 + Math.random() * 2);
  const baseYaw = useRef(BUNNY_BASE_YAW);
  const glanceOffset = useRef(0);

  useFrame(({ clock }) => {
    if (anchorBox) publishMoodAnchor(camera, gl, anchorBox);

    if (!group.current) return;
    const t = clock.getElapsedTime();

    if (t > nextHop.current) {
      if (motion.current.busy) {
        nextHop.current = t + 1.2;
      } else {
        nextHop.current = t + 2 + Math.random() * 2.5;
        onHop?.(homePosition);
      }
    }

    const timeSincePlan = nextHop.current - t;
    const justHopped = timeSincePlan > 1.7 && timeSincePlan < 2.0;
    const hopProgress = justHopped ? (2 - timeSincePlan) / 0.3 : 0;
    const hopArc = justHopped ? Math.abs(Math.sin(hopProgress * Math.PI)) : 0;
    const hopY = justHopped ? hopArc * 0.16 : Math.sin(t * 2.2) * 0.012;
    motion.current.hop = hopArc;

    if (body.current) {
      const squashStretch = justHopped ? 1 + Math.sin(hopProgress * Math.PI) * 0.08 : 1 + Math.sin(t * 2.2) * 0.01;
      body.current.scale.set(1 / Math.sqrt(squashStretch), squashStretch, 1 / Math.sqrt(squashStretch));
    }

    if (t > nextGlance.current) {
      nextGlance.current = t + 2 + Math.random() * 2.5;
      glanceOffset.current = (Math.random() - 0.5) * 0.35;
    }
    motion.current.glance = glanceOffset.current;
    const targetYaw = baseYaw.current + glanceOffset.current * (rigged ? 0.5 : 1);
    let angleDelta = targetYaw - group.current.rotation.y;
    while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
    while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
    group.current.rotation.y += angleDelta * 0.05;
    group.current.position.y = (rigged ? 0 : offset[1]) + hopY;
  });

  const spot = anchorBox ? <BunnySpot box={anchorBox} /> : null;

  if (InlineAnimation) {
    return (
      <>
        {spot}
        <InlineAnimation
          {...inlineProps}
          placement={{ homePosition, offset, scale, yaw: BUNNY_BASE_YAW, lean: INLINE_LEAN }}
          idleModelPath={modelPath}
          variant={variant}
        />
      </>
    );
  }

  if (rigged) {
    return (
      <>
        {spot}
        <group ref={group} position={[homePosition[0], 0, homePosition[1]]}>
          <group ref={body}>
            <group position={[-homePosition[0], 0, -homePosition[1]]}>
              <BunnyMood
                modelUrl={modelPath}
                idleModelPath={modelPath}
                placement={{ homePosition, offset, scale, yaw: BUNNY_BASE_YAW, lean: 0 }}
                Rig={BunnyPrincessIdleRig}
                rigProps={{ motion }}
              />
            </group>
          </group>
        </group>
      </>
    );
  }

  return (
    <>
      {spot}
      <group ref={group} position={[homePosition[0], 0, homePosition[1]]} rotation={[0, BUNNY_BASE_YAW, 0]}>
        <group ref={body}>
          <primitive object={object} scale={scale} position={[offset[0], 0, offset[2]]} />
        </group>
      </group>
    </>
  );
}

class BunnyErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return <IdleBunny modelPath={DEFAULT_MODEL} homePosition={this.props.position} />;
    }
    return this.props.children;
  }
}

const BUNNY_HOME_POSITION = [0.14, 1.1];

const BUNNY_SCALE = 0.70;

const isBunnyModel = (model) => /characters\/bunny\/bunny\.glb/.test(String(model || ""));

function headHit(clientX, clientY) {
  const a = window.__moodAnchor;
  if (!a) return null;
  const height = a.bottom - a.top;
  const halfWidth = height * 0.34;
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
      const x = a ? THREE.MathUtils.clamp((e.clientX - a.x) / ((a.bottom - a.top) * 0.27), -1, 1) : 0;
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

function BunnySlot({ characterModel, onHop }) {
  const mood = useMoodAnimation();
  const [petting, setPetting] = useState(false);
  const pet = useRef({ until: 0, x: null });
  const canPet = isBunnyModel(characterModel);
  const canInline = canPet || mood.mood === "feeding";
  const Mood = mood.active && canInline ? INLINE_MOODS[mood.mood] || null : null;
  const Inline = petting && canPet ? PetBunny : Mood;
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
    <BunnyErrorBoundary position={BUNNY_HOME_POSITION}>
      <IdleBunny
        key={pettingNow ? (moodActive("angry") ? "refuse" : moodActive("crying") ? "comfort" : "pet") : Inline ? `${mood.mood}-${mood.variant || ""}` : "idle"}
        variant={mood.variant}
        modelPath={characterModel}
        homePosition={BUNNY_HOME_POSITION}
        onHop={Inline ? undefined : onHop}
        scale={BUNNY_SCALE}
        inline={Inline}
        inlineProps={pettingNow ? { pet, onDone: handleDone, refuse: moodActive("angry"), comfort: moodActive("crying") } : undefined}
      />
    </BunnyErrorBoundary>
  );
}

const ISO_DISTANCE = 7.8;
const ISO_ELEVATION = 0.20;
const ISO_YAW = 0;
const ISO_ZOOM = 98;
const ISO_POSITION = [
  ISO_DISTANCE * Math.cos(ISO_ELEVATION) * Math.sin(ISO_YAW),
  ISO_DISTANCE * Math.sin(ISO_ELEVATION),
  ISO_DISTANCE * Math.cos(ISO_ELEVATION) * Math.cos(ISO_YAW),
];

const BunnyHabitat3D = ({ characterModel, showCharacter = true }) => {
  const night = useNightModeSetting();

  useEffect(() => {
    if (isBunnyModel(characterModel)) BUNNY_MOOD_MODELS.forEach((url) => useGLTF.preload(url));
  }, [characterModel]);
  const L = night ? LIGHTS.night : LIGHTS.day;
  const [poofs, setPoofs] = useState([]);

  useEffect(() => {
    window.__habitatInline = { animal: "bunny", moods: isBunnyModel(characterModel) ? Object.keys(INLINE_MOODS) : ["feeding"] };
    window.dispatchEvent(new CustomEvent("habitat-inline", { detail: window.__habitatInline }));
    return () => {
      window.__habitatInline = null;
      window.__moodAnchor = null;
      window.dispatchEvent(new CustomEvent("habitat-inline", { detail: null }));
    };
  }, [characterModel]);

  const addPoof = (position) => {
    setPoofs((prev) => [...prev, { id: `${Date.now()}-${Math.random()}`, position }]);
  };
  const removePoof = (id) => {
    setPoofs((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="habitat-canvas-wrap">
      <Canvas
        shadows
        orthographic
        camera={{ position: ISO_POSITION, zoom: ISO_ZOOM, near: 0.1, far: 200 }}
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: L.exposure }}
      >
        <NightContext.Provider value={night}>
          <ExposureSync exposure={L.exposure} />
          <color attach="background" args={[L.background]} />
          <fog attach="fog" args={[L.background, 55, 145]} />

          <OrbitControls
            target={[0, 0.4, 0]}
            enableDamping
            dampingFactor={0.08}
            enablePan={false}
            rotateSpeed={0.5}
            minPolarAngle={0.55}
            maxPolarAngle={1.05}
            minZoom={70}
            maxZoom={230}
          />

          <ambientLight intensity={L.ambient} color={L.ambientColor} />
          <directionalLight
            position={[5, 8, 3]}
            intensity={L.sun}
            color={L.sunColor}
            castShadow
            shadow-bias={-0.0004}
            shadow-mapSize={[2048, 2048]}
            shadow-camera-left={-7}
            shadow-camera-right={7}
            shadow-camera-top={7}
            shadow-camera-bottom={-7}
          />
          <directionalLight position={[-5, 3, -4]} intensity={L.rim} color={L.rimColor} />
          <directionalLight position={[0, 3, 7]} intensity={night ? 0.3 : 0.5} color={night ? "#f2e4ff" : "#fff6f2"} />
          <hemisphereLight args={[L.hemiSky, L.hemiGround, L.hemi]} />
          <Clouds />
          {night && <Stars />}

          <React.Suspense fallback={null}>
            <Ground />
            <Dandelions />
            <DriftingSeeds />
            {night ? <Fireflies /> : <Butterflies />}
            <PoofManager poofs={poofs} onPoofDone={removePoof} />

            <DirtPen />
            <ContactShadow position={[-1.7, -1.0]} radius={0.72} opacity={0.14} />
            <ContactShadow position={[1.9, -1.1]} radius={0.78} opacity={0.18} />
            <GrassTufts />
            <Fence />
            <Entrance />

            <Bunting />
            <GardenNook />
            <BlossomTrees />
            <TulipBeds />
            <FairyLights />
            <FallingPetals />
            <ScatteredEggs />
            <BunnyPlayCorner />

            <Signpost />


            <Rocks />
            <Flowers />
            <Mushrooms />
            {showCharacter && <BunnySlot characterModel={characterModel} onHop={addPoof} />}
          </React.Suspense>
        </NightContext.Provider>
      </Canvas>
    </div>
  );
};

export default BunnyHabitat3D;