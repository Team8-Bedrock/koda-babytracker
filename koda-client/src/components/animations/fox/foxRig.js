import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { PandaMood, smooth, pulse, getTexture } from "../panda/pandaRig";
import {
  meshesOf,
  normOf,
  borrowMesh,
  makePivot,
  unionOf,
  stageRoot,
  eyePair,
  lifeLayer,
  canvasTexture,
  floaty,
  wave,
  twitch,
  approach,
} from "../panda/critterKit";
import { fitInnerEars } from "../earFix";

export const FOX_IDLE_MODEL = "/models/characters/fox/fox.glb";
export const FOX_MODELS = {
  idle: FOX_IDLE_MODEL,
  angry: "/models/characters/fox/angry.glb",
  feeding: "/models/characters/fox/feeding.glb",
  crying: FOX_IDLE_MODEL,
  hungry: FOX_IDLE_MODEL,
  sleepy: FOX_IDLE_MODEL,
  sleeping: FOX_IDLE_MODEL,
};

const RAW = {
  neck: [0.33, -0.1, 0.03],
  mouth: [0.34, 0.112, 0.372],
  earLeft: [0.15, 0.42, -0.03],
  earRight: [0.53, 0.42, 0.02],
  shoulderLeft: [0.12, -0.2, 0.06],
  shoulderRight: [0.5, -0.2, 0.05],
  tail: [0.29, -0.6, -0.14],
};
const MOUTH_TILT = 0.25;
const HEAD_MIN_Y = -0.05;
const EAR_MIN_Y = 0.35;
const ARM_BAND = [-0.42, -0.2];
const HAND_BAND = [-0.56, -0.44];
const LEG_MAX_Y = -0.6;
const LEAF_COUNT = 7;
const LEAF_COLORS = [
  ["#ffb347", "#e2622b"],
  ["#f7c95c", "#d98a2b"],
  ["#e8743b", "#b8401f"],
];

const inBand = (y, [a, b]) => y > a && y < b;

function buildFoxRig(gltf, idle) {
  const root = gltf.scene.clone(true);
  const norm = normOf(root);
  const idleNorm = idle.scene === gltf.scene ? norm : normOf(idle.scene);
  const { center, minY, k } = norm;
  const midX = center.x;
  const toRig = ([x, y, z]) => new THREE.Vector3((x - center.x) * k, (y - minY) * k, (z - center.z) * k);

  const parts = meshesOf(root);
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const isHand = (p) => inBand(p.center.y, HAND_BAND) && Math.abs(p.center.x - midX) > 0.35;
  const ownHands = parts.filter(isHand);
  const hands = (ownHands.length ? ownHands.map((p) => ({ mesh: p.mesh, left: p.center.x < midX })) : meshesOf(idle.scene)
    .filter(isHand)
    .map((p) => ({ mesh: borrowMesh(root, p), left: p.center.x < midX })));
  const claimed = new Set(hands.map((h) => h.mesh));
  const free = (p) => !claimed.has(p.mesh);
  const claim = (list) => {
    list.forEach((p) => claimed.add(p.mesh));
    return list;
  };

  const rig = stageRoot(root, norm);

  const neckPoint = toRig(RAW.neck);
  const head = makePivot(rig, neckPoint);
  const headParts = claim(parts.filter((p) => free(p) && p.center.y > HEAD_MIN_Y));
  headParts.forEach((p) => head.attach(p.mesh));
  const headBase = head.position.clone();

  const earParts = headParts.filter((p) => p.center.y > EAR_MIN_Y);
  const earLeft = makePivot(head, toRig(RAW.earLeft));
  const earRight = makePivot(head, toRig(RAW.earRight));
  const earLifeLeft = lifeLayer(earLeft, earParts.filter((p) => p.center.x < midX).map((p) => p.mesh));
  const earLifeRight = lifeLayer(earRight, earParts.filter((p) => p.center.x >= midX).map((p) => p.mesh));
  fitInnerEars(earLifeLeft);
  fitInnerEars(earLifeRight);

  const eyeParts = headParts.filter((p) => p.center.z > 0.25 && p.center.y > 0.2 && p.center.y < 0.3 && Math.abs(p.center.x - midX) > 0.1);
  const [eyeLeft, eyeRight] = eyePair(
    head,
    eyeParts.map((p) => p.mesh),
    0,
    toRig([midX - 0.12, 0.25, 0.3]),
    toRig([midX + 0.12, 0.25, 0.3]),
  );

  const mouthPoint = toRig(RAW.mouth);
  const noseParts = headParts.filter((p) => !eyeParts.includes(p) && !earParts.includes(p) && p.center.z > 0.36 && Math.abs(p.center.x - midX) < 0.05 && p.size.x < 0.12 && p.center.y > RAW.mouth[1]);
  const nosePoint = noseParts.length ? unionOf(noseParts.map((p) => p.mesh)).getCenter(new THREE.Vector3()) : mouthPoint.clone().add(new THREE.Vector3(0, 0.07 * k, 0.03 * k));
  const nose = makePivot(head, nosePoint);
  noseParts.forEach((p) => nose.attach(p.mesh));

  const mouthGroup = makePivot(head, mouthPoint);
  mouthGroup.rotation.x = MOUTH_TILT;
  const mouthMat = new THREE.MeshStandardMaterial({ color: "#5a1d1a", roughness: 0.75 });
  mouthMat.userData.kodaMatte = true;
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mouthMat);
  mouth.visible = false;
  mouthGroup.add(mouth);

  const tailParts = claim(parts.filter((p) => free(p) && p.center.z < -0.2 && p.center.y > -0.85 && p.center.y < -0.5));
  const tailPoint = toRig(RAW.tail);
  const bow = makePivot(rig, tailPoint);
  const tailLife = lifeLayer(bow, tailParts.map((p) => p.mesh));

  const armFor = (left, shoulderRaw) => {
    const arm = makePivot(rig, toRig(shoulderRaw));
    claim(parts.filter((p) => free(p) && inBand(p.center.y, ARM_BAND) && p.size.y < 0.45 && (left ? p.center.x < midX - 0.15 : p.center.x > midX + 0.15))).forEach((p) => arm.attach(p.mesh));
    hands.filter((h) => h.left === left).forEach((h) => arm.attach(h.mesh));
    return arm;
  };
  const armLeft = armFor(true, RAW.shoulderLeft);
  const armRight = armFor(false, RAW.shoulderRight);
  const restDir = (left) => {
    const list = hands.filter((h) => h.left === left).map((h) => h.mesh);
    const shoulder = toRig(left ? RAW.shoulderLeft : RAW.shoulderRight);
    if (!list.length) return new THREE.Vector3(left ? -1 : 1, -1, 0.3).normalize();
    return unionOf(list).getCenter(new THREE.Vector3()).sub(shoulder).normalize();
  };

  const legFor = (left) => {
    const list = claim(parts.filter((p) => free(p) && p.center.y < LEG_MAX_Y && p.center.z > -0.2 && Math.abs(p.center.x - midX) > 0.03 && p.size.x < 0.3 && p.size.y < 0.35 && (left ? p.center.x < midX : p.center.x > midX)));
    const box = list.length ? unionOf(list.map((p) => p.mesh)) : null;
    const hip = box ? new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2) : toRig([midX + (left ? -0.1 : 0.1), LEG_MAX_Y, 0.03]);
    const leg = makePivot(rig, hip);
    list.forEach((p) => leg.attach(p.mesh));
    return leg;
  };
  const legLeft = legFor(true);
  const legRight = legFor(false);

  const skullParts = headParts.filter((p) => !earParts.includes(p));
  const skull = skullParts.length ? unionOf(skullParts.map((p) => p.mesh)) : new THREE.Box3(neckPoint.clone(), neckPoint.clone().addScalar(0.6));
  const headTop = new THREE.Vector3(0, skull.max.y - 0.03, (skull.min.z + skull.max.z) / 2);
  const bagFor = (eye, sign) => {
    const drop = Math.max(eye.height * 0.9, 0.05);
    return eye.center.clone().add(new THREE.Vector3(sign * 0.02, -drop, 0.02));
  };
  const rel = (v) => v.clone().sub(neckPoint);

  const fx = new THREE.Group();
  rig.add(fx);
  const leafTextures = LEAF_COLORS.map(getMapleTexture);
  const leaves = Array.from({ length: LEAF_COUNT }, (_, i) => {
    const s = floaty(leafTextures[i % leafTextures.length]);
    fx.add(s);
    return s;
  });
  const napLeaf = floaty(leafTextures[0]);
  head.add(napLeaf);
  const sparkles = Array.from({ length: 3 }, () => {
    const s = floaty(getTexture("sparkle"));
    fx.add(s);
    return s;
  });

  rig.updateMatrixWorld(true);

  return {
    rig,
    norm,
    idleNorm,
    toRig,
    head,
    headBase,
    earLeft,
    earRight,
    eyeLeft,
    eyeRight,
    nose,
    mouth,
    bow,
    armLeft,
    armRight,
    legLeft,
    legRight,
    restLeft: restDir(true),
    restRight: restDir(false),
    shoulderLeft: toRig(RAW.shoulderLeft),
    shoulderRight: toRig(RAW.shoulderRight),
    mouthOffset: rel(mouthPoint),
    noseOffset: rel(nosePoint),
    headTopOffset: rel(headTop),
    eyeOffsetLeft: rel(eyeLeft.center),
    eyeOffsetRight: rel(eyeRight.center),
    eyeBagOffsetLeft: rel(bagFor(eyeLeft, -1)),
    eyeBagOffsetRight: rel(bagFor(eyeRight, 1)),
    fox: {
      tail: tailLife,
      earLeft: earLifeLeft,
      earRight: earLifeRight,
      leaves,
      napLeaf,
      napSpot: head.worldToLocal(headTop.clone().add(new THREE.Vector3(0.08, 0.04, 0.05))),
      sparkles,
      height: skull.max.y,
    },
  };
}

const mapleCache = new Map();

function getMapleTexture([light, dark]) {
  const key = light + dark;
  if (!mapleCache.has(key)) {
    mapleCache.set(
      key,
      canvasTexture((ctx) => {
        const g = ctx.createLinearGradient(-40, -40, 40, 40);
        g.addColorStop(0, light);
        g.addColorStop(1, dark);
        ctx.fillStyle = g;
        ctx.beginPath();
        const lobes = 5;
        for (let i = 0; i <= lobes * 2; i++) {
          const a = -Math.PI / 2 + (i / (lobes * 2)) * Math.PI * 1.6 - Math.PI * 0.3;
          const r = i % 2 === 0 ? 46 : 20;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r * 0.95 - 4;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.quadraticCurveTo(Math.cos(a - 0.15) * r * 0.85, Math.sin(a - 0.15) * r * 0.85 - 4, x, y);
        }
        ctx.lineTo(0, 22);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "rgba(255,236,200,0.55)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, 40);
        ctx.lineTo(0, -30);
        ctx.moveTo(0, 6);
        ctx.lineTo(-24, -18);
        ctx.moveTo(0, 6);
        ctx.lineTo(24, -18);
        ctx.stroke();
      }),
    );
  }
  return mapleCache.get(key);
}

export function useFoxRig(url, idleUrl) {
  const gltf = useGLTF(url);
  const idle = useGLTF(idleUrl || FOX_IDLE_MODEL);
  return useMemo(() => buildFoxRig(gltf, idle), [gltf, idle]);
}

function moodPose(mood, t, st, variant) {
  const p = {
    wag: 0.12,
    wagSpeed: 1.6,
    lift: 0,
    side: 0,
    curl: 0,
    fluff: 0,
    bristle: 0,
    earBack: 0,
    earSplay: 0,
    earTwitch: 1,
    leaves: 0,
    swirl: 0,
    nap: 0,
    sparkles: 0,
  };
  switch (mood) {
    case "angry": {
      const fit = 0.6 + 0.4 * Math.max(0, wave(t, 2.1));
      p.wag = 0.05;
      p.wagSpeed = 9;
      p.lift = 0.35 * fit;
      p.fluff = 0.3 * fit;
      p.bristle = 0.05 * fit;
      p.earBack = 0.55;
      p.earSplay = -0.1;
      p.earTwitch = 0;
      break;
    }
    case "crying": {
      p.wag = 0.04;
      p.wagSpeed = 1;
      p.lift = -0.35;
      p.side = 0.55 + wave(t, 0.8) * 0.05;
      p.fluff = -0.12;
      p.earBack = 0.25;
      p.earSplay = 0.55 + wave(t, 6) * 0.03;
      p.earTwitch = 0;
      break;
    }
    case "hungry": {
      const growl = Math.pow(Math.max(0, wave(t, 1.1)), 12);
      p.wag = 0.08 + growl * 0.2;
      p.wagSpeed = 1.2 + growl * 10;
      p.lift = -0.22;
      p.earSplay = 0.3 - growl * 0.25;
      p.earBack = 0.1;
      p.earTwitch = 0.4;
      break;
    }
    case "sleepy": {
      const nod = (Math.sin(t * 0.7) * 0.5 + 0.5) ** 2;
      const jerk = pulse(0, 0.2, (t % 6.5) / 6.5);
      p.wag = 0.06;
      p.wagSpeed = 0.7;
      p.lift = -0.2 - nod * 0.15 + jerk * 0.3;
      p.side = 0.2 * nod;
      p.earSplay = 0.45 * nod - jerk * 0.4;
      p.earTwitch = 0.3;
      break;
    }
    case "sleeping": {
      const breath = wave(t, 1.2) * 0.5 + 0.5;
      p.wag = 0.015;
      p.wagSpeed = 0.6;
      p.side = 0.95;
      p.lift = -0.1;
      p.curl = 0.25 + breath * 0.05;
      p.fluff = 0.08 + breath * 0.03;
      p.earSplay = 0.4;
      p.earBack = 0.15;
      p.earTwitch = 0.15;
      p.nap = 1;
      break;
    }
    case "woke": {
      const fair = variant === "fair";
      const up = smooth(0.2, fair ? 2.6 : 1.1, st);
      const boing = Math.exp(-st * (fair ? 1.5 : 3)) * Math.sin(st * (fair ? 7 : 14));
      p.wag = 0.1 + up * 0.15;
      p.wagSpeed = 2 + up * 3;
      p.lift = -0.2 + up * 0.45 + boing * 0.2;
      p.fluff = boing * 0.15 + up * 0.05;
      p.earSplay = (1 - up) * 0.45 - boing * 0.2;
      p.sparkles = fair ? 0.3 : up * 0.7;
      break;
    }
    case "happy": {
      p.wag = 0.45;
      p.wagSpeed = 9;
      p.lift = 0.35;
      p.fluff = 0.08;
      p.earSplay = -0.08 + Math.abs(wave(t, 5)) * 0.08;
      p.leaves = 0.5;
      p.sparkles = 0.4;
      break;
    }
    case "energetic": {
      p.wag = 0.6;
      p.wagSpeed = 14;
      p.lift = 0.5;
      p.fluff = 0.12;
      p.earSplay = -0.12;
      p.earTwitch = 2;
      p.leaves = 1;
      p.swirl = 1;
      break;
    }
    case "quiet": {
      p.wag = 0.1;
      p.wagSpeed = 0.8;
      p.side = 0.35 + wave(t, 0.5) * 0.08;
      p.lift = -0.05;
      p.earSplay = 0.12;
      p.earTwitch = 0.6;
      p.leaves = 0.25;
      break;
    }
    case "other": {
      const ponder = Math.sin(t * 0.9) * 0.5 + 0.5;
      p.wag = 0.06;
      p.wagSpeed = 1;
      p.lift = 0.45;
      p.curl = 0.5 + ponder * 0.25;
      p.earSplay = -0.05;
      p.earBack = -0.1 + ponder * 0.12;
      p.earTwitch = 1.6;
      p.sparkles = 0.25;
      break;
    }
    case "playtime": {
      const pounce = Math.abs(wave(t, 3.5));
      p.wag = 0.5;
      p.wagSpeed = 7;
      p.lift = 0.25 + pounce * 0.25;
      p.fluff = pounce * 0.08;
      p.earSplay = -0.1 + pounce * 0.06;
      p.earTwitch = 1.5;
      p.leaves = 0.9;
      p.swirl = 0.6;
      break;
    }
    case "diaper": {
      const shake = Math.pow(Math.max(0, wave(t, 0.9)), 8);
      p.wag = 0.3 + shake * 0.3;
      p.wagSpeed = 4 + shake * 14;
      p.lift = 0.3;
      p.fluff = 0.05 + shake * 0.18;
      p.sparkles = 0.8;
      break;
    }
    case "pet": {
      p.wag = 0.5;
      p.wagSpeed = 8;
      p.lift = 0.3;
      p.earBack = 0.35;
      p.earSplay = 0.2;
      p.earTwitch = 0;
      p.leaves = 0.35;
      break;
    }
    case "refuse": {
      p.wag = 0.25;
      p.wagSpeed = 10;
      p.lift = 0.4;
      p.fluff = 0.25;
      p.bristle = 0.04;
      p.earBack = 0.5;
      p.earTwitch = 0;
      break;
    }
    case "comfort": {
      const lift = smooth(0.8, 2.6, st);
      p.wag = 0.04 + lift * 0.3;
      p.wagSpeed = 1 + lift * 6;
      p.lift = -0.35 * (1 - lift) + 0.25 * lift;
      p.side = 0.55 * (1 - lift);
      p.earSplay = 0.55 * (1 - lift);
      p.earBack = 0.25 * (1 - lift);
      p.leaves = lift * 0.4;
      break;
    }
    default:
      break;
  }
  return p;
}

export function useFoxLife(rig, mood = "idle", variant) {
  const st = useRef(null);
  if (!st.current) {
    st.current = { start: null, phase: 0, wag: 0.12, wagSpeed: 1.6, lift: 0, side: 0, curl: 0, fluff: 0, earBack: 0, earSplay: 0, leaves: 0, nap: 0, sparkles: 0, swirl: 0 };
  }
  useFrame((state, delta) => {
    const f = rig.fox;
    if (!f) return;
    const s = st.current;
    const t = state.clock.elapsedTime;
    if (s.start === null) s.start = t;
    const since = t - s.start;
    const dt = Math.min(0.05, Math.max(0.001, delta));
    const p = moodPose(mood, t, since, variant);
    ["wag", "wagSpeed", "lift", "side", "curl", "fluff", "earBack", "earSplay", "swirl"].forEach((key) => {
      s[key] = approach(s[key], p[key], dt, 5);
    });
    s.leaves = approach(s.leaves, p.leaves, dt, 1.5);
    s.nap = approach(s.nap, p.nap, dt, 1.2);
    s.sparkles = approach(s.sparkles, p.sparkles, dt, 3);
    s.phase += s.wagSpeed * dt;

    const bristle = p.bristle ? (Math.sin(t * 61) + Math.sin(t * 97) * 0.5) * p.bristle : 0;
    f.tail.rotation.set(s.lift + bristle, s.side + Math.sin(s.phase) * s.wag, s.curl * Math.sin(s.phase * 0.5 + 1) * 0.4 + s.curl * 0.3);
    const fluff = 1 + s.fluff + Math.abs(bristle) * 0.6;
    f.tail.scale.set(fluff, 1 + s.fluff * 0.5, fluff);

    const rate = p.earTwitch;
    const flickL = rate ? twitch(t, 0.9 * rate, 0) : 0;
    const flickR = rate ? twitch(t, 0.9 * rate, 2.3) : 0;
    f.earLeft.rotation.set(-s.earBack - flickL * 0.12, flickL * 0.25, s.earSplay + flickL * 0.2);
    f.earRight.rotation.set(-s.earBack - flickR * 0.12, -flickR * 0.25, -s.earSplay - flickR * 0.2);

    const H = 1.6;
    f.leaves.forEach((sp, i) => {
      const on = s.leaves > 0.02;
      sp.visible = on;
      if (!on) return;
      const seed = i / f.leaves.length;
      const life = ((t * (0.18 + seed * 0.08) + seed) % 1 + 1) % 1;
      const fade = Math.sin(life * Math.PI);
      if (s.swirl > 0.05) {
        const a = seed * Math.PI * 2 + t * (1.2 + seed) * s.swirl;
        const r = 0.65 + Math.sin(t * 0.7 + i) * 0.08;
        sp.position.set(Math.cos(a) * r, H * (0.12 + life * 0.6), Math.sin(a) * r * 0.5 + 0.15);
      } else {
        const side = i % 2 ? 1 : -1;
        sp.position.set(side * (0.55 + seed * 0.35) + Math.sin(t * 1.3 + i) * 0.12, H * (1.05 - life * 0.9), 0.15 + Math.cos(t + i) * 0.1);
      }
      sp.scale.setScalar(0.09 + (i % 3) * 0.02);
      sp.material.rotation = t * (1.5 + seed * 2) * (i % 2 ? 1 : -1);
      sp.material.opacity = fade * s.leaves * 0.95;
    });

    const nap = f.napLeaf;
    nap.visible = s.nap > 0.02;
    if (nap.visible) {
      const settle = smooth(0, 1, s.nap);
      const breath = wave(t, 1.2) * 0.5 + 0.5;
      nap.position.set(f.napSpot.x + (1 - settle) * 0.25, f.napSpot.y + (1 - settle) * 0.5 + breath * 0.012, f.napSpot.z);
      nap.material.rotation = 0.5 + (1 - settle) * Math.sin(t * 3) * 0.8 + breath * 0.04;
      nap.material.opacity = settle;
      nap.scale.setScalar(0.12);
    }

    f.sparkles.forEach((sp, i) => {
      const on = s.sparkles > 0.02;
      sp.visible = on;
      if (!on) return;
      const life = ((t / 1.6 + i / f.sparkles.length) % 1 + 1) % 1;
      const a = i * 2.1 + t * 0.5;
      sp.position.set(Math.cos(a) * 0.6, H * 0.95 + life * 0.25, 0.2 + Math.sin(a) * 0.1);
      sp.scale.setScalar(0.05 + Math.sin(life * Math.PI) * 0.04);
      sp.material.opacity = Math.sin(life * Math.PI) * s.sparkles;
      sp.material.rotation = t + i;
    });
  });
}

function FoxLife({ rig, mood, variant }) {
  useFoxLife(rig, mood, variant);
  return null;
}

const lifeWrapped = new WeakMap();

export function withFoxLife(Rig, mood = "idle") {
  if (!lifeWrapped.has(Rig)) lifeWrapped.set(Rig, new Map());
  const byMood = lifeWrapped.get(Rig);
  if (!byMood.has(mood)) {
    const Wrapped = (props) => (
      <>
        <Rig {...props} />
        <FoxLife rig={props.rig} mood={mood} variant={props.variant ?? props.quality} />
      </>
    );
    byMood.set(mood, Wrapped);
  }
  return byMood.get(mood);
}

export function FoxMood({ idleModelPath, modelUrl, Rig, mood = "idle", ...props }) {
  return (
    <PandaMood
      {...props}
      modelUrl={modelUrl || FOX_IDLE_MODEL}
      Rig={withFoxLife(Rig, mood)}
      idleModelPath={idleModelPath || FOX_IDLE_MODEL}
      useRig={useFoxRig}
    />
  );
}

export function FoxIdleRig({ rig, motion }) {
  const own = useRef({ pounce: 0, glance: 0, nextPounce: 3 + Math.random() * 3, pounceAt: -10, sniffAt: -10 });
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const m = (motion || own).current;
    if (!motion) {
      if (t > m.nextPounce) {
        m.pounceAt = t;
        m.nextPounce = t + 4 + Math.random() * 4;
      }
      const u = (t - m.pounceAt) / 0.9;
      m.pounce = u > 0 && u < 1 ? u : 0;
      m.glance = Math.sin(t * 0.4) * 0.25;
    }
    const u = m.pounce || 0;
    const crouch = u ? pulse(0, 0.45, u) : 0;
    const leap = u ? pulse(0.4, 0.85, u) : 0;
    const breathe = 1 + Math.sin(t * 1.5) * 0.012 - crouch * 0.06 + leap * 0.04;
    rig.rig.position.set(0, motion ? 0 : leap * 0.12, leap * 0.04);
    rig.rig.rotation.set(crouch * 0.08 - leap * 0.06, (m.glance || 0) * 0.35, Math.sin(t * 1.1) * 0.02);
    rig.rig.scale.set(1 / Math.sqrt(breathe), breathe, 1 / Math.sqrt(breathe));
    rig.head.position.copy(rig.headBase);
    const sniff = Math.max(0, Math.sin(t * 9)) * twitch(t, 0.35, 1, 6);
    rig.head.rotation.set(Math.sin(t * 0.9) * 0.03 + crouch * 0.12 - sniff * 0.04, Math.sin(t * 0.55) * 0.12 + (m.glance || 0) * 0.35, Math.sin(t * 0.7) * 0.06);
    rig.head.scale.set(1, 1, 1);
    rig.nose.scale.setScalar(1 + sniff * 0.12);
    rig.mouth.visible = false;
    rig.legLeft.rotation.set(-leap * 0.3, 0, 0);
    rig.legRight.rotation.set(-leap * 0.3, 0, 0);
    [
      [rig.armLeft, -1],
      [rig.armRight, 1],
    ].forEach(([arm, side]) => {
      arm.quaternion.identity();
      arm.rotation.set(Math.sin(t * 1.1 + side) * 0.06 - crouch * 0.25 - leap * 0.35, 0, side * (0.03 + Math.sin(t * 1.6 + side) * 0.04));
    });
  });
  return (
    <>
      <primitive object={rig.rig} />
      <FoxLife rig={rig} mood="idle" />
    </>
  );
}