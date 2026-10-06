import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import "../../styling/components/habitats.css";
import { DEFAULT_MODEL } from "../../constants/avatars";
import { seededRand, drawWrapped } from "./habitatUtils";

function HideWhenAnimated({ children }) {
  const [hidden, setHidden] = React.useState(() => typeof window !== "undefined" && !!window.__moodAnimationActive);
  React.useEffect(() => {
    const onChange = (e) => setHidden(!!e.detail?.active);
    window.addEventListener("mood-animation", onChange);
    return () => window.removeEventListener("mood-animation", onChange);
  }, []);
  return hidden ? null : children;
}


const BEAR_MODEL = "/models/characters/bear/bear.glb";
const HOUSE_MODEL = "/models/habitats/house.glb";

const BEAR_HEIGHT = 0.32;
const BEAR_POSITION = [0.02, 0.72];

const PALETTE = {
  background: "#9ccbe0",
  fog: "#cfe8ee",
  sun: "#fff1d6",
  rim: "#a8d8cc",
  hemiSky: "#ffffff",
  hemiGround: "#5f8a6e",
  groundBase: "hsl(115, 38%, 50%)",
  pine: "#2f6b56",
  pineLight: "#3f8a6a",
  pineDeep: "#255545",
  bark: "#7a5136",
  barkDark: "#5c3b27",
  log: "#9a6f47",
  stone: "#8f95a0",
  moss: "#6da776",
  berry: "#cf3f63",
  lantern: "#ffcf6e",
  petal: ["#f6efe0", "#f2c9d4", "#f7dfa0", "#e8ecfa"],
  mushroomCap: "#d95f4b",
};

const TEX = 512;

function buildForestFloorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = TEX;
  canvas.height = TEX;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = PALETTE.groundBase;
  ctx.fillRect(0, 0, TEX, TEX);

  for (let i = 0; i < 44; i++) {
    const seed = i * 61 + 3;
    const bx = (seed * 37) % TEX;
    const by = (seed * 53) % TEX;
    const radius = 46 + (seed % 5) * 22;
    const hue = 132 + (seed % 8) * 5;
    const light = 38 + (seed % 6) * 6;
    drawWrapped(ctx, bx, by, TEX, radius, (x, y) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, `hsla(${hue}, 34%, ${light}%, 0.55)`);
      g.addColorStop(1, `hsla(${hue}, 34%, ${light}%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  for (let i = 0; i < 560; i++) {
    const seed = i * 17 + 9;
    const bx = (seed * 31) % TEX;
    const by = (seed * 47) % TEX;
    ctx.fillStyle = `hsla(${128 + (seed % 10) * 4}, 36%, ${34 + (seed % 8) * 5}%, 0.5)`;
    drawWrapped(ctx, bx, by, TEX, 6, (x, y) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((seed % 12) * 0.26);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.2, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  for (let i = 0; i < 200; i++) {
    const seed = i * 71 + 5;
    const bx = (seed * 17) % TEX;
    const by = (seed * 41) % TEX;
    drawWrapped(ctx, bx, by, TEX, 10, (x, y) => {
      ctx.strokeStyle = i % 4 === 0 ? "rgba(214,158,86,0.5)" : "rgba(52,96,74,0.6)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 8 - (seed % 16), y + 5 - (seed % 10));
      ctx.stroke();
    });
  }

  const petalCols = ["rgba(246,239,224,0.85)", "rgba(242,201,212,0.8)", "rgba(247,223,160,0.8)"];
  for (let i = 0; i < 90; i++) {
    const seed = i * 29 + 13;
    const bx = (seed * 23) % TEX;
    const by = (seed * 59) % TEX;
    drawWrapped(ctx, bx, by, TEX, 4, (x, y) => {
      ctx.fillStyle = petalCols[i % 3];
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
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
  const tex = useMemo(() => buildForestFloorTexture(), []);
  useEffect(() => {
    tex.repeat.set(GROUND_SIZE / 2.4, GROUND_SIZE / 2.4);
  }, [tex]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      <meshStandardMaterial map={tex} />
    </mesh>
  );
}

function Pine({ position, height, seed = 1 }) {
  const ref = useRef(null);
  const phase = useMemo(() => seededRand(seed) * 8, [seed]);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.4 + phase) * 0.02;
  });
  const tiers = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, i) => ({
        y: height * (0.32 + i * 0.19),
        radius: 0.16 * (1 - i * 0.2) * (height / 0.5),
        h: height * 0.34,
        color: i % 2 ? PALETTE.pine : PALETTE.pineLight,
      })),
    [height],
  );
  return (
    <group position={position} ref={ref}>
      <mesh position={[0, height * 0.17, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.016, 0.026, height * 0.36, 8]} />
        <meshStandardMaterial color={PALETTE.bark} roughness={0.95} />
      </mesh>
      {tiers.map((t, i) => (
        <mesh key={i} position={[0, t.y, 0]} castShadow>
          <coneGeometry args={[t.radius, t.h, 9]} />
          <meshStandardMaterial color={t.color} roughness={0.85} flatShading />
        </mesh>
      ))}
      <mesh position={[0, height * 1.02, 0]} castShadow>
        <coneGeometry args={[0.035, height * 0.24, 8]} />
        <meshStandardMaterial color={PALETTE.pineDeep} roughness={0.85} flatShading />
      </mesh>
    </group>
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
          <meshStandardMaterial color={i % 2 ? PALETTE.log : "#8b6340"} roughness={0.95} />
        </mesh>
      ))}
      <mesh position={[0, 0.62, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[0.62, 0.34, 4]} />
        <meshStandardMaterial color="#4b6b5c" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0, 0.19, 0.31]}>
        <planeGeometry args={[0.24, 0.36]} />
        <meshBasicMaterial color="#2a1c13" />
      </mesh>
      <mesh ref={glow} position={[0, 0.2, 0.315]}>
        <planeGeometry args={[0.2, 0.3]} />
        <meshBasicMaterial color={PALETTE.lantern} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0.3, 0.5, 0.28]}>
        <sphereGeometry args={[0.05, 10, 8]} />
        <meshBasicMaterial color={PALETTE.lantern} />
      </mesh>
      <pointLight position={[0.3, 0.5, 0.3]} intensity={0.5} distance={1.6} color={PALETTE.lantern} />
    </group>
  );
}

const TUFTS = (() => {
  const out = [];
  for (let i = 0; i < 150; i++) {
    const seed = i * 37 + 11;
    const x = (seededRand(seed) - 0.5) * 4.6;
    const z = -1.7 + seededRand(seed * 1.9) * 4.3;
    if (Math.hypot(x - BEAR_POSITION[0], z - BEAR_POSITION[1]) < 0.3) continue;
    if (Math.hypot(x + 0.55, z + 0.45) < 0.55) continue;
    out.push({ position: [x, 0, z], rotation: seededRand(seed * 2.7) * Math.PI, scale: 0.5 + seededRand(seed * 3.3) * 0.4 });
  }
  return out;
})();

const FLOWERS = (() => {
  const out = [];
  for (let i = 0; i < 26; i++) {
    const seed = i * 53 + 7;
    const x = (seededRand(seed) - 0.5) * 4.2;
    const z = -1.4 + seededRand(seed * 2.1) * 4.0;
    if (Math.hypot(x - BEAR_POSITION[0], z - BEAR_POSITION[1]) < 0.32) continue;
    if (Math.hypot(x + 0.55, z + 0.45) < 0.5) continue;
    out.push({
      position: [x, 0, z],
      rotation: seededRand(seed * 3.7) * Math.PI,
      scale: 0.7 + seededRand(seed * 4.3) * 0.5,
      color: PALETTE.petal[i % PALETTE.petal.length],
    });
  }
  return out;
})();

function Flower({ position, rotation, scale, color }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.022, 0.018, Math.sin(a) * 0.022]} rotation={[0.5, a, 0]}>
            <sphereGeometry args={[0.018, 6, 5]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.024, 0]}>
        <sphereGeometry args={[0.013, 6, 5]} />
        <meshStandardMaterial color={PALETTE.lantern} roughness={0.5} />
      </mesh>
    </group>
  );
}

const MUSHROOMS = [
  { position: [-0.62, 0, -0.62], scale: 1, rotation: 0.4 },
  { position: [0.66, 0, -0.42], scale: 0.8, rotation: 2.1 },
  { position: [0.52, 0, -0.75], scale: 1.15, rotation: 1.2 },
  { position: [-0.72, 0, 0.5], scale: 0.75, rotation: 2.9 },
  { position: [-0.28, 0, 1.85], scale: 0.9, rotation: 0.8 },
];

function Mushroom({ position, scale = 1, rotation = 0 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 0.035, 0]} castShadow>
        <cylinderGeometry args={[0.016, 0.022, 0.07, 8]} />
        <meshStandardMaterial color="#efe6d2" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.085, 0]} castShadow>
        <sphereGeometry args={[0.042, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={PALETTE.mushroomCap} roughness={0.55} />
      </mesh>
      {[
        [0.02, 0.108, 0.008],
        [-0.016, 0.104, -0.014],
        [0.002, 0.118, -0.02],
      ].map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.006, 6, 5]} />
          <meshStandardMaterial color="#f6efe0" roughness={0.6} />
        </mesh>
      ))}
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
  return (
    <>
      {PATH_STONES.map((s, i) => (
        <mesh key={i} position={s.position} rotation={[0, s.rotation, 0]} scale={s.scale} receiveShadow castShadow>
          <cylinderGeometry args={[1, 1.1, 1, 9]} />
          <meshStandardMaterial color="#9aa0ab" roughness={0.95} />
        </mesh>
      ))}
    </>
  );
}

const GARDEN_ROWS = [
  { x: -0.09, plants: 3, kind: "sprout" },
  { x: 0, plants: 3, kind: "carrot" },
  { x: 0.09, plants: 3, kind: "flower" },
];

function Garden({ position = [-0.5, 0, -0.18], rotation = 0.55 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.015, 0]} scale={[0.32, 0.03, 0.22]} receiveShadow castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#5c4230" roughness={1} />
      </mesh>
      {GARDEN_ROWS.map((row, ri) =>
        Array.from({ length: row.plants }).map((_, pi) => {
          const z = -0.06 + pi * 0.06;
          const key = `${ri}-${pi}`;
          if (row.kind === "carrot") {
            return (
              <group key={key} position={[row.x, 0, z]}>
                <mesh position={[0, 0.035, 0]}>
                  <coneGeometry args={[0.016, 0.05, 6]} />
                  <meshStandardMaterial color="#e8935a" roughness={0.7} />
                </mesh>
                <mesh position={[0, 0.068, 0]}>
                  <coneGeometry args={[0.014, 0.03, 4]} />
                  <meshStandardMaterial color="#5f9e6a" roughness={0.9} flatShading />
                </mesh>
              </group>
            );
          }
          if (row.kind === "flower") {
            return (
              <group key={key} position={[row.x, 0, z]}>
                <mesh position={[0, 0.032, 0]}>
                  <sphereGeometry args={[0.02, 6, 5]} />
                  <meshStandardMaterial color={PALETTE.petal[(ri + pi) % PALETTE.petal.length]} roughness={0.6} />
                </mesh>
                <mesh position={[0, 0.04, 0]}>
                  <sphereGeometry args={[0.009, 6, 5]} />
                  <meshStandardMaterial color={PALETTE.lantern} roughness={0.5} />
                </mesh>
              </group>
            );
          }
          return (
            <group key={key} position={[row.x, 0, z]}>
              {[0, 1, 2].map((li) => {
                const a = (li / 3) * Math.PI * 2;
                return (
                  <mesh key={li} position={[Math.cos(a) * 0.012, 0.03, Math.sin(a) * 0.012]} rotation={[0.3, a, 0]}>
                    <coneGeometry args={[0.009, 0.05, 3]} />
                    <meshStandardMaterial color="#67a674" roughness={0.9} side={THREE.DoubleSide} />
                  </mesh>
                );
              })}
            </group>
          );
        }),
      )}
      {[
        [-0.18, -0.13],
        [0, -0.14],
        [0.18, -0.13],
        [-0.18, 0.13],
        [0, 0.14],
        [0.18, 0.13],
      ].map(([fx, fz], i) => (
        <mesh key={i} position={[fx, 0.03, fz]} castShadow>
          <cylinderGeometry args={[0.008, 0.01, 0.06, 5]} />
          <meshStandardMaterial color={PALETTE.bark} roughness={0.95} />
        </mesh>
      ))}
      {[
        { z: -0.135, r: 0 },
        { z: 0.135, r: 0 },
      ].map((rail, i) => (
        <mesh key={i} position={[0, 0.045, rail.z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.005, 0.38, 5]} />
          <meshStandardMaterial color={PALETTE.barkDark} roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

const SMOKE_PUFFS = Array.from({ length: 12 }).map((_, i) => ({ offset: i / 12 }));

function ChimneySmoke({ position = [-0.46, 0.56, -0.68] }) {
  const refs = useRef([]);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * 0.14;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const p = (t + SMOKE_PUFFS[i].offset) % 1;
      m.position.set(
        Math.sin(p * 5.2) * 0.03 * p + p * p * 0.1,
        p * 0.5,
        Math.cos(p * 4.1) * 0.015 * p,
      );
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
          <meshBasicMaterial color="#efece4" transparent opacity={0.2} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

function Woodpile({ position = [0.02, 0, -0.42], rotation = 0.55 }) {
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
            <meshStandardMaterial color={i % 2 ? PALETTE.log : "#8b6340"} roughness={0.95} />
          </mesh>
          {[-1, 1].map((end) => (
            <mesh key={end} position={[(log.l / 2) * end, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.0175, 0.0175, 0.004, 8]} />
              <meshStandardMaterial color="#d8b98a" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0.16, 0.03, 0.04]} castShadow receiveShadow>
        <cylinderGeometry args={[0.045, 0.055, 0.06, 10]} />
        <meshStandardMaterial color={PALETTE.bark} roughness={0.95} />
      </mesh>
    </group>
  );
}

function Tuft({ position, rotation, scale }) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.02, 0.045, Math.sin(a) * 0.02]} rotation={[0.32, a, 0]}>
            <coneGeometry args={[0.011, 0.075, 3]} />
            <meshStandardMaterial color={i % 2 ? "#4e8c62" : "#67a674"} roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
}

function BerryBush({ position, scale = 1, seed = 1 }) {
  const berries = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const a = (i / 7) * Math.PI * 2 + seededRand(seed + i) * 2;
        const r = 0.1 + seededRand(seed + i * 3) * 0.06;
        return [Math.cos(a) * r, 0.1 + seededRand(seed + i * 5) * 0.09, Math.sin(a) * r];
      }),
    [seed],
  );
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.1, 0]} scale={[1, 0.8, 1]} castShadow receiveShadow>
        <icosahedronGeometry args={[0.16, 1]} />
        <meshStandardMaterial color={PALETTE.pineLight} roughness={0.9} flatShading />
      </mesh>
      {berries.map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <sphereGeometry args={[0.022, 8, 6]} />
          <meshStandardMaterial color={PALETTE.berry} roughness={0.4} />
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
  { position: [0.349, 0, 1.45], scale: 0.42, seed: 29 },
  { position: [-0.503, 0, 1.55], scale: 0.48, seed: 37 },
];

function HoneyPot() {
  return (
    <group position={[0.38, 0, 0.92]} rotation={[0, 0.4, 0]} scale={0.42}>
      <mesh position={[0, 0.07, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.08, 14, 10]} />
        <meshStandardMaterial color="#c98a54" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.03, 12]} />
        <meshStandardMaterial color="#f2c766" roughness={0.4} />
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
  return (
    <>
      {STONES.map((s, i) => (
        <group key={i} position={s.position} rotation={[0.1, s.rotation, 0.07]} scale={s.scale}>
          <mesh castShadow receiveShadow>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={PALETTE.stone} roughness={0.9} />
          </mesh>
          <mesh position={[0.03, 0.5, -0.04]} scale={[0.74, 0.2, 0.68]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={PALETTE.moss} roughness={1} />
          </mesh>
        </group>
      ))}
    </>
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
      <meshBasicMaterial color={PALETTE.lantern} transparent opacity={0.8} />
    </mesh>
  );
}

function Fireflies() {
  const flies = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
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
      }
    });
    const wrapper = new THREE.Group();
    wrapper.add(clone);
    return wrapper;
  }, [gltf.scene, size]);
}

function House({ model }) {
  const normalizedModel = useNormalizedModel(model, 0.55);
  return (
    <group position={[-0.4, 0, -0.62]} rotation={[0, 0.55, 0]}>
      <primitive object={normalizedModel} />
    </group>
  );
}

function Bear({ model, position = BEAR_POSITION }) {
  const group = useRef(null);
  const body = useRef(null);
  const nextGlance = useRef(1 + Math.random() * 2);
  const glance = useRef(0);
  const nextHop = useRef(3 + Math.random() * 3);
  const hopStart = useRef(-1);
  const hopCount = useRef(2);
  const normalizedModel = useNormalizedModel(model, BEAR_HEIGHT);

  useLayoutEffect(() => {
    if (group.current) group.current.rotation.y = 0;
  }, [normalizedModel]);

  useFrame(({ clock }) => {
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

  return (
    <group ref={group} position={[position[0], 0, position[1]]}>
      <group ref={body}>
        <primitive object={normalizedModel} />
      </group>
    </group>
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
const ISO_POSITION = [
  0,
  ISO_DISTANCE * Math.sin(ISO_ELEVATION),
  ISO_DISTANCE * Math.cos(ISO_ELEVATION),
];

const BearHabitat3D = ({ characterModel, showCharacter = true, houseModel, useHouse = true }) => {
  const house = useHouse ? (houseModel ?? HOUSE_MODEL) : null;
  const bearModel = characterModel ?? BEAR_MODEL;

  useEffect(() => {
    if (house) useGLTF.preload(house);
  }, [house]);

  useEffect(() => {
    if (bearModel) useGLTF.preload(bearModel);
  }, [bearModel]);

  return (
    <div className="habitat-canvas-wrap habitat-canvas-wrap--no-touch-scroll">
      <Canvas
        shadows
        orthographic
        camera={{ position: ISO_POSITION, zoom: ISO_ZOOM, near: 0.1, far: 60 }}
        gl={{ toneMappingExposure: 1.2 }}
        dpr={[1, 2]}
        style={{ touchAction: "none" }}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = "none";
        }}
      >
        <color attach="background" args={[PALETTE.background]} />
        <fog attach="fog" args={[PALETTE.fog, 8, 20]} />

        <ambientLight intensity={0.85} color="#f3ecdc" />
        <directionalLight
          position={[5, 8, 3]}
          intensity={2.1}
          color={PALETTE.sun}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        <directionalLight position={[-5, 3, -4]} intensity={0.6} color={PALETTE.rim} />
        <hemisphereLight args={[PALETTE.hemiSky, PALETTE.hemiGround, 0.95]} />

        <Suspense fallback={null}>
          <group position={[0, -0.18, 0]}>
            <Ground />
            {PINES.map((p, i) => (
              <Pine key={`p${i}`} {...p} />
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
            {TUFTS.map((t, i) => (
              <Tuft key={`tf${i}`} {...t} />
            ))}
            {FLOWERS.map((f, i) => (
              <Flower key={`fl${i}`} {...f} />
            ))}
            {MUSHROOMS.map((m, i) => (
              <Mushroom key={`mu${i}`} {...m} />
            ))}
            <SteppingStones />
            <Garden />
            <Woodpile />
            {house ? <ChimneySmoke /> : null}
            <Stones />
            <Fireflies />
            {showCharacter && (
              <HideWhenAnimated><BearErrorBoundary position={BEAR_POSITION}>
                <Bear model={bearModel} position={BEAR_POSITION} />
              </BearErrorBoundary></HideWhenAnimated>
            )}
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default BearHabitat3D;