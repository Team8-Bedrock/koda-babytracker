import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { PandaMood, smooth, pulse, getTexture } from "../panda/pandaRig";
import {
  meshesOf,
  normOf,
  borrowMesh,
  cuffTip,
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

export const KOALA_IDLE_MODEL = "/models/characters/koala/koala.glb";
export const KOALA_MODELS = {
  idle: KOALA_IDLE_MODEL,
  angry: "/models/characters/koala/angry.glb",
  feeding: "/models/characters/koala/feeding.glb",
  crying: KOALA_IDLE_MODEL,
  hungry: KOALA_IDLE_MODEL,
  sleepy: KOALA_IDLE_MODEL,
  sleeping: KOALA_IDLE_MODEL,
};

const RAW = {
  neck: [0.304, -0.2, 0.04],
  mouth: [0.305, -0.181, 0.094],
  nose: [0.305, -0.165, 0.105],
  earLeft: [0.27, -0.11, 0.03],
  earRight: [0.34, -0.108, 0.035],
  shoulderLeft: [0.272, -0.205, 0.045],
  shoulderRight: [0.336, -0.205, 0.045],
};
const MOUTH_TILT = 0.7;
const HEAD_MIN_Y = -0.17;
const EAR_MIN_Y = -0.115;
const ARM_BAND = [-0.235, -0.185];
const HAND_BAND = [-0.27, -0.23];
const LEG_MAX_Y = -0.29;
const GUM_COUNT = 6;
const GUM_COLORS = [
  ["#b9cfa9", "#7f9c76"],
  ["#a3bd94", "#6d8a68"],
  ["#c8d8b4", "#8fae84"],
];

const inBand = (y, [a, b]) => y > a && y < b;

function buildKoalaRig(gltf, idle) {
  const root = gltf.scene.clone(true);
  const norm = normOf(root);
  const idleNorm = idle.scene === gltf.scene ? norm : normOf(idle.scene);
  const { center, minY, k } = norm;
  const cx = center.x;
  const toRig = ([x, y, z]) => new THREE.Vector3((x - center.x) * k, (y - minY) * k, (z - center.z) * k);
  const v3 = (a) => new THREE.Vector3(...a);

  const parts = meshesOf(root);
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  const isHand = (p) => inBand(p.center.y, HAND_BAND) && Math.abs(p.center.x - cx) > 0.06 && p.size.y < 0.08;
  const armMeshes = (left) => parts.filter((p) => inBand(p.center.y, ARM_BAND) && p.size.y < 0.06 && (left ? p.center.x < cx - 0.02 : p.center.x > cx + 0.02));
  const leftArm = armMeshes(true);
  const rightArm = armMeshes(false);

  const ownHands = parts.filter(isHand);
  let hands;
  if (ownHands.length) {
    hands = ownHands.map((p) => ({ mesh: p.mesh, left: p.center.x < cx }));
  } else {
    const idleHands = meshesOf(idle.scene).filter(isHand);
    hands = [true, false]
      .map((left) => {
        const src = idleHands.find((p) => (left ? p.center.x < cx : p.center.x > cx));
        if (!src) return null;
        const h = borrowMesh(root, src);
        const shoulder = v3(left ? RAW.shoulderLeft : RAW.shoulderRight);
        const tip = cuffTip((left ? leftArm : rightArm).map((p) => p.mesh), shoulder);
        if (tip) {
          const out = tip.clone().sub(shoulder).normalize();
          const radius = Math.min(src.size.x, src.size.y, src.size.z) / 2;
          h.position.add(tip.clone().addScaledVector(out, radius * 0.45).sub(src.center));
        }
        return { mesh: h, left };
      })
      .filter(Boolean);
  }
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

  const earParts = headParts.filter((p) => p.center.y > EAR_MIN_Y && Math.abs(p.center.x - cx) > 0.03);
  const earLeft = makePivot(head, toRig(RAW.earLeft));
  const earRight = makePivot(head, toRig(RAW.earRight));
  const earLifeLeft = lifeLayer(earLeft, earParts.filter((p) => p.center.x < cx).map((p) => p.mesh));
  const earLifeRight = lifeLayer(earRight, earParts.filter((p) => p.center.x >= cx).map((p) => p.mesh));
  fitInnerEars(earLifeLeft);
  fitInnerEars(earLifeRight);

  const eyeParts = headParts.filter((p) => !earParts.includes(p) && p.center.z > 0.09 && p.size.y < 0.025 && Math.abs(p.center.x - cx) > 0.015);
  const [eyeLeft, eyeRight] = eyePair(
    head,
    eyeParts.map((p) => p.mesh),
    0,
    toRig([0.276, -0.15, 0.1]),
    toRig([0.334, -0.15, 0.104]),
  );

  const noseParts = headParts.filter((p) => !eyeParts.includes(p) && !earParts.includes(p) && p.center.z > 0.09 && Math.abs(p.center.x - cx) < 0.014 && p.center.y > -0.18 && p.center.y < -0.13 && p.size.x < 0.045);
  const nosePoint = noseParts.length ? unionOf(noseParts.map((p) => p.mesh)).getCenter(new THREE.Vector3()) : toRig(RAW.nose);
  const nose = makePivot(head, nosePoint);
  const noseLife = lifeLayer(nose, noseParts.map((p) => p.mesh));

  const mouthPoint = toRig(RAW.mouth);
  const mouthGroup = makePivot(head, mouthPoint);
  mouthGroup.rotation.x = MOUTH_TILT;
  const mouthMat = new THREE.MeshStandardMaterial({ color: "#4a2a2e", roughness: 0.75 });
  mouthMat.userData.kodaMatte = true;
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mouthMat);
  mouth.visible = false;
  mouthGroup.add(mouth);

  const bow = makePivot(rig, toRig([cx, -0.29, 0.0]));

  const armFor = (left) => {
    const arm = makePivot(rig, toRig(left ? RAW.shoulderLeft : RAW.shoulderRight));
    claim((left ? leftArm : rightArm).filter(free)).forEach((p) => arm.attach(p.mesh));
    hands.filter((h) => h.left === left).forEach((h) => arm.attach(h.mesh));
    return arm;
  };
  const armLeft = armFor(true);
  const armRight = armFor(false);
  const restDir = (left) => {
    const list = hands.filter((h) => h.left === left).map((h) => h.mesh);
    const shoulder = toRig(left ? RAW.shoulderLeft : RAW.shoulderRight);
    if (!list.length) return new THREE.Vector3(left ? -1 : 1, -1, 0.2).normalize();
    return unionOf(list).getCenter(new THREE.Vector3()).sub(shoulder).normalize();
  };

  const legFor = (left) => {
    const list = claim(parts.filter((p) => free(p) && p.center.y < LEG_MAX_Y && Math.abs(p.center.x - cx) > 0.008 && p.size.x < 0.06 && (left ? p.center.x < cx : p.center.x > cx)));
    const box = list.length ? unionOf(list.map((p) => p.mesh)) : null;
    const hip = box ? new THREE.Vector3((box.min.x + box.max.x) / 2, box.max.y, (box.min.z + box.max.z) / 2) : toRig([cx + (left ? -0.025 : 0.025), LEG_MAX_Y, 0.05]);
    const leg = makePivot(rig, hip);
    list.forEach((p) => leg.attach(p.mesh));
    return leg;
  };
  const legLeft = legFor(true);
  const legRight = legFor(false);

  const skullParts = headParts.filter((p) => !earParts.includes(p));
  const skull = skullParts.length ? unionOf(skullParts.map((p) => p.mesh)) : new THREE.Box3(neckPoint.clone(), neckPoint.clone().addScalar(0.6));
  const headTop = new THREE.Vector3(0, skull.max.y - 0.03, (skull.min.z + skull.max.z) / 2);
  const bagFor = (eye, sign) => eye.center.clone().add(new THREE.Vector3(sign * 0.02, -Math.max(eye.height * 1.1, 0.06), 0.02));
  const rel = (v) => v.clone().sub(neckPoint);

  const fx = new THREE.Group();
  rig.add(fx);
  const gumTextures = GUM_COLORS.map(getGumTexture);
  const gums = Array.from({ length: GUM_COUNT }, (_, i) => {
    const s = floaty(gumTextures[i % gumTextures.length]);
    fx.add(s);
    return s;
  });
  const sniffs = Array.from({ length: 3 }, () => {
    const s = floaty(getTexture("puff"));
    head.add(s);
    return s;
  });
  const hearts = Array.from({ length: 3 }, () => {
    const s = floaty(getTexture("heart"));
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
    koala: {
      earLeft: earLifeLeft,
      earRight: earLifeRight,
      nose: noseLife,
      noseLocal: head.worldToLocal(nosePoint.clone()),
      gums,
      sniffs,
      hearts,
      height: skull.max.y,
    },
  };
}

const gumCache = new Map();

function getGumTexture([light, dark]) {
  const key = light + dark;
  if (!gumCache.has(key)) {
    gumCache.set(
      key,
      canvasTexture((ctx) => {
        ctx.rotate(-0.5);
        const g = ctx.createLinearGradient(-30, -30, 30, 30);
        g.addColorStop(0, light);
        g.addColorStop(1, dark);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, -48);
        ctx.bezierCurveTo(34, -36, 36, 22, 0, 46);
        ctx.bezierCurveTo(-36, 22, -34, -36, 0, -48);
        ctx.fill();
        ctx.strokeStyle = "rgba(240,248,232,0.6)";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, -40);
        ctx.quadraticCurveTo(4, 0, 0, 40);
        ctx.stroke();
      }),
    );
  }
  return gumCache.get(key);
}

export function useKoalaRig(url, idleUrl) {
  const gltf = useGLTF(url);
  const idle = useGLTF(idleUrl || KOALA_IDLE_MODEL);
  return useMemo(() => buildKoalaRig(gltf, idle), [gltf, idle]);
}

function moodPose(mood, t, st, variant) {
  const p = {
    earDroop: 0,
    earBack: 0,
    earFlap: 0,
    flapSpeed: 3,
    earPoof: 0,
    earFlick: 1,
    sniff: 0,
    gums: 0,
    gumRain: 0,
    hearts: 0,
  };
  switch (mood) {
    case "angry": {
      const fit = 0.6 + 0.4 * Math.max(0, wave(t, 2.1));
      p.earBack = 0.5 * fit;
      p.earDroop = -0.15;
      p.earPoof = 0.18 * fit + Math.abs(wave(t, 29)) * 0.05;
      p.earFlick = 0;
      p.sniff = 0.6;
      break;
    }
    case "crying": {
      p.earDroop = 0.75 + wave(t, 3.4) * 0.04;
      p.earBack = 0.15;
      p.earPoof = -0.08;
      p.earFlick = 0;
      p.sniff = 0.5 + Math.max(0, wave(t, 5)) * 0.5;
      break;
    }
    case "hungry": {
      const growl = Math.pow(Math.max(0, wave(t, 1.1)), 12);
      p.earDroop = 0.35 + growl * 0.15;
      p.sniff = 1;
      p.earFlick = 0.5;
      break;
    }
    case "sleepy": {
      const nod = (Math.sin(t * 0.7) * 0.5 + 0.5) ** 2;
      const jerk = pulse(0, 0.2, (t % 6.5) / 6.5);
      p.earDroop = 0.25 + nod * 0.5 - jerk * 0.5;
      p.earPoof = jerk * 0.15;
      p.earFlick = 0.3;
      break;
    }
    case "sleeping": {
      const breath = wave(t, 1.2) * 0.5 + 0.5;
      p.earDroop = 0.55 + breath * 0.06;
      p.earPoof = breath * 0.04;
      p.earFlick = 0.12;
      p.gums = 0.25;
      break;
    }
    case "woke": {
      const fair = variant === "fair";
      const up = smooth(0.2, fair ? 2.6 : 1.1, st);
      const boing = Math.exp(-st * (fair ? 1.5 : 3)) * Math.sin(st * (fair ? 7 : 14));
      p.earDroop = (1 - up) * 0.55 - boing * 0.3;
      p.earPoof = Math.max(0, boing) * 0.25 + up * 0.04;
      p.sniff = up * 0.5;
      break;
    }
    case "happy": {
      p.earFlap = 0.28;
      p.flapSpeed = 7;
      p.earPoof = 0.06;
      p.gums = 0.6;
      p.hearts = 0.4;
      break;
    }
    case "energetic": {
      p.earFlap = 0.4;
      p.flapSpeed = 12;
      p.earPoof = 0.1;
      p.earFlick = 2;
      p.gums = 1;
      p.gumRain = 1;
      break;
    }
    case "quiet": {
      p.earDroop = 0.18 + wave(t, 0.6) * 0.04;
      p.earFlick = 0.5;
      p.gums = 0.3;
      break;
    }
    case "other": {
      const ponder = Math.sin(t * 0.9) * 0.5 + 0.5;
      p.earDroop = -0.05;
      p.earBack = -0.12 + ponder * 0.1;
      p.earFlick = 1.6;
      p.sniff = 0.3 + ponder * 0.4;
      break;
    }
    case "playtime": {
      p.earFlap = 0.3;
      p.flapSpeed = 5;
      p.earFlick = 1.5;
      p.gums = 0.8;
      p.gumRain = 0.5;
      break;
    }
    case "diaper": {
      const shake = Math.pow(Math.max(0, wave(t, 0.9)), 8);
      p.earFlap = shake * 0.5;
      p.flapSpeed = 20;
      p.earPoof = shake * 0.15;
      p.gums = 0.5;
      p.hearts = 0.3;
      break;
    }
    case "pet": {
      p.earDroop = 0.25;
      p.earBack = 0.2;
      p.earPoof = 0.08;
      p.earFlick = 0;
      p.hearts = 0.6;
      break;
    }
    case "refuse": {
      p.earBack = 0.5;
      p.earPoof = 0.15;
      p.earFlick = 0;
      p.sniff = 0.8;
      break;
    }
    case "comfort": {
      const lift = smooth(0.8, 2.6, st);
      p.earDroop = 0.7 * (1 - lift) + 0.05 * lift;
      p.earPoof = lift * 0.06;
      p.sniff = (1 - lift) * 0.8;
      p.hearts = lift * 0.5;
      p.earFlick = 0;
      break;
    }
    default:
      break;
  }
  return p;
}

export function useKoalaLife(rig, mood = "idle", variant) {
  const st = useRef(null);
  if (!st.current) {
    st.current = { start: null, phase: 0, earDroop: 0, earBack: 0, earFlap: 0, flapSpeed: 3, earPoof: 0, sniff: 0, gums: 0, gumRain: 0, hearts: 0 };
  }
  useFrame((state, delta) => {
    const kz = rig.koala;
    if (!kz) return;
    const s = st.current;
    const t = state.clock.elapsedTime;
    if (s.start === null) s.start = t;
    const since = t - s.start;
    const dt = Math.min(0.05, Math.max(0.001, delta));
    const p = moodPose(mood, t, since, variant);
    ["earDroop", "earBack", "earFlap", "flapSpeed", "earPoof", "sniff"].forEach((key) => {
      s[key] = approach(s[key], p[key], dt, 5);
    });
    ["gums", "gumRain", "hearts"].forEach((key) => {
      s[key] = approach(s[key], p[key], dt, 1.5);
    });
    s.phase += s.flapSpeed * dt;

    const flap = Math.sin(s.phase) * s.earFlap;
    const rate = p.earFlick;
    const flickL = rate ? twitch(t, 0.8 * rate, 0.4) : 0;
    const flickR = rate ? twitch(t, 0.8 * rate, 2.9) : 0;
    const poof = 1 + s.earPoof;
    kz.earLeft.rotation.set(-s.earBack - flickL * 0.1, flap * 0.5 + flickL * 0.2, s.earDroop + flap + flickL * 0.18);
    kz.earRight.rotation.set(-s.earBack - flickR * 0.1, -flap * 0.5 - flickR * 0.2, -s.earDroop - flap - flickR * 0.18);
    kz.earLeft.scale.set(poof, poof, 1 + s.earPoof * 0.5);
    kz.earRight.scale.set(poof, poof, 1 + s.earPoof * 0.5);

    const sniffBeat = s.sniff > 0.02 ? Math.pow(Math.max(0, Math.sin(t * 11)), 3) * twitch(t, 1.3, 0, 2) : 0;
    kz.nose.scale.set(1 + sniffBeat * 0.14 * s.sniff, 1 - sniffBeat * 0.06 * s.sniff, 1 + sniffBeat * 0.1 * s.sniff);
    kz.nose.position.y = sniffBeat * 0.004 * s.sniff;
    kz.sniffs.forEach((sp, i) => {
      const on = s.sniff > 0.25 && mood !== "crying";
      sp.visible = on;
      if (!on) return;
      const life = ((t * 1.4 + i / kz.sniffs.length) % 1 + 1) % 1;
      const side = i % 2 ? 1 : -1;
      sp.position.set(kz.noseLocal.x + side * (0.03 + life * 0.08), kz.noseLocal.y - 0.02 - life * 0.05, kz.noseLocal.z + 0.04 + life * 0.08);
      sp.scale.setScalar(0.03 + life * 0.05);
      sp.material.opacity = (1 - life) * 0.5 * s.sniff;
    });

    const H = 1.6;
    kz.gums.forEach((sp, i) => {
      const on = s.gums > 0.02;
      sp.visible = on;
      if (!on) return;
      const seed = i / kz.gums.length;
      const life = ((t * (0.12 + seed * 0.06) + seed) % 1 + 1) % 1;
      const fade = Math.sin(life * Math.PI);
      const side = i % 2 ? 1 : -1;
      const sway = Math.sin(t * 1.1 + i * 1.7) * (0.14 + s.gumRain * 0.1);
      const fall = s.gumRain > 0.05 ? 1.1 - life * 1.0 : 1.05 - life * 0.75;
      sp.position.set(side * (0.5 + seed * 0.4) + sway, H * fall, 0.12 + Math.cos(t * 0.8 + i) * 0.1);
      sp.scale.setScalar(0.075 + (i % 3) * 0.015);
      sp.material.rotation = Math.sin(t * 1.4 + i) * 0.9 + (s.gumRain > 0.05 ? t * 2 * side : 0);
      sp.material.opacity = fade * s.gums * 0.9;
    });

    kz.hearts.forEach((sp, i) => {
      const on = s.hearts > 0.02;
      sp.visible = on;
      if (!on) return;
      const life = ((t / 2.2 + i / kz.hearts.length) % 1 + 1) % 1;
      const side = i % 2 ? 1 : -1;
      sp.position.set(side * (0.62 + Math.sin(t * 2 + i) * 0.05), H * 0.75 + life * 0.5, 0.2);
      sp.scale.setScalar(0.08 + life * 0.03);
      sp.material.rotation = Math.sin(t * 3 + i) * 0.3;
      sp.material.opacity = Math.sin(life * Math.PI) * s.hearts;
    });
  });
}

function KoalaLife({ rig, mood, variant }) {
  useKoalaLife(rig, mood, variant);
  return null;
}

const lifeWrapped = new WeakMap();

export function withKoalaLife(Rig, mood = "idle") {
  if (!lifeWrapped.has(Rig)) lifeWrapped.set(Rig, new Map());
  const byMood = lifeWrapped.get(Rig);
  if (!byMood.has(mood)) {
    const Wrapped = (props) => (
      <>
        <Rig {...props} />
        <KoalaLife rig={props.rig} mood={mood} variant={props.variant ?? props.quality} />
      </>
    );
    byMood.set(mood, Wrapped);
  }
  return byMood.get(mood);
}

export function KoalaMood({ idleModelPath, modelUrl, Rig, mood = "idle", ...props }) {
  return (
    <PandaMood
      {...props}
      modelUrl={modelUrl || KOALA_IDLE_MODEL}
      Rig={withKoalaLife(Rig, mood)}
      idleModelPath={idleModelPath || KOALA_IDLE_MODEL}
      useRig={useKoalaRig}
    />
  );
}

export function KoalaIdleRig({ rig, motion }) {
  const own = useRef({ doze: 0, glance: 0, nextDoze: 4 + Math.random() * 3, dozeAt: -20 });
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const m = (motion || own).current;
    if (!motion) {
      if (t > m.nextDoze) {
        m.dozeAt = t;
        m.nextDoze = t + 7 + Math.random() * 5;
      }
      const u = (t - m.dozeAt) / 2.6;
      m.doze = u > 0 && u < 1 ? u : 0;
      m.glance = Math.sin(t * 0.3) * 0.18;
    }
    const u = m.doze || 0;
    const nod = u ? smooth(0, 0.55, u) * (1 - smooth(0.7, 0.8, u)) : 0;
    const startle = u ? pulse(0.7, 0.9, u) : 0;
    const breathe = 1 + Math.sin(t * 1.1) * 0.014;
    rig.rig.position.set(0, startle * (motion ? 0 : 0.03), 0);
    rig.rig.rotation.set(nod * 0.04, (m.glance || 0) * 0.3, Math.sin(t * 0.6) * 0.035);
    rig.rig.scale.set(1 / Math.sqrt(breathe), breathe, 1 / Math.sqrt(breathe));
    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(Math.sin(t * 0.7) * 0.03 + nod * 0.22 - startle * 0.1, Math.sin(t * 0.45) * 0.08 + (m.glance || 0) * 0.3, Math.sin(t * 0.5) * 0.05 + nod * 0.06);
    rig.head.scale.set(1, 1, 1);
    [rig.eyeLeft, rig.eyeRight].forEach((e) => e.inner.forEach((g) => g.scale.set(1, Math.max(0.08, 1 - nod * 0.9), 1)));
    rig.mouth.visible = false;
    rig.legLeft.rotation.set(0, 0, 0);
    rig.legRight.rotation.set(0, 0, 0);
    [
      [rig.armLeft, -1],
      [rig.armRight, 1],
    ].forEach(([arm, side]) => {
      arm.quaternion.identity();
      arm.rotation.set(Math.sin(t * 0.9 + side) * 0.05 - nod * 0.1, 0, side * (0.03 + Math.sin(t * 1.2 + side) * 0.03));
    });
  });
  return (
    <>
      <primitive object={rig.rig} />
      <KoalaLife rig={rig} mood="idle" />
    </>
  );
}