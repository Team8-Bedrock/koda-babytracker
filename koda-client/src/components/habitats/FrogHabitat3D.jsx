import React, { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import "../../styling/components/habitats.css";
import { DEFAULT_MODEL } from "../../constants/avatars";
import { useGroundedOffset, seededRand, drawWrapped } from "./habitatUtils";

function HideWhenAnimated({ children }) {
  const [hidden, setHidden] = React.useState(() => typeof window !== "undefined" && !!window.__moodAnimationActive);
  React.useEffect(() => {
    const onChange = (e) => setHidden(!!e.detail?.active);
    window.addEventListener("mood-animation", onChange);
    return () => window.removeEventListener("mood-animation", onChange);
  }, []);
  return hidden ? null : children;
}


const GRASS_TEX_SIZE = 512;
function buildShoreTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = GRASS_TEX_SIZE;
  canvas.height = GRASS_TEX_SIZE;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "hsl(100, 38%, 51%)";
  ctx.fillRect(0, 0, GRASS_TEX_SIZE, GRASS_TEX_SIZE);

  for (let i = 0; i < 45; i++) {
    const seed = i * 61 + 3;
    const bx = (seed * 37) % GRASS_TEX_SIZE;
    const by = (seed * 53) % GRASS_TEX_SIZE;
    const radius = 45 + (seed % 5) * 20;
    const hue = 96 + (seed % 9) * 2.5;
    const light = 43 + (seed % 6) * 3;
    drawWrapped(ctx, bx, by, GRASS_TEX_SIZE, radius, (x, y) => {
      const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
      grad.addColorStop(0, `hsla(${hue}, 46%, ${light}%, 0.55)`);
      grad.addColorStop(1, `hsla(${hue}, 46%, ${light}%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  for (let i = 0; i < 950; i++) {
    const seed = i * 17 + 9;
    const bx = (seed * 31) % GRASS_TEX_SIZE;
    const by = (seed * 47) % GRASS_TEX_SIZE;
    const hue = 100 + (seed % 10) * 2;
    const light = 36 + (seed % 8) * 3;
    ctx.fillStyle = `hsla(${hue}, 48%, ${light}%, 0.5)`;
    drawWrapped(ctx, bx, by, GRASS_TEX_SIZE, 6, (x, y) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((seed % 12) * 0.26);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.3, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  for (let i = 0; i < 36; i++) {
    const seed = i * 97 + 11;
    const cx = (seed * 13) % GRASS_TEX_SIZE;
    const cy = (seed * 29) % GRASS_TEX_SIZE;
    drawWrapped(ctx, cx, cy, GRASS_TEX_SIZE, 6, (x, y) => {
      ctx.fillStyle = "hsl(118, 38%, 38%)";
      for (let l = 0; l < 3; l++) {
        const a = (l / 3) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4, 2.6, 1.9, a, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  for (let i = 0; i < 40; i++) {
    const seed = i * 71 + 5;
    const dx = (seed * 17) % GRASS_TEX_SIZE;
    const dy = (seed * 41) % GRASS_TEX_SIZE;
    drawWrapped(ctx, dx, dy, GRASS_TEX_SIZE, 5, (x, y) => {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(x + Math.cos(a) * 2, y + Math.sin(a) * 2, 1.3, 0.9, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffd76b";
      ctx.beginPath();
      ctx.arc(x, y, 1.1, 0, Math.PI * 2);
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
  const tex = useMemo(() => buildShoreTexture(), []);
  const repeats = size / 2.75;
  useEffect(() => {
    tex.repeat.set(repeats, repeats);
  }, [tex, repeats]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial map={tex} />
    </mesh>
  );
}

function buildWaterTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createRadialGradient(64, 64, 10, 64, 64, 64);
  gradient.addColorStop(0, "#5fd6c4");
  gradient.addColorStop(1, "#2f92b0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  for (let i = 0; i < 22; i++) {
    const seed = i * 53 + 7;
    const gx = (seed * 19) % 128;
    const gy = (seed * 31) % 128;
    const r = 1 + (seed % 3) * 0.8;
    ctx.fillStyle = `rgba(255,255,255,${0.05 + (seed % 4) * 0.02})`;
    ctx.beginPath();
    ctx.ellipse(gx, gy, r * 1.8, r, (seed % 6) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const POND_RADIUS_X = 6.5;
const POND_FRONT_Z = 2.0;
const POND_BACK_Z = 7.5;
const HOME_PAD_POSITION = [0, (POND_FRONT_Z - POND_BACK_Z) / 2];

function pondNorm(x, z) {
  const zRadius = z >= 0 ? POND_FRONT_Z : POND_BACK_Z;
  const nx = x / POND_RADIUS_X;
  const nz = z / zRadius;
  return Math.sqrt(nx * nx + nz * nz);
}

function keepOffPond([x, z], margin = 1.12) {
  const norm = pondNorm(x, z) || 0.0001;
  if (norm >= margin) return [x, z];
  const scale = margin / norm;
  return [x * scale, z * scale];
}

function buildPondLensGeometry(radiusX, frontZ, backZ, segments = 72) {
  const positions = [0, 0, 0];
  const uvs = [0.5, 0.5];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;

    const zRadius = Math.sin(theta) >= 0 ? backZ : frontZ;
    positions.push(Math.cos(theta) * radiusX, Math.sin(theta) * zRadius, 0);
    uvs.push(0.5 + 0.5 * Math.cos(theta), 0.5 + 0.5 * Math.sin(theta));
  }
  const indices = [];
  for (let i = 1; i <= segments; i++) indices.push(0, i, i + 1);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function Pond() {
  const tex = useMemo(() => buildWaterTexture(), []);
  const geo = useMemo(
    () => buildPondLensGeometry(POND_RADIUS_X, POND_FRONT_Z, POND_BACK_Z),
    []
  );
  const ref = useRef();
  const sheenRef = useRef();
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ref.current) {
      ref.current.material.opacity = 0.88 + Math.sin(t * 0.6) * 0.03;
    }
    if (sheenRef.current) {
      sheenRef.current.material.opacity = 0.16 + Math.sin(t * 0.8) * 0.05;
      sheenRef.current.position.x = -1.6 + Math.sin(t * 0.22) * 0.5;
    }
  });
  return (
    <>
      <mesh ref={ref} geometry={geo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <meshStandardMaterial map={tex} roughness={0.2} metalness={0.15} transparent opacity={0.9} />
      </mesh>
      {/* drifting sun sheen across the surface */}
      <mesh
        ref={sheenRef}
        rotation={[-Math.PI / 2, 0, 0.4]}
        position={[-1.6, 0.02, -2.0]}
        scale={[1, 0.5, 1]}
      >
        <circleGeometry args={[1.7, 28]} />
        <meshBasicMaterial color="#eafaf4" transparent opacity={0.18} depthWrite={false} />
      </mesh>
    </>
  );
}

function buildShoreStones(count = 26, margin = 1.08) {
  const stones = [];
  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2 + (seededRand(i * 3.7) - 0.5) * 0.25;
    const wobble = seededRand(i * 5.1 + 2);
    const r = margin + wobble * 0.14;
    const zRadius = Math.sin(theta) >= 0 ? POND_BACK_Z : POND_FRONT_Z;
    const x = Math.cos(theta) * POND_RADIUS_X * r;
    const z = Math.sin(theta) * zRadius * r;
    if (Math.hypot(x - HOME_PAD_POSITION[0], z - HOME_PAD_POSITION[1]) < 1.6) continue;
    stones.push({
      position: [x, 0.03 + wobble * 0.02, z],
      scale: 0.15 + wobble * 0.16,
      rotation: theta + wobble,
      dark: i % 2 === 1,
    });
  }
  return stones;
}
const SHORE_STONES = buildShoreStones();

function MossyStone({ position, scale, rotation, dark }) {
  return (
    <group position={position} rotation={[0.15, rotation, 0.1]} scale={scale}>
      <mesh castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color={dark ? "#8d9aa6" : "#a3aebc"} roughness={0.85} />
      </mesh>
      <mesh position={[0.05, 0.5, -0.05]} scale={[0.78, 0.24, 0.72]} receiveShadow>
        <sphereGeometry args={[1, 12, 10]} />
        <meshStandardMaterial color="#7fae5f" roughness={1} />
      </mesh>
      <mesh position={[-0.42, 0.26, 0.3]} scale={[0.34, 0.13, 0.3]} receiveShadow>
        <sphereGeometry args={[1, 10, 8]} />
        <meshStandardMaterial color="#5c9c53" roughness={1} />
      </mesh>
    </group>
  );
}

function ShoreStones() {
  return (
    <>
      {SHORE_STONES.map((s, i) => (
        <MossyStone key={i} {...s} />
      ))}
    </>
  );
}

function buildLightPatchTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
  grad.addColorStop(0, "rgba(255,255,255,0.92)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.62)");
  grad.addColorStop(0.7, "rgba(220,248,240,0.4)");
  grad.addColorStop(1, "rgba(220,248,240,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function FrogLightPatch({ position = HOME_PAD_POSITION, radius = 2.1 }) {
  const tex = useMemo(() => buildLightPatchTexture(), []);
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.material.opacity = 0.78 + Math.sin(t * 0.5) * 0.1;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.018, position[1]]}>
      <circleGeometry args={[radius, 40]} />
      <meshBasicMaterial map={tex} transparent opacity={0.85} depthWrite={false} />
    </mesh>
  );
}

function buildFarPondTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 32);
  gradient.addColorStop(0, "#5fd6c4");
  gradient.addColorStop(1, "#2f92b0");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 10; i++) {
    const seed = i * 37 + 5;
    const gx = (seed * 13) % 64;
    const gy = (seed * 19) % 64;
    ctx.fillStyle = `rgba(255,255,255,${0.05 + (seed % 4) * 0.02})`;
    ctx.beginPath();
    ctx.ellipse(gx, gy, 2, 1.2, (seed % 6) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function FarPond({ position = [-3.0, -6.9], radius = 0.6 }) {
  const tex = useMemo(() => buildFarPondTexture(), []);
  return (
    <group position={[position[0], 0, position[1]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <circleGeometry args={[radius, 40]} />
        <meshStandardMaterial map={tex} roughness={0.25} metalness={0.1} transparent opacity={0.9} />
      </mesh>
      <mesh position={[0.4, 0.02, 0.25]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 10]} />
        <meshStandardMaterial color="#4f9b52" roughness={0.8} />
      </mesh>
      <mesh position={[-0.32, 0.02, -0.28]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 10]} />
        <meshStandardMaterial color="#5aa15c" roughness={0.8} />
      </mesh>
      {[
        { pos: [1.3, 0.7], color: "#ffd9e8" },
        { pos: [-1.1, -0.9], color: "#fff3b0" },
      ].map((f, i) => (
        <group key={i} position={[f.pos[0], 0, f.pos[1]]}>
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.2, 5]} />
            <meshStandardMaterial color="#4a7a3f" />
          </mesh>
          <mesh position={[0, 0.22, 0]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={f.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function buildMudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
  grad.addColorStop(0, "rgba(157,120,76,0.95)");
  grad.addColorStop(0.55, "rgba(157,120,76,0.6)");
  grad.addColorStop(0.85, "rgba(157,120,76,0.22)");
  grad.addColorStop(1, "rgba(157,120,76,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 62, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(110,82,50,0.3)";
  for (let i = 0; i < 22; i++) {
    const a = (i * 137) % 360 * (Math.PI / 180);
    const r = (i * 17) % 46;
    ctx.beginPath();
    ctx.ellipse(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 2.5, 1.5, a, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(200,175,140,0.35)";
  for (let i = 0; i < 14; i++) {
    const a = (i * 91) % 360 * (Math.PI / 180);
    const r = (i * 23) % 50;
    ctx.beginPath();
    ctx.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function MudPatch({ position = [0, 2.5], radius = 0.9, opacity = 1 }) {
  const tex = useMemo(() => buildMudTexture(), []);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.012, position[1]]}>
      <circleGeometry args={[radius, 40]} />
      <meshStandardMaterial map={tex} transparent opacity={opacity} roughness={0.95} depthWrite={false} />
    </mesh>
  );
}

function FrontMudFade() {
  return <MudPatch position={[0.1, 1.85]} radius={1.4} opacity={0.35} />;
}

const POND_CLUSTER_OFFSET = [0, 0, 2.6];

const LILYPAD_PLACEMENTS = [
  { size: "small", position: [1.9, -1.0], rotation: 0.4, scale: 0.85 },
  { size: "small", position: [-1.9, -4.0], rotation: 2.1, scale: 0.8 },
  { size: "large", position: [-1.2, -5.8], rotation: 1.0, scale: 1.9 },
  { size: "large", position: [-3.7, -1.45], rotation: 0.7, scale: 1.75 },
];

const ROCK_PLACEMENTS = [
  { position: [0.4, 2.5], scale: 0.26, rotation: 0.6 },
  { position: [-0.5, 2.6], scale: 0.24, rotation: 2.0 },
  { position: [0.65, 2.75], scale: 0.22, rotation: 1.1 },
  { position: [-0.3, 2.4], scale: 0.2, rotation: 3.4 },
];

const MUSHROOM_CAP_COLORS = ["#ff6f6f", "#ffb3c6", "#ffd166"];

function Mushroom({ position, rotation, scale, colorIndex }) {
  const capColor = MUSHROOM_CAP_COLORS[colorIndex % MUSHROOM_CAP_COLORS.length];
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.07, 0.09, 0.32, 8]} />
        <meshStandardMaterial color="#fff3e2" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={capColor} roughness={0.55} />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + 0.4;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.14, 0.4, Math.sin(a) * 0.14]}>
            <sphereGeometry args={[0.035, 6, 6]} />
            <meshStandardMaterial color="#fff8ef" />
          </mesh>
        );
      })}
    </group>
  );
}

function Mushrooms() {
  return (
    <>
      {ROCK_PLACEMENTS.map((r, i) => (
        <Mushroom
          key={i}
          position={r.position}
          rotation={r.rotation}
          scale={r.scale * 2.5}
          colorIndex={i}
        />
      ))}
    </>
  );
}

const TOP_MUSHROOM_PLACEMENTS = [
  { position: [-1.8, -8.7], rotation: 0.8, scale: 0.24 },
  { position: [1.5, -9.2], rotation: 2.4, scale: 0.22 },
  { position: [0.2, -8.4], rotation: 1.5, scale: 0.2 },
];

function TopMushrooms() {
  return (
    <>
      {TOP_MUSHROOM_PLACEMENTS.map((m, i) => (
        <Mushroom
          key={i}
          position={m.position}
          rotation={m.rotation}
          scale={m.scale * 2.5}
          colorIndex={i + 1}
        />
      ))}
    </>
  );
}

const PEBBLE_COLORS = ["#d7cdbb", "#bcc9c5", "#e0d3bd", "#c6bccb"];

const PEBBLE_CLUSTERS_RAW = [
  { position: [2.0, 3.7], count: 3 },
  { position: [-1.8, 3.9], count: 3 },
  { position: [3.1, 2.7], count: 2 },
  { position: [-3.0, 2.6], count: 2 },
  { position: [0.4, 4.6], count: 3 },
];
const PEBBLE_CLUSTERS = PEBBLE_CLUSTERS_RAW.map((c) => ({
  ...c,
  position: keepOffPond(c.position),
}));

function pebbleSeed(position, index, offset) {
  return seededRand((position[0] * 131.1 + position[1] * 71.7 + index * 33.3 + offset) * 12.9898);
}

function PebbleCluster({ position, count }) {
  const pebbles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const r1 = pebbleSeed(position, i, 1);
      const r2 = pebbleSeed(position, i, 2);
      const r3 = pebbleSeed(position, i, 3);
      return {
        offset: [(r1 - 0.5) * 0.4, (r2 - 0.5) * 0.4],
        radius: 0.06 + r3 * 0.07,
        squish: [0.85 + r1 * 0.3, 0.55 + r2 * 0.3, 0.85 + r3 * 0.3],
        color: PEBBLE_COLORS[i % PEBBLE_COLORS.length],
        rotation: r1 * Math.PI * 2,
      };
    });
  }, [position, count]);

  return (
    <group position={[position[0], 0, position[1]]}>
      {pebbles.map((p, i) => (
        <mesh
          key={i}
          position={[p.offset[0], p.radius * p.squish[1] * 0.5, p.offset[1]]}
          rotation={[0.15, p.rotation, 0.08]}
          scale={[p.radius * p.squish[0], p.radius * p.squish[1], p.radius * p.squish[2]]}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry args={[1, 1]} />
          <meshStandardMaterial color={p.color} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function Pebbles() {
  return (
    <>
      {PEBBLE_CLUSTERS.map((c, i) => (
        <PebbleCluster key={i} {...c} />
      ))}
    </>
  );
}

function PondRock({ position = [0.55, 2.6], scale = 1, rotation = 0.5 }) {
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]} scale={scale}>
      <mesh position={[0, 0.24, 0]} rotation={[0.15, 0.6, 0.05]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.34, 1]} />
        <meshStandardMaterial color="#a9a196" roughness={0.85} />
      </mesh>
      <mesh position={[0.22, 0.13, 0.14]} rotation={[0.3, 1.2, 0.1]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.17, 1]} />
        <meshStandardMaterial color="#b3ab9f" roughness={0.85} />
      </mesh>
      <mesh position={[-0.16, 0.09, -0.1]} rotation={[0.1, 0.4, 0.2]} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.12, 1]} />
        <meshStandardMaterial color="#9d9589" roughness={0.85} />
      </mesh>
      <mesh position={[0.02, 0.44, 0.06]} rotation={[0, 0.4, 0]}>
        <sphereGeometry args={[0.13, 8, 6]} />
        <meshStandardMaterial color="#7fae5f" roughness={0.9} />
      </mesh>
    </group>
  );
}

const FLOWER_COLORS = ["#ffd9e8", "#fff3b0", "#ffffff"];
const FLOWER_PLACEMENTS_RAW = [
  { position: [1.6, 2.6], color: 0 },
  { position: [-2.0, 2.4], color: 1 },
  { position: [4.15, 1.0], color: 2 },
  { position: [-4.0, -0.65], color: 0 },
  { position: [3.05, -3.05], color: 1 },
  { position: [-1.45, -3.85], color: 2 },
  { position: [0.9, -5.6], color: 1 },
  { position: [-2.1, -5.5], color: 0 },
  { position: [-3.6, -7.3], color: 2 },
  { position: [-2.3, -6.4], color: 0 },
];
const FLOWER_PLACEMENTS = FLOWER_PLACEMENTS_RAW.map((f) => ({
  ...f,
  position: keepOffPond(f.position),
}));

function Flowers() {
  return (
    <>
      {FLOWER_PLACEMENTS.map((f, i) => (
        <group key={i} position={[f.position[0], 0, f.position[1]]}>
          <mesh position={[0, 0.12, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.24, 5]} />
            <meshStandardMaterial color="#4a7a3f" />
          </mesh>
          <mesh position={[0, 0.26, 0]} castShadow>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color={FLOWER_COLORS[f.color]} />
          </mesh>
        </group>
      ))}
    </>
  );
}

const GRASS_TUFT_PLACEMENTS = Array.from({ length: 20 }).map((_, i) => {
  const angle = seededRand(i * 3.1) * Math.PI * 2;
  const r = 4.0 + seededRand(i * 7.7) * 1.9;
  return {
    position: keepOffPond([Math.cos(angle) * r, Math.sin(angle) * r]),
    rotation: seededRand(i * 5.3) * Math.PI * 2,
    scale: 0.7 + seededRand(i * 9.1) * 0.5,
  };
});

function GrassTuft({ position, rotation, scale }) {
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]} scale={scale}>
      {[-0.05, 0, 0.05].map((dx, i) => (
        <mesh key={i} position={[dx, 0.09, 0]} rotation={[0, 0, dx * 2.5]} castShadow>
          <coneGeometry args={[0.02, 0.2, 5]} />
          <meshStandardMaterial color={i === 1 ? "#5f9e4e" : "#6fae5a"} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function GrassTufts() {
  return (
    <>
      {GRASS_TUFT_PLACEMENTS.map((t, i) => (
        <GrassTuft key={i} {...t} />
      ))}
    </>
  );
}

const BUSH_PLACEMENTS = [
  { position: [-2.9, -4.6], scale: 0.75 },
  { position: [2.9, -4.2], scale: 0.7 },
  { position: [0.2, -5.7], scale: 0.65 },
];

function Bush({ position, scale }) {
  return (
    <group position={[position[0], 0, position[1]]} scale={scale}>
      <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.26, 9, 7]} />
        <meshStandardMaterial color="#5c9c53" roughness={0.85} />
      </mesh>
      <mesh position={[0.18, 0.16, 0.1]} castShadow receiveShadow>
        <sphereGeometry args={[0.18, 8, 6]} />
        <meshStandardMaterial color="#6bab5f" roughness={0.85} />
      </mesh>
      <mesh position={[-0.15, 0.14, -0.12]} castShadow receiveShadow>
        <sphereGeometry args={[0.16, 8, 6]} />
        <meshStandardMaterial color="#6bab5f" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.34, 0.05]}>
        <sphereGeometry args={[0.03, 6, 6]} />
        <meshStandardMaterial color="#ffd9e8" />
      </mesh>
    </group>
  );
}

function Bushes() {
  return (
    <>
      {BUSH_PLACEMENTS.map((b, i) => (
        <Bush key={i} {...b} />
      ))}
    </>
  );
}

const BLOOM_PLACEMENTS = [
  { position: [1.9, 1.5], color: "#ffb6c8", scale: 1 },
  { position: [-2.4, -1.1], color: "#fff6d8", scale: 0.85 },
  { position: [2.6, -2.0], color: "#ffe1ec", scale: 0.9 },
];

function WaterBloom({ position, color, scale }) {
  const ref = useRef();
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = 0.03 + Math.sin(t * 0.8 + phase) * 0.015;
    ref.current.rotation.y = t * 0.15 + phase;
  });
  return (
    <group ref={ref} position={[position[0], 0.03, position[1]]} scale={scale}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09]}
            rotation={[0, -a, 0]}
            scale={[1, 0.35, 1.8]}
            castShadow
          >
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshStandardMaterial color={color} roughness={0.6} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.01, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ffe580" />
      </mesh>
    </group>
  );
}

function WaterBlooms() {
  return (
    <>
      {BLOOM_PLACEMENTS.map((b, i) => (
        <WaterBloom key={i} {...b} />
      ))}
    </>
  );
}

const TADPOLE_PLACEMENTS = [
  { speed: 0.5, color: "#3b3b2a" },
  { speed: 0.62, color: "#48482f" },
  { speed: 0.45, color: "#33331f" },
  { speed: 0.58, color: "#45452c" },
  { speed: 0.4, color: "#3f3f26" },
];

function Tadpole({ speed, color }) {
  const group = useRef();
  const tailRef = useRef();
  const { state, step } = useFreeRoam({ bounds: 3.2, minHeight: -0.05, maxHeight: 0.0, speed: speed * 0.7 });
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
        group.current.rotation.y += angleDelta * 0.06;
      }
      group.current.position.set(pos.x, pos.y, pos.z);
      prevPos.current.copy(pos);
    }
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 7) * 0.4;
    }
  });
  return (
    <group ref={group}>
      <mesh scale={[0.05, 0.045, 0.09]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color={color} roughness={0.5} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <group ref={tailRef} position={[0, 0, -0.05]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.022, 0.15, 5]} />
          <meshStandardMaterial color={color} roughness={0.55} transparent opacity={0.45} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

function Tadpoles() {
  return (
    <>
      {TADPOLE_PLACEMENTS.map((t, i) => (
        <Tadpole key={i} {...t} />
      ))}
    </>
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

function Lilypad({ position, rotation, scale, sourceScene }) {
  const object = useMemo(() => sourceScene.clone(), [sourceScene]);
  const offset = useGroundedOffset(object);
  const ref = useRef();
  const bobPhase = useMemo(() => Math.random() * Math.PI * 2, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = 0.02 + Math.sin(t * 0.7 + bobPhase) * 0.018;
  });

  return (
    <group ref={ref} position={[position[0], 0.02, position[1]]} rotation={[0, rotation, 0]}>
      <primitive
        object={object}
        scale={scale}
        position={[offset[0], offset[1], offset[2]]}
      />
    </group>
  );
}

function Lilypads() {
  const { scene: smallScene } = useGLTF("/models/habitats/lilypad.glb");
  const { scene: largeScene } = useGLTF("/models/habitats/largeLilypad.glb");
  return (
    <>
      {LILYPAD_PLACEMENTS.map((p, i) => (
        <Lilypad
          key={i}
          sourceScene={p.size === "large" ? largeScene : smallScene}
          position={p.position}
          rotation={p.rotation}
          scale={p.scale}
        />
      ))}
    </>
  );
}

class LilypadsErrorBoundary extends React.Component {
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

function LilyBlossom({ position, color, scale = 1 }) {
  const ref = useRef();
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.position.y = 0.03 + Math.sin(t * 0.7 + phase) * 0.012;
  });
  return (
    <group ref={ref} position={[position[0], 0.03, position[1]]} scale={scale}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.09, 0, Math.sin(a) * 0.09]} rotation={[0.75, a, 0]} castShadow>
            <coneGeometry args={[0.06, 0.16, 4]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial color="#ffe580" roughness={0.5} />
      </mesh>
    </group>
  );
}

const LILY_BLOSSOM_PLACEMENTS = [
  { position: [1.55, -1.35], color: "#ffd9e8" },
  { position: [-3.4, -1.7], color: "#fff3b0" },
];

function LilyBlossoms() {
  return (
    <>
      {LILY_BLOSSOM_PLACEMENTS.map((b, i) => (
        <LilyBlossom key={i} {...b} />
      ))}
    </>
  );
}

function generateCattailRing(count = 18, margin = 0.9) {
  const placements = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
    const jitter = 1 + Math.random() * 0.14;

    const rx = POND_RADIUS_X * jitter + margin;
    const zReach = Math.sin(angle) >= 0 ? POND_FRONT_Z : POND_BACK_Z;
    const rz = zReach * jitter + margin;
    const nearPathGap = Math.abs(((angle + Math.PI / 2) % (Math.PI * 2)) - Math.PI / 2) < 0.35;
    if (nearPathGap) continue;
    placements.push({
      position: [Math.cos(angle) * rx, Math.sin(angle) * rz],
      rotation: Math.random() * Math.PI * 2,
      scale: 0.8 + Math.random() * 0.5,
    });
  }
  return placements;
}
const CATTAIL_PLACEMENTS = generateCattailRing();

function Cattail({ position, rotation, scale, sourceScene }) {
  const object = useMemo(() => sourceScene.clone(), [sourceScene]);
  const offset = useGroundedOffset(object);
  return (
    <group position={[position[0], 0, position[1]]} rotation={[0, rotation, 0]}>
      <primitive
        object={object}
        scale={scale}
        position={[offset[0], offset[1], offset[2]]}
      />
    </group>
  );
}

function Cattails() {
  const { scene } = useGLTF("/models/habitats/cattail.glb");
  return (
    <>
      {CATTAIL_PLACEMENTS.map((c, i) => (
        <Cattail key={i} sourceScene={scene} {...c} />
      ))}
    </>
  );
}

class CattailsErrorBoundary extends React.Component {
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

function LilyRipple({ position, period = 3.4, startDelay = 0, baseRadius = 0.32 }) {
  const ref1 = useRef();
  const ref2 = useRef();
  const ringWidth = baseRadius * 0.24;

  useFrame(({ clock }) => {
    const now = clock.getElapsedTime() + startDelay;
    const t0 = (now % period) / period;
    const t1 = ((now + period / 2) % period) / period;
    if (ref1.current) {
      ref1.current.scale.setScalar(0.55 + t0 * 1.8);
      ref1.current.material.opacity = (1 - t0) * 0.28;
    }
    if (ref2.current) {
      ref2.current.scale.setScalar(0.55 + t1 * 1.8);
      ref2.current.material.opacity = (1 - t1) * 0.2;
    }
  });

  return (
    <group position={[position[0], 0.02, position[1]]}>
      <mesh ref={ref1} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[baseRadius, baseRadius + ringWidth, 32]} />
        <meshBasicMaterial color="#eaf7f1" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh ref={ref2} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[baseRadius, baseRadius + ringWidth, 32]} />
        <meshBasicMaterial color="#eaf7f1" transparent opacity={0.2} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

const LILY_RIPPLE_SPOTS = LILYPAD_PLACEMENTS.map((p, i) => ({
  position: p.position,
  baseRadius: (p.size === "large" ? 0.34 : 0.22) * p.scale,
  period: p.size === "large" ? 4.0 : 3.2,
  startDelay: i * 1.1,
}));

function LilyRipples() {
  return (
    <>
      {LILY_RIPPLE_SPOTS.map((s, i) => (
        <LilyRipple key={i} {...s} />
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
      <meshBasicMaterial color="#c8f27a" />
      <pointLight color="#c8f27a" intensity={0.3} distance={0.9} />
    </mesh>
  );
}

function MistWisp({ radius, speed, height, phase, scale }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + phase;
    ref.current.position.set(Math.cos(t) * radius, height, Math.sin(t) * radius);
    ref.current.material.opacity = 0.12 + Math.sin(t * 1.3) * 0.04;
  });
  return (
    <mesh ref={ref} scale={scale}>
      <sphereGeometry args={[0.6, 12, 12]} />
      <meshBasicMaterial color="#f0ffe6" transparent opacity={0.14} depthWrite={false} />
    </mesh>
  );
}

function MistWisps() {
  const wisps = [
    { radius: 3.4, speed: 0.05, height: 0.5, phase: 0, scale: 1.3 },
    { radius: 4.6, speed: 0.04, height: 1.0, phase: 2.1, scale: 1.7 },
    { radius: 2.7, speed: 0.06, height: 0.3, phase: 4.2, scale: 0.9 },
  ];
  return (
    <>
      {wisps.map((w, i) => (
        <MistWisp key={i} {...w} />
      ))}
    </>
  );
}

const FROG_BASE_YAW = 0;

function IdleCharacter({ modelPath, homePosition, onRipple, scale = 2.1 }) {
  const group = useRef();
  const { scene } = useGLTF(modelPath);
  const object = useMemo(() => scene.clone(), [scene]);
  const offset = useGroundedOffset(object);

  const nextHop = useRef(2 + Math.random() * 2);
  const nextGlance = useRef(1 + Math.random() * 2);
  const baseYaw = useRef(FROG_BASE_YAW);
  const glanceOffset = useRef(0);

  useFrame(({ clock }) => {
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
    group.current.position.y = offset[1] + hopY;
    group.current.scale.set(1 / Math.sqrt(breathSquash), breathSquash, 1 / Math.sqrt(breathSquash));
  });

  return (
    <group ref={group} position={[homePosition[0], 0, homePosition[1]]} rotation={[0, FROG_BASE_YAW, 0]}>
      <primitive
        object={object}
        scale={scale}
        position={[offset[0], 0, offset[2]]}
      />
    </group>
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
    if (this.state.failed) {
      return <IdleCharacter modelPath={DEFAULT_MODEL} homePosition={this.props.position} />;
    }
    return this.props.children;
  }
}

const ISO_DISTANCE = 7.8;
const ISO_ELEVATION = Math.atan(1 / Math.sqrt(2)) + 0.08;
const ISO_YAW = 0;
const ISO_POSITION = [
  ISO_DISTANCE * Math.cos(ISO_ELEVATION) * Math.sin(ISO_YAW),
  ISO_DISTANCE * Math.sin(ISO_ELEVATION),
  ISO_DISTANCE * Math.cos(ISO_ELEVATION) * Math.cos(ISO_YAW),
];

const FrogHabitat3D = ({ characterModel, showCharacter = true }) => {
  const [ripples, setRipples] = useState([]);

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
        orthographic
        camera={{ position: ISO_POSITION, zoom: 74, near: 0.1, far: 200 }}
        gl={{ toneMappingExposure: 1.25 }}
        style={{ touchAction: "none" }}
        onCreated={({ gl }) => {

          gl.domElement.style.touchAction = "none";
        }}
      >
        <color attach="background" args={["#8fd9ae"]} />
        <fog attach="fog" args={["#8fd9ae", 60, 150]} />

        <OrbitControls
          makeDefault
          target={[0, 0.7, 0]}
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

        <ambientLight intensity={0.85} />
        <directionalLight
          position={[5, 8, 3]}
          intensity={2.3}
          color="#fff7da"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-7}
          shadow-camera-right={7}
          shadow-camera-top={7}
          shadow-camera-bottom={-7}
        />
        <directionalLight position={[-5, 3, -4]} intensity={0.4} color="#a8e0ea" />
        <hemisphereLight args={["#f0ffe6", "#4a6b47", 1.1]} />

        <React.Suspense fallback={null}>
          <Ground />
          <FarPond />

          <group position={POND_CLUSTER_OFFSET}>
            <MudPatch />
            <FrontMudFade />
            <Pond />
            <ShoreStones />
            <FrogLightPatch />
            <WaterBlooms />
            <LilyBlossoms />
            <MistWisps />
            <Dragonflies />

            <RippleManager ripples={ripples} onRippleDone={removeRipple} />
            <LilyRipples />

            <LilypadsErrorBoundary>
              <React.Suspense fallback={null}>
                <Lilypads />
              </React.Suspense>
            </LilypadsErrorBoundary>

            <CattailsErrorBoundary>
              <React.Suspense fallback={null}>
                <Cattails />
              </React.Suspense>
            </CattailsErrorBoundary>

            <Firefly bounds={5} speed={0.5} height={0.8} />
            <Firefly bounds={4.5} speed={0.55} height={1.0} />
            <Firefly bounds={5.5} speed={0.45} height={0.65} />

            <Mushrooms />
            <TopMushrooms />
            <Pebbles />
            <PondRock />
            <Flowers />
            <GrassTufts />
            {showCharacter && (
              <HideWhenAnimated><CharacterErrorBoundary position={HOME_PAD_POSITION}>
                <IdleCharacter modelPath={characterModel} homePosition={HOME_PAD_POSITION} onRipple={addRipple} scale={2.75} />
              </CharacterErrorBoundary></HideWhenAnimated>
            )}
          </group>
        </React.Suspense>
      </Canvas>
    </div>
  );
};

export default FrogHabitat3D;