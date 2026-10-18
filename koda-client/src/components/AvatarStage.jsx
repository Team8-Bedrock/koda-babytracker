import React, { Suspense, forwardRef, lazy, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { Hand, Pointer } from "lucide-react";
import { PandaMood, getTexture, smooth, pulse } from "./animations/panda/pandaRig";
import { BearMood } from "./animations/bear/bearRig";
import { BunnyMood } from "./animations/bunny/bunnyRig";
import { FrogMood } from "./animations/frog/frogRig";
import { FoxMood } from "./animations/fox/foxRig";
import { KoalaMood } from "./animations/koala/koalaRig";

const STAGE_HEIGHT = 1.8;
const STAGE_FIT = {};
const PET_HOLD = 2.2;
const PET_LINGER = 1.2;

const MOODS = { bear: BearMood, panda: PandaMood, bunny: BunnyMood, frog: FrogMood, fox: FoxMood, koala: KoalaMood };

const PETS = {
  bear: lazy(() => import("./animations/bear/PetBear")),
  panda: lazy(() => import("./animations/panda/PetPanda")),
  bunny: lazy(() => import("./animations/bunny/PetBunny")),
  frog: lazy(() => import("./animations/frog/PetFrog")),
  fox: lazy(() => import("./animations/fox/PetFox")),
  koala: lazy(() => import("./animations/koala/PetKoala")),
};

const HAPPY = {
  bear: lazy(() => import("./animations/bear/HappyBear")),
  panda: lazy(() => import("./animations/panda/HappyPanda")),
  bunny: lazy(() => import("./animations/bunny/HappyBunny")),
  frog: lazy(() => import("./animations/frog/HappyFrog")),
  fox: lazy(() => import("./animations/fox/HappyFox")),
  koala: lazy(() => import("./animations/koala/HappyKoala")),
};

const PAW_COLORS = {
  fox: { fur: "#e07b45", edge: "#b65a2c", pad: "#3b2a24", padEdge: "rgba(30, 20, 15, 0.5)" },
  frog: { fur: "#86cf6a", edge: "#5a9e48", pad: "#d4f5b4", padEdge: "rgba(60, 110, 50, 0.5)" },
  koala: { fur: "#a7aab3", edge: "#7d808a", pad: "#3f3a3d", padEdge: "rgba(30, 28, 30, 0.5)" },
};

const pawTextures = new Map();

function getPawTexture(animal) {
  if (pawTextures.has(animal)) return pawTextures.get(animal);
  const colors = PAW_COLORS[animal] || PAW_COLORS.koala;
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.translate(64, 64);
  ctx.fillStyle = colors.fur;
  ctx.strokeStyle = colors.edge;
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  const pad = (x, y, rx, ry) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  };
  pad(-29, -23, 13, 17);
  pad(-10, -31, 13, 18);
  pad(10, -31, 13, 18);
  pad(29, -23, 13, 17);
  pad(0, 13, 36, 30);
  ctx.fillStyle = colors.pad;
  ctx.strokeStyle = colors.padEdge;
  ctx.lineWidth = 3;
  [-29, -10, 10, 29].forEach((x, i) => {
    ctx.beginPath();
    ctx.ellipse(x, i === 0 || i === 3 ? -23 : -31, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  ctx.beginPath();
  ctx.moveTo(-23, 8);
  ctx.quadraticCurveTo(-22, -5, -10, -4);
  ctx.quadraticCurveTo(-4, -10, 0, -3);
  ctx.quadraticCurveTo(7, -10, 12, -4);
  ctx.quadraticCurveTo(23, -3, 23, 9);
  ctx.quadraticCurveTo(22, 25, 0, 29);
  ctx.quadraticCurveTo(-22, 25, -23, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  pawTextures.set(animal, tex);
  return tex;
}

function makeMatte(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
      if (!m || m.userData.kodaMatte) return;
      if ("roughness" in m) m.roughness = 1;
      if ("metalness" in m) m.metalness = 0;
      if ("clearcoat" in m) m.clearcoat = 0;
      if ("specularIntensity" in m) m.specularIntensity = 0;
      m.userData.kodaMatte = true;
      m.needsUpdate = true;
    });
  });
}

function MatteScene() {
  const { scene } = useThree();
  const tick = useRef(0);
  useFrame(() => {
    tick.current += 1;
    if (tick.current < 600 && tick.current % 60 === 1) makeMatte(scene);
  });
  return null;
}

function Ready({ onReady }) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);
  return null;
}

const HINT_ANIMAL = "bear";

function basePose(t, ownBlink) {
  const cycle = t % 3.7;
  return {
    rootY: 0,
    spin: 0,
    roll: 0,
    squash: 1 + Math.sin(t * 2) * 0.012,
    headX: Math.sin(t * 0.9) * 0.03,
    headY: Math.sin(t * 0.6) * 0.08,
    headZ: 0,
    headPuff: 0,
    blink: ownBlink || cycle >= 0.16 ? 0 : Math.sin((cycle / 0.16) * Math.PI),
    squint: 0,
    smile: 0,
    open: 0,
    earZ: 0,
    earX: 0,
    legL: 0,
    legR: 0,
    bow: Math.sin(t * 2) * 0.04,
    armX: [0, 0],
    armZ: [0, 0],
  };
}

const RIG_IDLES = {
  fox(p, t) {
    const period = 4.2;
    const h = (t % period) / period;
    const crouch = pulse(0.55, 0.72, h);
    const leap = pulse(0.68, 0.86, h);
    const tilt = smooth(0.1, 0.25, h) * (1 - smooth(0.42, 0.55, h));
    p.rootY += leap * 0.1;
    p.squash *= 1 - crouch * 0.07 + leap * 0.05;
    p.headZ += tilt * 0.22;
    p.headY += Math.sin(t * 0.6) * 0.1;
    p.headX += crouch * 0.1 - leap * 0.05;
    p.earX -= crouch * 0.15;
    p.legL = -leap * 0.25;
    p.legR = -leap * 0.25;
    p.armX = [-crouch * 0.3 - leap * 0.35, -crouch * 0.3 - leap * 0.35];
    p.armZ = [0.04 + leap * 0.12, 0.04 + leap * 0.12];
    p.smile = tilt * 0.5;
  },
  koala(p, t) {
    const period = 6;
    const h = (t % period) / period;
    const nod = smooth(0.05, 0.6, h) * (1 - smooth(0.7, 0.78, h));
    const perk = pulse(0.7, 0.9, h);
    p.roll += Math.sin(t * 0.8) * 0.04;
    p.headX += nod * 0.2 - perk * 0.06;
    p.headZ += nod * 0.06 + Math.sin(t * 0.5) * 0.04;
    p.rootY += perk * 0.025;
    p.squash *= 1 + Math.sin(t * 1.1) * 0.01 + perk * 0.02;
    p.squint = Math.max(p.squint, nod * 0.85);
    p.earZ -= perk * 0.08;
    p.armZ = [0.05, 0.05];
    p.armX = [Math.sin(t * 0.9) * 0.05, -Math.sin(t * 0.9) * 0.05];
  },
  frog(p, t) {
    const period = 1.9;
    const h = (t % period) / period;
    const crouch = pulse(0, 0.16, h) + pulse(0.48, 0.66, h);
    const arc = h > 0.12 && h < 0.52 ? Math.sin(((h - 0.12) / 0.4) * Math.PI) : 0;
    p.rootY += arc * 0.12;
    p.squash *= 1 - crouch * 0.09 + arc * 0.05;
    p.headX += crouch * 0.06 - arc * 0.05;
    p.headZ += Math.sin(t * 1.65) * 0.05;
    p.legL = -arc * 0.3 + crouch * 0.1;
    p.legR = -arc * 0.3 + crouch * 0.1;
    p.armZ = [0.08 + arc * 0.35, 0.08 + arc * 0.35];
    p.armX = [-arc * 0.15, -arc * 0.15];
    p.squint = arc * 0.2;
  },
  bear(p, t) {
    const rock = Math.sin(t * 1.6);
    const peak = smooth(0.75, 1, Math.abs(rock));
    p.roll += rock * 0.07;
    p.rootY += (1 - Math.abs(rock)) * 0.012;
    p.headZ -= rock * 0.07;
    p.headX += 0.04 * peak;
    p.legL = Math.max(0, -rock) * 0.16;
    p.legR = Math.max(0, rock) * 0.16;
    p.armX = [rock * 0.18, -rock * 0.18];
    p.armZ = [0.05, 0.05];
    p.squint = 0.45 * peak;
    p.smile = 0.6 * peak;
  },
  panda(p, t) {
    const wob = Math.sin(t * 2.4);
    const flap = Math.abs(Math.sin(t * 4.8));
    p.roll += wob * 0.15;
    p.rootY += Math.abs(Math.cos(t * 2.4)) * 0.018;
    p.squash *= 1 - Math.abs(wob) * 0.025;
    p.headZ -= wob * 0.12;
    p.headY += wob * 0.08;
    p.legL = Math.max(0, wob) * 0.2;
    p.legR = Math.max(0, -wob) * 0.2;
    p.armZ = [0.12 + flap * 0.18, 0.12 + flap * 0.18];
    p.armX = [-wob * 0.1, wob * 0.1];
    p.squint = 0.25;
  },
  bunny(p, t) {
    const beat = Math.abs(Math.sin(t * 2.8));
    const land = 1 - smooth(0, 0.25, beat);
    const sway = Math.sin(t * 1.4);
    p.rootY += beat * 0.03;
    p.squash *= 1 + beat * 0.025 - land * 0.035;
    p.spin += sway * 0.14;
    p.roll += sway * 0.035;
    p.headZ += sway * 0.14;
    p.headY -= sway * 0.08;
    p.headX += land * 0.04;
    p.armZ = [0.1 + beat * 0.08, 0.1 + beat * 0.08];
    p.armX = [sway * 0.12, -sway * 0.12];
    p.earZ += Math.sin(t * 1.7) * 0.06;
    p.legL = land * 0.06;
    p.legR = land * 0.06;
    p.squint = 0.15;
  },
};

function applyPose(rig, body, pose, t) {
  if (body) {
    body.position.y = pose.rootY;
    body.rotation.set(0, pose.spin, pose.roll + Math.sin(t * 1.1) * 0.012);
    body.scale.set(1 / Math.sqrt(pose.squash), pose.squash, 1 / Math.sqrt(pose.squash));
  }
  rig.head.position.copy(rig.headBase);
  rig.head.rotation.set(pose.headX, pose.headY, pose.headZ);
  rig.head.scale.set(1 + pose.headPuff, 1 - pose.headPuff * 0.4, 1 + pose.headPuff * 0.5);
  const close = Math.max(pose.blink * 0.9, pose.squint);
  [rig.eyeLeft, rig.eyeRight].forEach((e) => {
    if (e.patch) e.patch.rotation.z = 0;
    e.inner.forEach((g) => g.scale.set(1 + pose.squint * 0.08, 1 - close, 1));
  });
  rig.earLeft.rotation.set(pose.earX, 0, pose.earZ);
  rig.earRight.rotation.set(pose.earX, 0, -pose.earZ);
  rig.nose.scale.set(1, 1, 1);
  rig.mouth.visible = pose.smile > 0.05 || pose.open > 0.05;
  rig.mouth.scale.set(0.024 * pose.smile + 0.03 * pose.open + 0.001, 0.008 * pose.smile + 0.032 * pose.open + 0.001, 0.01);
  rig.legLeft.rotation.set(pose.legL, 0, 0);
  rig.legRight.rotation.set(pose.legR, 0, 0);
  rig.bow.rotation.set(0, 0, pose.bow);
  [
    [rig.armLeft, -1],
    [rig.armRight, 1],
  ].forEach(([arm, side]) => {
    const i = side < 0 ? 0 : 1;
    arm.quaternion.identity();
    arm.rotation.set(pose.armX[i], 0, side * (pose.armZ[i] + Math.sin(t * 1.4 + side) * 0.03));
  });
}

function makeAnimalIdle(animal) {
  const idle = RIG_IDLES[animal];
  const ownBlink = animal === "bunny";
  return function AnimalIdleRig({ rig, onMounted }) {
    const body = useRef(null);
    useEffect(() => {
      onMounted?.();
    }, [onMounted]);
    useFrame(({ clock }) => {
      const t = clock.elapsedTime;
      const pose = basePose(t, ownBlink);
      idle(pose, t);
      applyPose(rig, body.current, pose, t);
    });
    return (
      <group ref={body}>
        <primitive object={rig.rig} />
      </group>
    );
  };
}

const IDLE_RIGS = {
  bear: makeAnimalIdle("bear"),
  panda: makeAnimalIdle("panda"),
  bunny: makeAnimalIdle("bunny"),
  frog: makeAnimalIdle("frog"),
  fox: makeAnimalIdle("fox"),
  koala: makeAnimalIdle("koala"),
};

const STATIC_IDLES = {
  fox(b, t) {
    const look = Math.sin(t * 0.7);
    const tilt = smooth(0.3, 1, Math.abs(Math.sin(t * 0.7 + 0.4))) * Math.sign(Math.sin(t * 0.7 + 0.4));
    b.rotY += look * 0.28;
    b.rotZ += tilt * 0.1;
    b.rotX += Math.max(0, Math.sin(t * 1.4)) * 0.04;
    b.y += Math.abs(Math.sin(t * 1.4)) * 0.012;
    b.sx *= 1 + Math.sin(t * 5) * 0.006;
  },
  frog(b, t) {
    const period = 1.9;
    const h = (t % period) / period;
    const crouch = pulse(0, 0.16, h) + pulse(0.48, 0.66, h);
    const arc = h > 0.12 && h < 0.52 ? Math.sin(((h - 0.12) / 0.4) * Math.PI) : 0;
    b.y += arc * 0.16;
    b.squash *= 1 - crouch * 0.1 + arc * 0.06;
    b.sx *= 1 + crouch * 0.05;
    b.rotX += -crouch * 0.05;
  },
  koala(b, t) {
    const period = 5.5;
    const h = (t % period) / period;
    const nod = smooth(0, 0.75, h) * (1 - smooth(0.78, 0.86, h));
    const perk = pulse(0.8, 0.95, h);
    b.rotX += nod * 0.12 - perk * 0.04;
    b.rotZ += Math.sin(t * 0.8) * 0.05;
    b.y += -nod * 0.015 + perk * 0.03;
    b.squash *= 1 + Math.sin(t * 1.2) * 0.01;
  },
};

const HEART_COUNT = 4;

function StaticAvatar({ url, animal, height, action }) {
  const gltf = useGLTF(url);
  const group = useRef(null);
  const paw = useRef(null);
  const hearts = useRef([]);
  const idle = STATIC_IDLES[animal] || STATIC_IDLES.koala;
  const model = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const k = height / (size.y || 1);
    clone.position.set(-center.x * k, -box.min.y * k, -center.z * k);
    clone.scale.setScalar(k);
    const wrapper = new THREE.Group();
    wrapper.add(clone);
    return wrapper;
  }, [gltf, height]);
  const heart = getTexture("heart");
  const pawTex = getPawTexture(animal);

  useFrame(({ clock: c }) => {
    const t = c.elapsedTime;
    const now = performance.now() / 1000;
    const since = action ? now - action.at : 99;
    const patting = action?.type === "pet" && since < 2.2;
    const hopping = action?.type === "hop" && since < 0.6;
    const pat = patting ? smooth(0, 0.2, since) * (1 - smooth(1.8, 2.2, since)) : 0;
    const squish = pat * Math.abs(Math.sin(since * 9));
    const hop = hopping ? Math.sin((since / 0.6) * Math.PI) : 0;
    const b = { y: Math.sin(t * 2) * 0.025, rotX: 0, rotY: 0, rotZ: 0, squash: 1 + Math.sin(t * 2) * 0.012, sx: 1 };
    if (!patting && !hopping) idle(b, t);
    if (group.current) {
      group.current.position.y = b.y + hop * 0.35;
      group.current.rotation.set(b.rotX, b.rotY, b.rotZ + (patting ? Math.sin(since * 7) * 0.06 * pat : 0));
      const sy = b.squash * (1 - squish * 0.08) + hop * 0.05;
      group.current.scale.set(b.sx * (1 + squish * 0.06) / Math.sqrt(b.squash), sy, (1 + squish * 0.06) / Math.sqrt(b.squash));
    }
    if (paw.current) {
      const stroke = Math.sin(since * 5);
      paw.current.position.set(stroke * 0.22, height * 1.02 - squish * 0.05 + (1 - pat) * 0.4, 0.3);
      paw.current.material.opacity = pat;
      paw.current.material.rotation = -stroke * 0.2 + Math.PI;
      paw.current.scale.setScalar(0.55);
    }
    hearts.current.forEach((sp, i) => {
      if (!sp) return;
      const life = patting ? (since * 0.8 + i / HEART_COUNT) % 1 : 0;
      sp.position.set((i % 2 ? 1 : -1) * (0.45 + Math.sin(t * 2 + i) * 0.06), height * 0.75 + life * 0.6, 0.2);
      sp.scale.setScalar(0.14 + life * 0.05);
      sp.material.opacity = patting ? Math.sin(life * Math.PI) * pat : 0;
    });
  });

  return (
    <group>
      <group ref={group}>
        <primitive object={model} />
      </group>
      <sprite ref={paw} renderOrder={5}>
        <spriteMaterial map={pawTex} transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} />
      </sprite>
      {Array.from({ length: HEART_COUNT }, (_, i) => (
        <sprite key={i} ref={(el) => (hearts.current[i] = el)}>
          <spriteMaterial map={heart} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

function Spinner({ spin, faceFront, children }) {
  const ref = useRef(null);
  useFrame(() => {
    if (!ref.current) return;
    const s = spin.current;
    if (faceFront && !s.dragging) {
      const full = Math.PI * 2;
      const nearest = Math.round(s.y / full) * full;
      s.y += (nearest - s.y) * 0.12;
    }
    const wiggle = s.hint && !s.dragging ? Math.sin((performance.now() / 1300) * Math.PI * 2) * 0.22 : 0;
    ref.current.rotation.y = s.y + wiggle;
  });
  return <group ref={ref}>{children}</group>;
}

const HINT_KEYFRAMES = `
@keyframes kodaSwipe { 0%, 100% { transform: translateX(-38px) rotate(-8deg); } 50% { transform: translateX(38px) rotate(8deg); } }
@keyframes kodaArc { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -24; } }
@keyframes kodaStroke { 0%, 100% { transform: translate(-20px, 0) rotate(-14deg); } 50% { transform: translate(20px, 6px) rotate(10deg); } }
@keyframes kodaHeart { 0% { opacity: 0; transform: translate(0, 0) scale(0.5); } 30% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--dx), -34px) scale(1.1); } }
@keyframes kodaHintIn { from { opacity: 0; transform: translateX(-50%) translateY(6px) scale(0.92); } to { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); } }
`;

const hintPill = {
  padding: "3px 10px",
  borderRadius: 999,
  background: "#fff8ee",
  border: "2px solid rgba(90, 70, 53, 0.25)",
  boxShadow: "0 3px 10px rgba(30, 60, 40, 0.14)",
  color: "#5a4635",
  fontWeight: 800,
  fontSize: 12,
  whiteSpace: "nowrap",
};

function SpinHint() {
  return (
    <div style={{ position: "absolute", left: "50%", bottom: "3%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none", animation: "kodaHintIn 0.35s ease-out both", zIndex: 3 }}>
      <div style={{ position: "relative", width: 140, height: 46 }}>
        <svg width="140" height="46" viewBox="0 0 140 46" style={{ position: "absolute", inset: 0 }}>
          <path d="M14 18 Q70 44 126 18" fill="none" stroke="#5a4635" strokeOpacity="0.55" strokeWidth="3" strokeDasharray="6 6" strokeLinecap="round" style={{ animation: "kodaArc 0.9s linear infinite" }} />
          <path d="M118 11 L127 18 L117 23" fill="none" stroke="#5a4635" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M22 11 L13 18 L23 23" fill="none" stroke="#5a4635" strokeOpacity="0.6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ position: "absolute", left: 56, top: 14, animation: "kodaSwipe 1.6s ease-in-out infinite", color: "#5a4635" }}>
          <Pointer size={26} strokeWidth={2.2} fill="#fff8ee" />
        </div>
      </div>
      <span style={hintPill}>spin me!</span>
    </div>
  );
}

function PetHint() {
  return (
    <div style={{ position: "absolute", left: "50%", top: "1%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", pointerEvents: "none", animation: "kodaHintIn 0.35s ease-out both", zIndex: 3 }}>
      <span style={hintPill}>pat my head!</span>
      <div style={{ position: "relative", width: 90, height: 44, marginTop: 2 }}>
        <div style={{ position: "absolute", left: 31, top: 6, animation: "kodaStroke 1.1s ease-in-out infinite", color: "#5a4635" }}>
          <Hand size={28} strokeWidth={2.2} fill="#fff8ee" style={{ transform: "rotate(180deg)" }} />
        </div>
        {[-18, 4, 22].map((dx, i) => (
          <span key={i} style={{ position: "absolute", left: 40 + dx, top: 20, color: "#f39bb6", fontSize: 13, "--dx": `${dx * 0.6}px`, animation: `kodaHeart 1.6s ease-out ${i * 0.45}s infinite` }}>
            ♥
          </span>
        ))}
      </div>
    </div>
  );
}

const AvatarStage = forwardRef(function AvatarStage(
  { avatarId, modelUrl, sizeScale = 1, offsetX = 0, hints = ["spin", "pet"], onReady, onInteract, onPat, className = "avatar-sculpture-stage" },
  ref,
) {
  const wrap = useRef(null);
  const pet = useRef({ until: 0, x: null });
  const spin = useRef({ y: 0, dragging: false, last: 0, moved: 0, hint: false });
  const pointer = useRef({ id: null, kind: null });
  const timer = useRef(null);
  const [mode, setMode] = useState({ name: "idle", key: 0 });
  const [staticAction, setStaticAction] = useState(null);
  const [phase, setPhase] = useState(0);
  const [ready, setReady] = useState(false);
  const Mood = MOODS[avatarId];
  const Pet = PETS[avatarId];
  const Happy = HAPPY[avatarId];
  const IdleRig = IDLE_RIGS[avatarId];
  const height = STAGE_HEIGHT * sizeScale * (STAGE_FIT[avatarId] ?? 1);

  const pending = avatarId === HINT_ANIMAL ? hints.filter((h) => h === "spin" || h === "pet") : [];
  const shownHint = ready && mode.name === "idle" && pending.length ? pending[phase % pending.length] : null;
  spin.current.hint = shownHint === "spin";

  useEffect(() => {
    clearTimeout(timer.current);
    setMode({ name: "idle", key: Date.now() });
    setStaticAction(null);
    setPhase(0);
    setReady(false);
    spin.current.y = 0;
  }, [avatarId]);

  useEffect(() => {
    if (pending.length < 2) return undefined;
    const id = setInterval(() => setPhase((p) => p + 1), 3200);
    return () => clearInterval(id);
  }, [pending.length]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleReady = useMemo(
    () => () => {
      setReady(true);
      onReady?.();
    },
    [onReady],
  );

  const toIdle = () => {
    clearTimeout(timer.current);
    setMode({ name: "idle", key: Date.now() });
  };

  const play = (name) => {
    if (name !== "happy") return;
    if (!Happy) {
      setStaticAction({ type: "hop", at: performance.now() / 1000 });
      return;
    }
    clearTimeout(timer.current);
    setMode({ name: "happy", key: Date.now() });
    timer.current = setTimeout(toIdle, 4200);
  };

  const startPat = (x = null, auto = false) => {
    const now = performance.now() / 1000;
    if (!auto) {
    }
    onPat?.();
    if (!Pet) {
      setStaticAction({ type: "pet", at: now });
      return;
    }
    clearTimeout(timer.current);
    pet.current = auto ? { until: now + 2.4, x: null, downAt: now } : { until: Infinity, x, downAt: now };
    setMode((m) => (m.name === "pet" ? m : { name: "pet", key: Date.now() }));
  };

  const celebrate = () => play("happy");

  useImperativeHandle(ref, () => ({ play, pat: () => startPat(null, true), celebrate }));

  const zone = (e) => {
    const r = wrap.current.getBoundingClientRect();
    const rx = (e.clientX - r.left) / r.width;
    const ry = (e.clientY - r.top) / r.height;
    return { head: ry > 0.06 && ry < 0.48 && rx > 0.22 && rx < 0.78, x: THREE.MathUtils.clamp((rx - 0.5) / 0.2, -1, 1) };
  };

  const onPointerDown = (e) => {
    onInteract?.();
    const z = zone(e);
    pointer.current = { id: e.pointerId, kind: z.head ? "pet" : "spin" };
    if (z.head) {
      startPat(z.x);
    } else {
      spin.current.dragging = true;
      spin.current.last = e.clientX;
      spin.current.moved = 0;
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (pointer.current.id !== e.pointerId) return;
    if (pointer.current.kind === "pet") {
      if (mode.name === "pet") pet.current = { ...pet.current, until: Infinity, x: zone(e).x };
      return;
    }
    if (!spin.current.dragging) return;
    const dx = e.clientX - spin.current.last;
    spin.current.y += dx * 0.012;
    spin.current.last = e.clientX;
    spin.current.moved += Math.abs(dx);
  };

  const onPointerUp = (e) => {
    if (pointer.current.id !== e.pointerId) return;
    if (pointer.current.kind === "pet" && Pet) {
      const now = performance.now() / 1000;
      const downAt = pet.current.downAt ?? now;
      pet.current = { until: Math.max(downAt + PET_HOLD, now + PET_LINGER), x: null };
    }
    spin.current.dragging = false;
    pointer.current = { id: null, kind: null };
  };

  const idleView = Mood ? (
    <Mood key={`idle-${avatarId}`} modelUrl={modelUrl} Rig={IdleRig} rigProps={{ onMounted: handleReady }} referenceHeight={height} />
  ) : (
    <StaticAvatar url={modelUrl} animal={avatarId} height={height} action={staticAction} />
  );

  let view = idleView;
  if (mode.name === "pet" && Pet) view = <Pet key={mode.key} pet={pet} onDone={toIdle} referenceHeight={height} />;
  else if (mode.name === "happy" && Happy) view = <Happy key={mode.key} referenceHeight={height} />;

  return (
    <div
      ref={wrap}
      className={className}
      style={{ position: "relative", touchAction: "none", cursor: "grab" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <style>{HINT_KEYFRAMES}</style>
      <Canvas
        dpr={[1, 1.5]}
        performance={{ min: 0.6 }}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance", toneMappingExposure: 1.15 }}
        camera={{ position: [0, 1.05, 4.4], fov: 34 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.85, 0)}
        style={{ background: "transparent", width: "100%", height: "100%" }}
      >
        <ambientLight intensity={1.0} color="#fff6ec" />
        <directionalLight position={[3, 5, 4]} intensity={1.8} color="#fff1e0" />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} color="#ffe4ee" />
        <directionalLight position={[0, 2, 6]} intensity={0.45} color="#ffffff" />
        <hemisphereLight args={["#ffffff", "#b9a99a", 0.8]} />
        <MatteScene key={`${avatarId}-${mode.name}-${mode.key}`} />
        <Suspense fallback={null}>
          {Mood ? null : <Ready key={`${avatarId}-${modelUrl}`} onReady={handleReady} />}
          <Spinner spin={spin} faceFront={mode.name !== "idle"}>
            <group position={[offsetX, 0, 0]}>
              <Suspense fallback={idleView}>{view}</Suspense>
            </group>
          </Spinner>
        </Suspense>
      </Canvas>
      {shownHint === "spin" && <SpinHint key={`spin-${phase}`} />}
      {shownHint === "pet" && <PetHint key={`pet-${phase}`} />}
    </div>
  );
});

export default AvatarStage;