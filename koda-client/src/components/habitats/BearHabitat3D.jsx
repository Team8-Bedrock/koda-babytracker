import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

import "../../styling/components/habitats.css";
import { DEFAULT_MODEL } from "../../constants/avatars";
import { seededRand, drawWrapped } from "./habitatUtils";
import FeedingBear from "../animations/bear/FeedingBear";
import AngryBear from "../animations/bear/AngryBear";
import CryingBear from "../animations/bear/CryingBear";
import HungryBear from "../animations/bear/HungryBear";
import SleepyBear from "../animations/bear/SleepyBear";
import SleepingBear from "../animations/bear/SleepingBear";
import WokeBear from "../animations/bear/WokeBear";
import HappyBear from "../animations/bear/HappyBear";
import EnergeticBear from "../animations/bear/EnergeticBear";
import QuietBear from "../animations/bear/QuietBear";
import OtherBear from "../animations/bear/OtherBear";
import PlaytimeBear from "../animations/bear/PlaytimeBear";
import DiaperBear from "../animations/bear/DiaperBear";

function useNightMode() {
  const [night, setNight] = React.useState(() => typeof window !== "undefined" && localStorage.getItem("koda-dark-mode") === "true");
  React.useEffect(() => {
    const onMode = (e) => setNight(e && e.detail && typeof e.detail.isDarkMode === "boolean" ? e.detail.isDarkMode : localStorage.getItem("koda-dark-mode") === "true");
    window.addEventListener("koda-dark-mode", onMode);
    return () => window.removeEventListener("koda-dark-mode", onMode);
  }, []);
  return night;
}

const NIGHT = {
  background: "#2a3762",
  fog: "#2a3762",
  ambient: 0.62,
  ambientColor: "#b9c6f0",
  sun: 0.85,
  sunColor: "#c7d4ff",
  rim: 0.5,
  rimColor: "#9fbaff",
  hemiSky: "#8ea3e0",
  hemiGround: "#34525c",
  hemiI: 0.75,
  groundBase: "#4f7383",
  firefly: "#ffe9a0",
  pond: "#3f6fb3",
  pondEdge: "#7d8db5",
  pine: "#4d8188",
  pineLight: "#70a49b",
  pineDeep: "#3b6573",
  pineAccent: "#86b8a4",
  star: "#ffeca1",
  lantern: "#ffd27a",
  glow: "#ffbf63",
  bark: "#4c4f68",
  barkDark: "#2d3248",
  log: "#5d6582",
  logEnd: "#a8aec6",
  stone: "#7f8db0",
  pathStone: "#b3bdd8",
  moss: "#4f8781",
  berry: "#d47aa0",
  soil: "#33405a",
  fence: "#8a96b5",
  fenceTop: "#aab4cf",
  carrot: "#d39a6a",
  lily: "#4f8f84",
  honeyPot: "#9a7f8f",
  honey: "#f0c96a",
  smoke: "#8794b5",
  houseWall: "#9eb0cf",
  houseRoof: "#4b7b86",
  houseWood: "#5b6585",
  houseWindow: "#ffd98a",
  petal: "#c9b6e4",
  waterSparkle: "#e2ecff",
  bearLight: "#ffe6c4",
};

const INLINE_MOODS = {
  feeding: FeedingBear,
  angry: AngryBear,
  crying: CryingBear,
  hungry: HungryBear,
  sleepy: SleepyBear,
  sleeping: SleepingBear,
  woke: WokeBear,
  groggy: WokeBear,
  happy: HappyBear,
  energetic: EnergeticBear,
  quiet: QuietBear,
  other: OtherBear,
  playtime: PlaytimeBear,
  diaper: DiaperBear,
};
const BEAR_MOOD_MODELS = ["angry", "feeding", "hungry", "sleepy", "sleeping"].map((name) => `/models/characters/bear/${name}.glb`);
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

const BEAR_MODEL = "/models/characters/bear/bear.glb";
const HOUSE_MODEL = "/models/habitats/house.glb";

const BEAR_HEIGHT = 0.32;
const BEAR_POSITION = [0.02, 0.72];
const POND_CENTER = [0.62, 1.2];
const PALETTE = {
  background: "#d9efe4",
  fog: "#d9efe4",
  sun: "#fff0cf",
  rim: "#b6e3d6",
  hemiSky: "#ffffff",
  hemiGround: "#6f9a6e",
  groundBase: "#b4cf6c",
  pine: "#8fb35a",
  pineLight: "#b8cc6a",
  pineDeep: "#6f9a4f",
  pineAccent: "#d2d873",
  bark: "#8a5c3c",
  barkDark: "#5c3b27",
  log: "#9a6f47",
  stone: "#b8b6a6",
  moss: "#9cb86a",
  berry: "#e2557a",
  lantern: "#ffcf6e",
  petal: ["#fff6e8", "#f7c3d3", "#ffe08f", "#d8e0ff", "#c9b3f0"],
  mushroomCap: "#e8664f",
  grass: ["#8fab5d", "#adc46c"],
  flame: "#ff994a",
  flameCore: "#ffe5a0",
  ember: "#f5b45e",
  charredWood: "#624331",
  dayGroundTint: "#ffffff",
  pond: "#8fd8dc",
  pondEdge: "#f1e6b8",
  lily: "#7fbf63",
};

const TEX = 512;

function buildForestFloorTexture(night = false) {
  const canvas = document.createElement("canvas");
  canvas.width = TEX;
  canvas.height = TEX;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = night ? NIGHT.groundBase : PALETTE.groundBase;
  ctx.fillRect(0, 0, TEX, TEX);
  if (night) {
    // soft moonlit patches
    for (let i = 0; i < 22; i++) {
      const seed = i * 61 + 3;
      const bx = (seed * 37) % TEX;
      const by = (seed * 53) % TEX;
      const radius = 50 + (seed % 5) * 24;
      const light = 30 + (seed % 4) * 4;
      drawWrapped(ctx, bx, by, TEX, radius, (x, y) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
        g.addColorStop(0, `hsla(${188 + (seed % 3) * 6}, 30%, ${light}%, 0.35)`);
        g.addColorStop(1, `hsla(${188 + (seed % 3) * 6}, 30%, ${light}%, 0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    // grass strokes
    for (let i = 0; i < 80; i++) {
      const seed = i * 17 + 9;
      const bx = (seed * 31) % TEX;
      const by = (seed * 47) % TEX;
      ctx.fillStyle = `hsla(${175 + (seed % 4) * 5}, 28%, ${22 + (seed % 4) * 3}%, 0.45)`;
      drawWrapped(ctx, bx, by, TEX, 6, (x, y) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((seed % 12) * 0.26);
        ctx.beginPath();
        ctx.ellipse(0, 0, 1.4, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }
    // dewy, moonlit petals
    const dew = ["rgba(226,236,255,0.55)", "rgba(201,182,228,0.5)", "rgba(255,233,160,0.4)"];
    for (let i = 0; i < 60; i++) {
      const seed = i * 29 + 13;
      drawWrapped(ctx, (seed * 23) % TEX, (seed * 59) % TEX, TEX, 4, (x, y) => {
        ctx.fillStyle = dew[i % 3];
        ctx.beginPath();
        ctx.arc(x, y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    const nightTex = new THREE.CanvasTexture(canvas);
    nightTex.wrapS = THREE.RepeatWrapping;
    nightTex.wrapT = THREE.RepeatWrapping;
    nightTex.minFilter = THREE.LinearMipmapLinearFilter;
    nightTex.colorSpace = THREE.SRGBColorSpace;
    return nightTex;
  }
  for (let i = 0; i < 24; i++) {
    const seed = i * 61 + 3;
    const bx = (seed * 37) % TEX;
    const by = (seed * 53) % TEX;
    const radius = 50 + (seed % 5) * 24;
    const hue = 70 + (seed % 4) * 4;
    const light = 60 + (seed % 4) * 4;
    drawWrapped(ctx, bx, by, TEX, radius, (x, y) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, `hsla(${hue}, 45%, ${light}%, 0.22)`);
      g.addColorStop(1, `hsla(${hue}, 45%, ${light}%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  for (let i = 0; i < 80; i++) {
    const seed = i * 17 + 9;
    const bx = (seed * 31) % TEX;
    const by = (seed * 47) % TEX;
    ctx.fillStyle = `hsla(${82 + (seed % 4) * 4}, 35%, ${50 + (seed % 4) * 4}%, 0.22)`;
    drawWrapped(ctx, bx, by, TEX, 6, (x, y) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((seed % 12) * 0.26);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  const petalCols = ["rgba(255,246,232,0.9)", "rgba(247,195,211,0.85)", "rgba(255,224,143,0.85)"];
  for (let i = 0; i < 70; i++) {
    const seed = i * 29 + 13;
    const bx = (seed * 23) % TEX;
    const by = (seed * 59) % TEX;
    drawWrapped(ctx, bx, by, TEX, 4, (x, y) => {
      ctx.fillStyle = petalCols[i % 3];
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const GROUND_SIZE = 9;

function Ground() {
  const night = useNightMode();
  const tex = useMemo(() => buildForestFloorTexture(night), [night]);
  useEffect(() => {
    tex.repeat.set(GROUND_SIZE / 2.4, GROUND_SIZE / 2.4);
    return () => tex.dispose();
  }, [tex]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      <meshStandardMaterial key={night ? "n" : "d"} map={tex} color={PALETTE.dayGroundTint} roughness={1} />
    </mesh>
  );
}

const PINES = [
  { position: [-0.92, 0, -0.86], height: 0.5, seed: 3 },
  { position: [0.545, 0, -0.55], height: 0.56, seed: 9 },
  { position: [0.152, 0, -0.95], height: 0.62, seed: 17 },
  { position: [-0.78, 0, 0.28], height: 0.44, seed: 23 },
  { position: [0.639, 0, 0.25], height: 0.46, seed: 31 },
  { position: [0.447, 0, -1.15], height: 0.54, seed: 41 },
  { position: [-0.376, 0, -1.2], height: 0.5, seed: 47 },
];

function LogCabin() {
  const night = useNightMode();
  const glow = useRef(null);
  useFrame(({ clock }) => {
    const m = glow.current?.material;
    if (m) m.opacity = 0.75 + Math.sin(clock.getElapsedTime() * 2.2) * 0.15;
  });
  const logs = useMemo(() => [0.07, 0.19, 0.31, 0.43], []);
  return (
    <group position={[-0.62, 0, -0.3]} rotation={[0, 0.6, 0]} scale={0.45}>
      {logs.map((y, i) => (
        <mesh key={i} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.72, 0.11, 0.6]} />
          <meshStandardMaterial color={night ? NIGHT.log : i % 2 ? PALETTE.log : "#8b6340"} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.62, 0.34, 4]} />
        <meshStandardMaterial color={night ? NIGHT.houseRoof : "#5f9c8f"} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.19, 0.31]}>
        <planeGeometry args={[0.24, 0.36]} />
        <meshBasicMaterial color={night ? NIGHT.barkDark : "#2a1c13"} />
      </mesh>
      <mesh ref={glow} position={[0, 0.2, 0.315]}>
        <planeGeometry args={[0.2, 0.3]} />
        <meshBasicMaterial color={PALETTE.lantern} transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <mesh position={[0.3, 0.5, 0.28]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshBasicMaterial color={PALETTE.lantern} toneMapped={false} />
      </mesh>
      <pointLight position={[0.3, 0.5, 0.3]} intensity={night ? 1.1 : 0.5} distance={1.6} color={PALETTE.lantern} />
    </group>
  );
}

const PATH_STONES = [
  { position: [-0.235, 0.012, -0.35], scale: [0.1, 0.024, 0.085], rotation: 0.4 },
  { position: [-0.175, 0.012, -0.1], scale: [0.095, 0.024, 0.08], rotation: 1.3 },
  { position: [-0.11, 0.012, 0.15], scale: [0.105, 0.024, 0.085], rotation: 2.1 },
  { position: [-0.045, 0.012, 0.4], scale: [0.095, 0.022, 0.08], rotation: 0.8 },
  { position: [-0.005, 0.012, 0.6], scale: [0.09, 0.022, 0.075], rotation: 1.9 },
];

function SteppingStones() {
  const night = useNightMode();
  return (
    <>
      {PATH_STONES.map((s, i) => (
        <mesh key={i} position={s.position} rotation={[0, s.rotation, 0]} scale={s.scale} receiveShadow castShadow>
          <cylinderGeometry args={[1, 1.1, 1, 9]} />
          <meshStandardMaterial color={night ? NIGHT.pathStone : "#e2ddd0"} roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}
const LANTERNS = [
  { position: [-0.3, 0, 0.12] },
  { position: [0.11, 0, 0.33] },
];

function LanternPost({ position }) {
  const night = useNightMode();
  return (
    <group position={position}>
      <mesh position={[0, 0.09, 0]} castShadow>
        <cylinderGeometry args={[0.008, 0.011, 0.18, 6]} />
        <meshStandardMaterial color={night ? NIGHT.barkDark : PALETTE.barkDark} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.195, 0]} castShadow>
        <boxGeometry args={[0.034, 0.036, 0.034]} />
        <meshStandardMaterial
          color={night ? NIGHT.lantern : PALETTE.lantern}
          emissive={night ? NIGHT.lantern : PALETTE.lantern}
          emissiveIntensity={night ? 0.9 : 0.25}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.222, 0]}>
        <coneGeometry args={[0.03, 0.022, 4]} />
        <meshStandardMaterial color={night ? NIGHT.barkDark : PALETTE.barkDark} roughness={0.9} flatShading />
      </mesh>
      {night && (
        <>
          {/* soft halo around the lamp and a warm pool of light on the ground */}
          <mesh position={[0, 0.195, 0]}>
            <sphereGeometry args={[0.05, 12, 10]} />
            <meshBasicMaterial color={NIGHT.glow} transparent opacity={0.1} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
            <circleGeometry args={[0.16, 24]} />
            <meshBasicMaterial color={NIGHT.glow} transparent opacity={0.08} depthWrite={false} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 0.2, 0]} color={NIGHT.lantern} intensity={0.28} distance={0.7} decay={2} />
        </>
      )}
    </group>
  );
}

const GARDEN_ROWS = [
  { x: -0.09, plants: 3, kind: "sprout" },
  { x: 0, plants: 3, kind: "carrot" },
];

function Garden({ position = [-0.5, 0, -0.18], rotation = 0.55 }) {
  const night = useNightMode();
  const fencePosts = useMemo(() => {
    const out = [];
    for (let i = 0; i <= 4; i++) {
      const x = -0.18 + i * 0.09;
      out.push([x, -0.14], [x, 0.14]);
    }
    out.push([-0.18, 0], [0.18, 0]);
    return out;
  }, []);
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={1.2}>
      <mesh position={[0, 0.015, 0]} scale={[0.32, 0.03, 0.22]} receiveShadow castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={night ? NIGHT.soil : "#6b4a33"} roughness={1} />
      </mesh>
      {GARDEN_ROWS.map((row, ri) =>
        Array.from({ length: row.plants }).map((_, pi) => {
          const z = -0.06 + pi * 0.06;
          const key = `${ri}-${pi}`;
          if (row.kind === "carrot") {
            return (
              <group key={key} position={[row.x, 0.03, z]}>
                <mesh position={[0, 0.008, 0]}>
                  <sphereGeometry args={[0.014, 7, 5]} />
                  <meshStandardMaterial color={night ? NIGHT.carrot : "#f29a52"} roughness={0.7} />
                </mesh>
                {[0, 1, 2].map((li) => (
                  <mesh key={li} position={[0, 0.03, 0]} rotation={[0.35, (li / 3) * Math.PI * 2, 0]}>
                    <coneGeometry args={[0.008, 0.04, 4]} />
                    <meshStandardMaterial color={night ? NIGHT.moss : "#6fae5c"} roughness={0.9} flatShading />
                  </mesh>
                ))}
              </group>
            );
          }
          return (
            <group key={key} position={[row.x, 0.03, z]}>
              {[0, 1, 2].map((li) => {
                const a = (li / 3) * Math.PI * 2;
                return (
                  <mesh key={li} position={[Math.cos(a) * 0.01, 0.012, Math.sin(a) * 0.01]} rotation={[0.5, a, 0]} scale={[1, 0.5, 1]}>
                    <sphereGeometry args={[0.014, 6, 5]} />
                    <meshStandardMaterial color={night ? NIGHT.moss : "#5f9e6a"} roughness={0.9} />
                  </mesh>
                );
              })}
            </group>
          );
        }),
      )}
      {fencePosts.map(([fx, fz], i) => (
        <group key={i} position={[fx, 0, fz]}>
          <mesh position={[0, 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.012, 0.013, 0.08, 6]} />
            <meshStandardMaterial color={night ? NIGHT.fence : "#b98a5e"} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.082, 0]}>
            <sphereGeometry args={[0.012, 6, 5]} />
            <meshStandardMaterial color={night ? NIGHT.fenceTop : "#c99b6c"} roughness={0.9} />
          </mesh>
        </group>
      ))}
      {[-0.14, 0.14].map((z, i) => (
        <mesh key={i} position={[0, 0.055, z]} rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.012, 0.37, 0.008]} />
          <meshStandardMaterial color={night ? NIGHT.fence : "#a67a50"} roughness={0.95} />
        </mesh>
      ))}
      <group position={[0.24, 0, 0.08]}>
        <mesh position={[0, 0.025, 0]} castShadow>
          <cylinderGeometry args={[0.025, 0.02, 0.05, 10]} />
          <meshStandardMaterial color={night ? NIGHT.log : "#7fa7c9"} roughness={0.5} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.048, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.022, 10]} />
          <meshStandardMaterial color={night ? NIGHT.pond : "#9fdcff"} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
}

const SMOKE_PUFFS = Array.from({ length: 12 }).map((_, i) => ({ offset: i / 12 }));

function ChimneySmoke({ position = [-0.46, 0.56, -0.68] }) {
  const night = useNightMode();
  const refs = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.14;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const p = (t + SMOKE_PUFFS[i].offset) % 1;
      m.position.set(Math.sin(p * 5.2) * 0.03 * p + p * p * 0.1, p * 0.5, Math.cos(p * 4.1) * 0.015 * p);
      const s = 0.018 + p * 0.055;
      m.scale.set(s, s * 0.85, s);
      m.material.opacity = 0.22 * Math.sin(Math.min(p / 0.15, 1) * Math.PI * 0.5) * (1 - p) * (1 - p);
    });
  });
  return (
    <group position={position}>
      {SMOKE_PUFFS.map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshBasicMaterial color={night ? NIGHT.smoke : "#efece4"} transparent opacity={0.2} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Woodpile({ position = [0.02, 0, -0.42], rotation = 0.55 }) {
  const night = useNightMode();
  const logs = [
    { p: [-0.05, 0.018, 0], l: 0.16 },
    { p: [0.05, 0.018, 0.01], l: 0.15 },
    { p: [0, 0.018, -0.045], l: 0.14 },
    { p: [-0.025, 0.052, -0.01], l: 0.15 },
    { p: [0.03, 0.052, -0.02], l: 0.13 },
    { p: [0, 0.084, -0.015], l: 0.12 },
  ];
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {logs.map((log, i) => (
        <group key={i} position={log.p} rotation={[0, (i % 3) * 0.12 - 0.1, 0]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
            <cylinderGeometry args={[0.017, 0.017, log.l, 8]} />
            <meshStandardMaterial color={night ? NIGHT.log : i % 2 ? PALETTE.log : "#8b6340"} roughness={0.95} />
          </mesh>
          {[-1, 1].map((end) => (
            <mesh key={end} position={[(log.l / 2) * end, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.0175, 0.0175, 0.004, 8]} />
              <meshStandardMaterial color={night ? NIGHT.logEnd : "#e3c497"} roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0.16, 0.03, 0.04]} castShadow receiveShadow>
        <cylinderGeometry args={[0.045, 0.055, 0.06, 10]} />
        <meshStandardMaterial color={night ? NIGHT.bark : PALETTE.bark} roughness={0.95} />
      </mesh>
    </group>
  );
}

function BerryBush({ position, scale = 1, seed = 1 }) {
  const night = useNightMode();
  const berries = useMemo(
    () =>
      Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2 + seededRand(seed + i) * 2;
        const r = 0.12 + seededRand(seed + i * 3) * 0.05;
        return [Math.cos(a) * r, 0.1 + seededRand(seed + i * 5) * 0.09, Math.sin(a) * r];
      }),
    [seed],
  );
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.1, 0]} scale={[1, 0.8, 1]} castShadow receiveShadow>
        <icosahedronGeometry args={[0.16, 1]} />
        <meshStandardMaterial color={night ? NIGHT.pineLight : PALETTE.pineLight} roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.08, 0.07, 0.05]} scale={[1, 0.8, 1]} castShadow>
        <icosahedronGeometry args={[0.1, 1]} />
        <meshStandardMaterial color={night ? NIGHT.pine : PALETTE.pine} roughness={0.9} flatShading />
      </mesh>
      {berries.map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <sphereGeometry args={[0.024, 8, 6]} />
          <meshStandardMaterial color={night ? NIGHT.berry : PALETTE.berry} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

const BUSHES = [
  { position: [0.411, 0, -0.08], scale: 0.5, seed: 51 },
  { position: [-0.455, 0, 0.75], scale: 0.46, seed: 61 },
  { position: [0.518, 0, 0.35], scale: 0.55, seed: 5 },
  { position: [0.577, 0, 0.02], scale: 0.45, seed: 13 },
  { position: [-0.557, 0, 0.8], scale: 0.5, seed: 21 },
  { position: [0.25, 0, 1.5], scale: 0.42, seed: 29 },
  { position: [-0.503, 0, 1.55], scale: 0.48, seed: 37 },
];

function HoneyPot() {
  const night = useNightMode();
  return (
    <group position={[0.38, 0, 0.92]} rotation={[0, 0.4, 0]} scale={0.42}>
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.08, 14, 10]} />
        <meshStandardMaterial color={night ? NIGHT.honeyPot : "#d99554"} roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.03, 12]} />
        <meshStandardMaterial color={night ? NIGHT.honey : "#ffd25e"} roughness={0.3} />
      </mesh>
      <mesh position={[0.04, 0.12, 0.05]} scale={[0.6, 1.4, 0.6]}>
        <sphereGeometry args={[0.025, 8, 6]} />
        <meshStandardMaterial color={night ? NIGHT.honey : "#ffd25e"} roughness={0.3} />
      </mesh>
    </group>
  );
}

const STONES = [
  { position: [-0.237, 0.04, 0.35], scale: 0.07, rotation: 2.4 },
  { position: [0.36, 0.04, 1.3], scale: 0.08, rotation: 1.1 },
  { position: [-0.376, 0.04, 1.15], scale: 0.08, rotation: 0.6 },
  { position: [0.586, 0.04, 0.95], scale: 0.09, rotation: 2.1 },
  { position: [-0.63, 0.05, 0.15], scale: 0.11, rotation: 1.3 },
];

function Stones() {
  const night = useNightMode();
  return (
    <>
      {STONES.map((s, i) => (
        <group key={i} position={s.position} rotation={[0.1, s.rotation, 0.07]} scale={s.scale}>
          <mesh castShadow receiveShadow>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={night ? NIGHT.stone : PALETTE.stone} roughness={0.9} flatShading />
          </mesh>
          <mesh position={[0.03, 0.5, -0.04]} scale={[0.74, 0.2, 0.68]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={night ? NIGHT.moss : PALETTE.moss} roughness={1} />
          </mesh>
        </group>
      ))}
    </>
  );
}
const LILY_PADS = [
  { p: [-0.08, 0.04], r: 0.035, rot: 0.6, flower: false },
  { p: [0.09, -0.05], r: 0.028, rot: 2.2 },
  { p: [0.03, 0.09], r: 0.024, rot: 4.1 },
];

const SPARKLES = Array.from({ length: 6 }, (_, i) => ({
  x: (seededRand(i * 4.1 + 1) - 0.5) * 0.32,
  z: (seededRand(i * 6.3 + 2) - 0.5) * 0.22,
  p: seededRand(i * 8.7) * 6.28,
}));

function Pond() {
  const night = useNightMode();
  const sparkles = useRef(null);
  useFrame(({ clock }) => {
    if (!sparkles.current) return;
    const t = clock.getElapsedTime();
    sparkles.current.children.forEach((m, i) => {
      m.material.opacity = Math.max(0, Math.sin(t * 1.4 + SPARKLES[i].p)) * 0.9;
    });
  });
  return (
    <group position={[POND_CENTER[0], 0, POND_CENTER[1]]} rotation={[0, 0.3, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} scale={[1, 0.75, 1]} receiveShadow>
        <circleGeometry args={[0.27, 28]} />
        <meshStandardMaterial color={night ? NIGHT.pondEdge : PALETTE.pondEdge} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} scale={[1, 0.75, 1]}>
        <circleGeometry args={[0.23, 28]} />
        <meshStandardMaterial
          color={night ? NIGHT.pond : PALETTE.pond}
          emissive={night ? NIGHT.pond : "#000000"}
          emissiveIntensity={night ? 0.12 : 0}
          roughness={0.15}
          metalness={0.1}
        />
      </mesh>
      {LILY_PADS.map((l, i) => (
        <group key={i} position={[l.p[0], 0.009, l.p[1]]}>
          <mesh rotation={[-Math.PI / 2, 0, l.rot]}>
            <circleGeometry args={[l.r, 14, 0.4, Math.PI * 2 - 0.6]} />
            <meshStandardMaterial color={night ? NIGHT.lily : PALETTE.lily} roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
          {l.flower && (
            <mesh position={[0.005, 0.01, 0]}>
              <sphereGeometry args={[0.012, 8, 6]} />
              <meshStandardMaterial color={night ? NIGHT.petal : "#f7c3d3"} roughness={0.6} />
            </mesh>
          )}
        </group>
      ))}
      <group ref={sparkles}>
        {SPARKLES.map((s, i) => (
          <mesh key={i} position={[s.x, 0.01, s.z]} rotation={[-Math.PI / 2, 0, i]}>
            <planeGeometry args={[0.022, 0.008]} />
            <meshBasicMaterial color={night ? NIGHT.waterSparkle : "#ffffff"} transparent opacity={0} depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Firefly({ radius, speed, phase, height }) {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + phase;
    ref.current.position.set(Math.cos(t) * radius, height + Math.sin(t * 2.3) * 0.15, Math.sin(t * 0.9) * radius * 0.6 - 0.3);
    ref.current.material.opacity = 0.35 + Math.abs(Math.sin(t * 3.1)) * 0.6;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.018, 8, 6]} />
      <meshBasicMaterial color={NIGHT.firefly} transparent opacity={0.8} toneMapped={false} />
    </mesh>
  );
}

function Fireflies() {
  const flies = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        radius: 0.6 + seededRand(i * 3.3) * 1.4,
        speed: 0.2 + seededRand(i * 5.5) * 0.22,
        phase: seededRand(i * 7.7) * 8,
        height: 0.25 + seededRand(i * 9.1) * 0.75,
      })),
    [],
  );
  return (
    <>
      {flies.map((f, i) => (
        <Firefly key={i} {...f} />
      ))}
    </>
  );
}

function Campfire() {
  const night = useNightMode();
  const flames = useRef(null);
  const light = useRef(null);
  const embers = useRef(null);
  const time = useRef(0);
  useFrame((_, delta) => {
    time.current += Math.min(delta, 0.05);
    const t = time.current;
    if (light.current) light.current.intensity = 0.45 + Math.sin(t * 6) * 0.04 + Math.sin(t * 9.3) * 0.025;
    if (flames.current) {
      flames.current.children.forEach((flame, i) => {
        flame.scale.y = 1 + Math.sin(t * 5.5 + i * 2) * 0.15;
        flame.rotation.z = Math.sin(t * 3.8 + i) * 0.12;
      });
    }
    if (embers.current) {
      embers.current.children.forEach((ember, i) => {
        const p = (t * 0.28 + i / 5) % 1;
        ember.position.set(Math.sin(p * 5 + i * 2) * 0.04, 0.09 + p * 0.28, Math.cos(p * 4 + i) * 0.03);
        ember.scale.setScalar((1 - p) * 0.8);
        ember.material.opacity = (1 - p) * 0.7;
      });
    }
  });
  return (
    <group position={[0.3, 0, 0.64]}>
      {night && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]}>
          <circleGeometry args={[0.24, 28]} />
          <meshBasicMaterial color={NIGHT.glow} transparent opacity={0.1} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i * Math.PI) / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.095, 0.017, Math.sin(a) * 0.095]} scale={[1.2, 0.75, 1]} castShadow receiveShadow>
            <dodecahedronGeometry args={[0.029, 0]} />
            <meshStandardMaterial color={night ? NIGHT.stone : PALETTE.stone} roughness={1} />
          </mesh>
        );
      })}
      {[0.7, -0.7].map((angle, i) => (
        <mesh key={i} position={[0, 0.026 + i * 0.018, 0]} rotation={[Math.PI / 2, 0, angle]} castShadow>
          <cylinderGeometry args={[0.017, 0.021, 0.15, 7]} />
          <meshStandardMaterial color={night ? NIGHT.barkDark : PALETTE.charredWood} roughness={1} />
        </mesh>
      ))}
      <group ref={flames}>
        {[-0.028, 0, 0.03].map((x, i) => (
          <group key={i} position={[x, 0.05, i === 1 ? 0.008 : -0.01]}>
            <mesh position={[0, 0.035, 0]} scale={[1, 1.8, 0.8]}>
              <sphereGeometry args={[i === 1 ? 0.032 : 0.023, 7, 6]} />
              <meshBasicMaterial color={PALETTE.flame} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.018, 0.012]} scale={[0.65, 1.3, 0.6]}>
              <sphereGeometry args={[0.024, 7, 6]} />
              <meshBasicMaterial color={PALETTE.flameCore} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
      <group ref={embers}>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.004, 4, 4]} />
            <meshBasicMaterial color={PALETTE.ember} transparent depthWrite={false} toneMapped={false} />
          </mesh>
        ))}
      </group>
      <pointLight ref={light} position={[0, 0.19, 0]} color={PALETTE.flame} intensity={0.9} distance={1.6} decay={2} />
    </group>
  );
}
function FluffyTree({ position, height, seed = 1 }) {
  const night = useNightMode();
  const ref = useRef(null);
  const phase = useMemo(() => seededRand(seed) * 8, [seed]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.4 + phase) * 0.02;
  });
  const puffs = useMemo(() => {
    const s = height / 0.5;
    const colors = night ? NIGHT : PALETTE;
    const accent = seededRand(seed * 7) > 0.6 ? colors.pineAccent : colors.pineLight;
    const cols = [colors.pineDeep, colors.pine, accent];
    return [
      [0, 0.62, 0, 0.18, 1],
      [0.12, 0.55, 0.03, 0.14, 2],
      [-0.12, 0.56, 0.02, 0.14, 0],
      [0.02, 0.8, -0.02, 0.14, 2],
      [-0.05, 0.5, 0.1, 0.12, 1],
      [0.08, 0.7, 0.09, 0.11, 2],
      [-0.09, 0.72, -0.07, 0.12, 0],
    ].map(([x, y, z, r, c], i) => ({
      p: [x * s * 0.75, height * (0.78 + (y - 0.5) * 1.1), z * s * 0.75],
      r: r * s * 0.85 * (0.9 + seededRand(seed * 3 + i) * 0.2),
      color: cols[c],
    }));
  }, [height, seed, night]);
  return (
    <group position={position} ref={ref}>
      <mesh position={[0, height * 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.02, 0.034, height * 0.8, 8]} />
        <meshStandardMaterial color={night ? NIGHT.bark : PALETTE.bark} roughness={0.95} />
      </mesh>
      {puffs.map((f, i) => (
        <mesh key={i} position={f.p} castShadow>
          <icosahedronGeometry args={[f.r, 1]} />
          <meshStandardMaterial color={f.color} roughness={0.85} flatShading />
        </mesh>
      ))}
    </group>
  );
}

const BACK_TREES = [
  { position: [-1.3, 0, -1.45], height: 0.58, seed: 51 },
  { position: [-0.85, 0, -1.6], height: 0.64, seed: 57 },
  { position: [0.0, 0, -1.55], height: 0.6, seed: 61 },
  { position: [0.8, 0, -1.5], height: 0.66, seed: 67 },
  { position: [1.25, 0, -1.2], height: 0.56, seed: 71 },
  { position: [-1.4, 0, -0.75], height: 0.52, seed: 77 },
  { position: [1.2, 0, -0.45], height: 0.5, seed: 83 },
];

function useNormalizedModel(model, size) {
  const gltf = useGLTF(model);
  return useMemo(() => {
    const clone = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const dim = box.getSize(new THREE.Vector3());
    const scale = size / (dim.y || 1);
    const center = box.getCenter(new THREE.Vector3());
    clone.scale.setScalar(scale);
    clone.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => {
          if ("roughness" in m) m.roughness = 1;
          if ("metalness" in m) m.metalness = 0;
          if ("clearcoat" in m) m.clearcoat = 0;
          if ("specularIntensity" in m) m.specularIntensity = 0;
          m.needsUpdate = true;
        });
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

function House({ model }) {
  const night = useNightMode();
  const normalizedModel = useNormalizedModel(model, 0.55);
  const materials = useMemo(() => {
    const entries = [];
    normalizedModel.traverse((object) => {
      if (!object.isMesh) return;
      const original = Array.isArray(object.material) ? object.material : [object.material];
      const copies = original.map((source) => {
        const material = source.clone();
        const base = material.color?.clone();
        const emissive = material.emissive?.clone();
        const hsl = base ? base.getHSL({ h: 0, s: 0, l: 0 }) : null;
        const name = source.name.toLowerCase();
        const role = /window|glass|light/.test(name) ? "houseWindow"
          : /roof|leaf|moss|grass/.test(name) || (hsl && hsl.h > 0.16 && hsl.h < 0.48 && hsl.s > 0.15) ? "houseRoof"
            : /wood|door|beam|trunk/.test(name) || (hsl && hsl.l < 0.48) ? "houseWood"
              : "houseWall";
        entries.push({ material, base, emissive, intensity: source.emissiveIntensity, role });
        return material;
      });
      object.material = Array.isArray(object.material) ? copies : copies[0];
    });
    return entries;
  }, [normalizedModel]);
  useLayoutEffect(() => {

    const moonTint = new THREE.Color("#c3cdf0");
    const windowGlow = new THREE.Color(NIGHT.houseWindow);
    materials.forEach(({ material, base, emissive, intensity, role }) => {
      const isWindow = role === "houseWindow";
      if (base) {
        if (!night) material.color.copy(base);
        else if (isWindow) material.color.copy(windowGlow);
        else material.color.copy(base).multiply(moonTint);
      }
      if (emissive) {
        material.emissive.copy(night && isWindow ? windowGlow : emissive);
        material.emissiveIntensity = night && isWindow ? 0.55 : intensity;
      }
    });
  }, [materials, night]);
  return (
    <group position={[-0.4, 0, -0.62]} rotation={[0, 0.55, 0]}>
      <primitive object={normalizedModel} />
      {night && <pointLight position={[0.05, 0.12, 0.34]} color={NIGHT.lantern} intensity={0.08} distance={0.6} decay={2} />}
    </group>
  );
}

function Bear({ model, position = BEAR_POSITION, inline: InlineAnimation = null, variant }) {
  const group = useRef(null);
  const frame = useRef(null);
  const { camera, gl } = useThree();
  const body = useRef(null);
  const nextGlance = useRef(1 + Math.random() * 2);
  const glance = useRef(0);
  const nextHop = useRef(3 + Math.random() * 3);
  const hopStart = useRef(-1);
  const hopCount = useRef(2);
  const normalizedModel = useNormalizedModel(model, BEAR_HEIGHT);

  const anchorPoints = useMemo(() => {
    const { offset, scale, box } = normalizedModel.userData.placement;
    const x = position[0] + offset[0] + ((box.min.x + box.max.x) / 2) * scale;
    const z = position[1] + offset[2] + ((box.min.z + box.max.z) / 2) * scale;
    return {
      top: new THREE.Vector3(x, offset[1] + box.max.y * scale + BUBBLE_LIFT, z),
      bottom: new THREE.Vector3(x, offset[1] + box.min.y * scale, z),
      topWorld: new THREE.Vector3(),
      bottomWorld: new THREE.Vector3(),
    };
  }, [normalizedModel, position]);

  useLayoutEffect(() => {
    if (group.current) group.current.rotation.y = 0;
  }, [normalizedModel]);

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
      nextGlance.current = t + 2.2 + Math.random() * 2.5;
      glance.current = (Math.random() - 0.5) * 0.35;
    }
    group.current.rotation.y += (glance.current - group.current.rotation.y) * 0.035;

    let y = Math.sin(t * 1.1) * 0.008;
    let squash = 1 + Math.sin(t * 1.8) * 0.016;

    if (hopStart.current < 0 && t > nextHop.current) {
      hopStart.current = t;
      hopCount.current = 2 + Math.floor(Math.random() * 2);
    }
    if (hopStart.current >= 0) {
      const HOP = 0.42;
      const e = t - hopStart.current;
      if (e > HOP * hopCount.current) {
        hopStart.current = -1;
        nextHop.current = t + 3.5 + Math.random() * 4;
      } else {
        const p = (e % HOP) / HOP;
        const arc = Math.sin(p * Math.PI);
        y += arc * BEAR_HEIGHT * 0.16;
        squash *= p < 0.15 ? 0.94 : 1 + arc * 0.06;
        group.current.rotation.z = Math.sin(p * Math.PI * 2) * 0.03;
      }
    } else {
      group.current.rotation.z *= 0.9;
    }

    group.current.position.y = y;
    if (body.current) {
      body.current.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    }
  });

  if (InlineAnimation) {
    const { offset, scale } = normalizedModel.userData.placement;
    return (
      <group ref={frame}>
        <InlineAnimation
          placement={{ homePosition: position, offset, scale, yaw: 0, lean: INLINE_LEAN }}
          idleModelPath={model}
          variant={variant}
        />
      </group>
    );
  }

  return (
    <group ref={frame}>
      <group ref={group} position={[position[0], 0, position[1]]}>
        <group ref={body}>
          <primitive object={normalizedModel} />
        </group>
      </group>
    </group>
  );
}

function BearSlot({ model }) {
  const mood = useMoodAnimation();
  const canInline = model === BEAR_MODEL;
  const Inline = mood.active && canInline ? INLINE_MOODS[mood.mood] || null : null;
  if (mood.active && !Inline) return null;
  return (
    <BearErrorBoundary position={BEAR_POSITION}>
      <Bear
        key={Inline ? `${mood.mood}-${mood.variant || ""}` : "idle"}
        model={model}
        position={BEAR_POSITION}
        inline={Inline}
        variant={mood.variant}
      />
    </BearErrorBoundary>
  );
}

class BearErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("Bear model failed to load:", error);
  }
  render() {
    if (this.state.failed) return <Bear model={DEFAULT_MODEL} position={this.props.position} />;
    return this.props.children;
  }
}

const ISO_DISTANCE = 4.4;
const ISO_ELEVATION = Math.atan(1 / Math.sqrt(2)) - 0.05;
const ISO_ZOOM = 320;
const ISO_POSITION = [0, ISO_DISTANCE * Math.sin(ISO_ELEVATION), ISO_DISTANCE * Math.cos(ISO_ELEVATION)];

function YellowStars() {
  const group = useRef(null);
  const shape = useMemo(() => {
    const outline = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const angle = Math.PI / 2 + i * Math.PI / 5;
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
      mesh.scale.setScalar(star.radius * halfHeight * 2 / size.height);
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

const BearHabitat3D = ({ characterModel, showCharacter = true, houseModel, useHouse = true }) => {
  const night = useNightMode();
  const house = useHouse ? houseModel ?? HOUSE_MODEL : null;
  const bearModel = characterModel ?? BEAR_MODEL;

  useEffect(() => {
    if (house) useGLTF.preload(house);
  }, [house]);

  useEffect(() => {
    if (bearModel) useGLTF.preload(bearModel);
    if (bearModel === BEAR_MODEL) BEAR_MOOD_MODELS.forEach((url) => useGLTF.preload(url));
  }, [bearModel]);

  useEffect(() => {
    if (!showCharacter || bearModel !== BEAR_MODEL) return undefined;
    window.__habitatInline = { animal: "bear", moods: Object.keys(INLINE_MOODS) };
    window.dispatchEvent(new CustomEvent("habitat-inline", { detail: window.__habitatInline }));
    return () => {
      window.__habitatInline = null;
      window.__moodAnchor = null;
      window.dispatchEvent(new CustomEvent("habitat-inline", { detail: null }));
    };
  }, [showCharacter, bearModel]);

  return (
    <div className="habitat-canvas-wrap habitat-canvas-wrap--no-touch-scroll">
      <Canvas
        shadows="soft"
        orthographic
        camera={{ position: ISO_POSITION, zoom: ISO_ZOOM, near: 0.1, far: 60 }}
        gl={{ toneMappingExposure: night ? 1.0 : 1.15 }}
        dpr={[1, 2]}
        style={{ touchAction: "none" }}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = "none";
        }}
      >
        <color attach="background" args={[night ? NIGHT.background : PALETTE.background]} />
        <fog attach="fog" args={[night ? NIGHT.fog : PALETTE.fog, 8, 20]} />

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
        <directionalLight position={[-5, 3, -4]} intensity={night ? NIGHT.rim : 0.6} color={night ? NIGHT.rimColor : PALETTE.rim} />
        <hemisphereLight args={[night ? NIGHT.hemiSky : PALETTE.hemiSky, night ? NIGHT.hemiGround : PALETTE.hemiGround, night ? NIGHT.hemiI : 0.95]} />
        {night && <YellowStars />}

        <Suspense fallback={null}>
          <group position={[0, -0.18, 0]}>
            <Ground />
            {[...PINES, ...BACK_TREES].map((p, i) => (
              <FluffyTree key={`p${i}`} {...p} />
            ))}
            {house ? (
              <Suspense fallback={<LogCabin />}>
                <House model={house} />
              </Suspense>
            ) : (
              <LogCabin />
            )}
            {BUSHES.map((b, i) => (
              <BerryBush key={`b${i}`} {...b} />
            ))}
            <HoneyPot />
            <Pond />
            <SteppingStones />
            {LANTERNS.map((l, i) => (
              <LanternPost key={`ln${i}`} {...l} />
            ))}
            <Garden />
            <Woodpile />
            {house ? <ChimneySmoke /> : null}
            <Stones />
            {night && <Fireflies />}
            {night && <Campfire />}
            {night && (
              <pointLight
                position={[BEAR_POSITION[0] - 0.05, 0.5, BEAR_POSITION[1] + 0.25]}
                color={NIGHT.bearLight}
                intensity={0.2}
                distance={0.9}
                decay={2}
              />
            )}
            {showCharacter && <BearSlot model={bearModel} />}
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default BearHabitat3D;