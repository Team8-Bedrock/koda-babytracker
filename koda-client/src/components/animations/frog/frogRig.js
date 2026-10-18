import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { LOCAL_REFERENCE_HEIGHT, PandaMood, getTexture, smooth, pulse } from "../panda/pandaRig";

export const FROG_IDLE_MODEL = "/models/characters/frog/frog.glb";
export const FROG_MODELS = {
  idle: FROG_IDLE_MODEL,
  angry: "/models/characters/frog/angry.glb",
  crying: "/models/characters/frog/crying.glb",
  feeding: "/models/characters/frog/feeding.glb",
  hungry: "/models/characters/frog/hungry.glb",
  sleeping: "/models/characters/frog/sleeping.glb",
  sleepy: "/models/characters/frog/sleepy.glb",
};

const HEAD_Y = 0.95;
const MOUTH_TILT = 0.45;
const LEAF_GRAVITY = 9;
const LEAF_GAIN = 0.12;
const DROP_COUNT = 3;
const PUFF_COUNT = 4;
const SPARKLE_COUNT = 4;
const PETAL_COUNT = 5;
const PETAL_COLOR = "#ffb3cf";
const PETAL_TIP = "#ff8fb8";
const FLOWER_HEART = "#ffd84d";
const BUD_COLOR = "#ff9fc4";

const isLine = ([r, g, b]) => Math.max(r, g, b) < 0.07;
const isBulb = ([r, g, b]) => r > 0.4 && g > 0.62 && b < 0.3;
const isLeafColor = ([r, g, b]) => g > 0.14 && g < 0.3 && r < 0.09 && b < 0.06;
const isStemColor = ([r, g, b]) => g > 0.34 && g < 0.52 && r > 0.1 && r < 0.24 && b < 0.06;
const isHandColor = ([r, g, b]) => r > 0.23 && r < 0.38 && g > 0.5 && g < 0.68;
const isSleeveColor = ([r, g, b]) => r > 0.08 && r < 0.22 && g > 0.6;
const isCuffColor = ([r, g, b]) => r < 0.09 && g > 0.28 && g < 0.4;

function averageColor(mesh) {
  const col = mesh.geometry?.attributes?.color;
  if (col) {
    const sum = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < col.count; i += 7) {
      sum[0] += col.getX(i);
      sum[1] += col.getY(i);
      sum[2] += col.getZ(i);
      n++;
    }
    return sum.map((v) => v / Math.max(1, n));
  }
  const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const c = m?.color || new THREE.Color(1, 1, 1);
  return [c.r, c.g, c.b];
}

function measure(mesh) {
  const box = new THREE.Box3().setFromObject(mesh);
  return { mesh, box, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()), color: averageColor(mesh) };
}

function normalizedParts(scene) {
  const root = scene.clone(true);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const k = LOCAL_REFERENCE_HEIGHT / (size.y || 1);
  root.position.set(-center.x, -box.min.y, -center.z);
  const scaled = new THREE.Group();
  scaled.add(root);
  scaled.scale.setScalar(k);
  const rig = new THREE.Group();
  rig.add(scaled);
  rig.updateMatrixWorld(true);
  const meshes = [];
  rig.traverse((o) => {
    if (o.isMesh) meshes.push({ mesh: o, matrix: o.matrixWorld.clone() });
  });
  meshes.forEach(({ mesh, matrix }) => {
    mesh.geometry = mesh.geometry.clone();
    mesh.geometry.applyMatrix4(matrix);
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    rig.add(mesh);
  });
  rig.remove(scaled);
  rig.updateMatrixWorld(true);
  const parts = [];
  rig.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    parts.push(measure(o));
  });
  return { rig, parts, norm: { center: center.clone(), minY: box.min.y, k } };
}

function unionBox(list) {
  const b = new THREE.Box3();
  list.forEach((p) => b.union(p.box));
  return b;
}

function extremeVertex(list, score) {
  const v = new THREE.Vector3();
  let best = null;
  let bestScore = -Infinity;
  list.forEach((p) => {
    const pos = p.mesh.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 1500));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(p.mesh.matrixWorld);
      const s = score(v);
      if (s > bestScore) {
        bestScore = s;
        best = v.clone();
      }
    }
  });
  return best;
}

function ownMaterial(mesh) {
  const fix = (m) => {
    const c = m.clone();
    if ("roughness" in c) c.roughness = 1;
    if ("metalness" in c) c.metalness = 0;
    if (c.emissive) c.emissive.set("#000000");
    c.userData.kodaMatte = true;
    return c;
  };
  mesh.material = Array.isArray(mesh.material) ? mesh.material.map(fix) : fix(mesh.material);
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material];
}

function softMaterial(color) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0 });
  m.userData.kodaMatte = true;
  return m;
}

function makeFlower(size) {
  const flower = new THREE.Group();
  const bloom = new THREE.Group();
  flower.add(bloom);
  const heart = new THREE.Mesh(new THREE.SphereGeometry(size * 0.32, 16, 12), softMaterial(FLOWER_HEART));
  heart.scale.set(1, 0.7, 1);
  heart.position.y = size * 0.08;
  bloom.add(heart);
  const petals = [];
  for (let i = 0; i < PETAL_COUNT; i++) {
    const hinge = new THREE.Group();
    hinge.rotation.y = (i / PETAL_COUNT) * Math.PI * 2;
    const tilt = new THREE.Group();
    hinge.add(tilt);
    const petal = new THREE.Mesh(new THREE.SphereGeometry(size * 0.42, 14, 10), softMaterial(i % 2 ? PETAL_TIP : PETAL_COLOR));
    petal.scale.set(0.62, 0.22, 1);
    petal.position.set(0, 0, size * 0.42);
    tilt.add(petal);
    bloom.add(hinge);
    petals.push(tilt);
  }
  const sepal = new THREE.Mesh(new THREE.SphereGeometry(size * 0.3, 12, 8), softMaterial("#5aa83a"));
  sepal.scale.set(1, 0.45, 1);
  sepal.position.y = -size * 0.06;
  bloom.add(sepal);
  flower.scale.setScalar(0.0001);
  flower.visible = false;
  return { flower, bloom, petals };
}

function makeBud(size) {
  const bud = new THREE.Group();
  const head = new THREE.Mesh(new THREE.SphereGeometry(size * 0.5, 14, 10), softMaterial(BUD_COLOR));
  head.scale.set(0.8, 1.15, 0.8);
  head.position.y = size * 0.45;
  const cup = new THREE.Mesh(new THREE.SphereGeometry(size * 0.42, 12, 8), softMaterial("#5aa83a"));
  cup.scale.set(1, 0.6, 1);
  cup.position.y = size * 0.2;
  bud.add(head, cup);
  bud.scale.setScalar(0.0001);
  bud.visible = false;
  return bud;
}

function spriteOf(kind, opacity = 0) {
  const m = new THREE.SpriteMaterial({ map: getTexture(kind), transparent: true, opacity, depthWrite: false, toneMapped: false });
  const s = new THREE.Sprite(m);
  s.visible = false;
  return s;
}

function buildFrogRig(gltf, idle) {
  const { rig, parts, norm } = normalizedParts(gltf.scene);
  const toRig = ([x, y, z]) => new THREE.Vector3((x - norm.center.x) * norm.k, (y - norm.minY) * norm.k, (z - norm.center.z) * norm.k);
  const idleNormalized = idle.scene === gltf.scene ? { parts, norm } : normalizedParts(idle.scene);

  const isHand = (p) => isHandColor(p.color) && Math.abs(p.center.x) > 0.27 && p.center.y > 0.4 && p.center.y < 0.85 && p.size.x < 0.26 && p.size.y < 0.26;
  let hands = parts.filter(isHand);
  if (!hands.length && idleNormalized.parts !== parts) {
    hands = idleNormalized.parts.filter(isHand).map((p) => {
      const h = p.mesh.clone();
      h.geometry = p.mesh.geometry.clone();
      h.castShadow = true;
      rig.add(h);
      h.updateMatrixWorld(true);
      return measure(h);
    });
  }
  const handSet = new Set(hands.map((h) => h.mesh));
  const body = parts.filter((p) => !handSet.has(p.mesh));

  const pivot = (parent, point) => {
    parent.updateMatrixWorld(true);
    const g = new THREE.Group();
    g.position.copy(parent.worldToLocal(point.clone()));
    parent.add(g);
    g.updateMatrixWorld(true);
    return g;
  };

  const headParts = body.filter((p) => p.center.y > HEAD_Y);
  const skull = headParts
    .filter((p) => !isLine(p.color) && !isBulb(p.color))
    .sort((a, b) => b.size.x * b.size.y * b.size.z - a.size.x * a.size.y * a.size.z)[0];
  const skullBox = skull ? skull.box.clone() : unionBox(headParts);
  const skullCenter = skullBox.getCenter(new THREE.Vector3());
  const skullSize = skullBox.getSize(new THREE.Vector3());
  const neckPoint = new THREE.Vector3(skullCenter.x, skullBox.min.y + skullSize.y * 0.12, skullCenter.z);
  const head = pivot(rig, neckPoint);
  headParts.forEach((p) => head.attach(p.mesh));
  const headBase = head.position.clone();

  const surfaceZ = (x, y) => {
    const rx = skullSize.x / 2;
    const ry = skullSize.y / 2;
    const rz = skullSize.z / 2;
    const dx = (x - skullCenter.x) / rx;
    const dy = (y - skullCenter.y) / ry;
    return skullCenter.z + rz * Math.sqrt(Math.max(0.04, 1 - dx * dx - dy * dy));
  };

  const blades = headParts.filter((p) => p !== skull && isLeafColor(p.color) && p.center.y > skullCenter.y + skullSize.y * 0.25);
  const stems = headParts.filter((p) => p !== skull && isStemColor(p.color) && p.center.y > skullCenter.y + skullSize.y * 0.15);
  const stemBox = stems.length ? unionBox(stems) : null;
  const stemBase = stemBox
    ? new THREE.Vector3((stemBox.min.x + stemBox.max.x) / 2, stemBox.min.y, (stemBox.min.z + stemBox.max.z) / 2)
    : new THREE.Vector3(skullCenter.x, skullBox.max.y - 0.04, skullCenter.z);
  const stemTip = stems.length ? extremeVertex(stems, (v) => v.y) : stemBase.clone().add(new THREE.Vector3(0, 0.22, 0));
  const leafPivot = pivot(head, stemBase);
  stems.forEach((p) => leafPivot.attach(p.mesh));
  const bladePivot = pivot(leafPivot, stemTip);
  const bladeSpin = pivot(bladePivot, stemTip);
  blades.forEach((p) => bladeSpin.attach(p.mesh));
  const bladeBox = blades.length ? unionBox(blades) : null;
  const bladeTipWorld = blades.length ? extremeVertex(blades, (v) => v.distanceToSquared(stemTip)) : stemTip.clone().add(new THREE.Vector3(0.3, 0, 0));
  const bladeTip = new THREE.Object3D();
  bladeTip.position.copy(bladeSpin.worldToLocal(bladeTipWorld.clone()));
  bladeSpin.add(bladeTip);
  const leafMaterials = [...blades, ...stems].flatMap((p) => ownMaterial(p.mesh));
  const leafLength = bladeBox ? Math.max(bladeBox.max.x - bladeBox.min.x, bladeBox.max.z - bladeBox.min.z) : 0.3;

  const flowerParts = makeFlower(leafLength * 0.62);
  const flowerSeat = pivot(leafPivot, stemTip.clone().add(new THREE.Vector3(0, leafLength * 0.03, 0)));
  flowerSeat.add(flowerParts.flower);
  const bud = makeBud(leafLength * 0.34);
  flowerSeat.add(bud);

  const lines = headParts.filter((p) => isLine(p.color));
  const mouthLines = lines.filter((p) => Math.abs(p.center.x - skullCenter.x) < skullSize.x * 0.12);
  const eyeLines = lines.filter((p) => !mouthLines.includes(p));
  const bulbs = headParts.filter((p) => isBulb(p.color));

  const eyeSide = (left) => {
    const onSide = (p) => (left ? p.center.x < skullCenter.x : p.center.x > skullCenter.x);
    const side = eyeLines.filter(onSide);
    const bulb = bulbs.filter(onSide);
    let center;
    if (side.length) center = unionBox(side).getCenter(new THREE.Vector3());
    else if (bulb.length) {
      const b = unionBox(bulb);
      center = new THREE.Vector3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2 + 0.04, b.max.z);
    } else {
      const x = skullCenter.x + (left ? -1 : 1) * skullSize.x * 0.32;
      const y = skullCenter.y + skullSize.y * 0.1;
      center = new THREE.Vector3(x, y, surfaceZ(x, y));
    }
    const patch = pivot(head, center);
    const innerGroup = pivot(patch, center);
    side.forEach((p) => innerGroup.attach(p.mesh));
    const width = side.length ? unionBox(side).getSize(new THREE.Vector3()).x : skullSize.x * 0.18;
    return { patch, inner: [innerGroup], blink: innerGroup, center, width };
  };
  const eyeLeft = eyeSide(true);
  const eyeRight = eyeSide(false);

  const mouthCenter = mouthLines.length
    ? unionBox(mouthLines).getCenter(new THREE.Vector3())
    : new THREE.Vector3(skullCenter.x, skullCenter.y - skullSize.y * 0.05, surfaceZ(skullCenter.x, skullCenter.y - skullSize.y * 0.05));
  const mouthPoint = new THREE.Vector3(mouthCenter.x, mouthCenter.y - 0.01, Math.max(mouthCenter.z, surfaceZ(mouthCenter.x, mouthCenter.y)) - 0.004);
  const mouthGroup = pivot(head, mouthPoint);
  mouthGroup.rotation.x = MOUTH_TILT;
  const mouthMat = new THREE.MeshStandardMaterial({ color: "#5a1f2b", roughness: 0.8 });
  mouthMat.userData.kodaMatte = true;
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mouthMat);
  mouth.visible = false;
  mouthGroup.add(mouth);
  const mouthLineGroup = pivot(head, mouthCenter);
  mouthLines.forEach((p) => mouthLineGroup.attach(p.mesh));
  mouthLineGroup.visible = false;

  const nosePoint = new THREE.Vector3(mouthCenter.x, mouthCenter.y + 0.06, surfaceZ(mouthCenter.x, mouthCenter.y + 0.06));
  const nose = pivot(head, nosePoint);

  const bow = pivot(rig, new THREE.Vector3(skullCenter.x, 0.42, skullCenter.z - 0.3));

  const armSide = (left) => {
    const sign = left ? -1 : 1;
    const onSide = (p) => (left ? p.center.x < skullCenter.x - 0.14 : p.center.x > skullCenter.x + 0.14);
    const sleeve = body.filter((p) => onSide(p) && !headParts.includes(p) && p.center.y > 0.5 && p.center.y < HEAD_Y && p.size.x < 0.4 && p.size.y < 0.4 && (isSleeveColor(p.color) || isCuffColor(p.color)));
    const handList = hands.filter((h) => (left ? h.center.x < skullCenter.x : h.center.x > skullCenter.x));
    const source = sleeve.length ? sleeve : handList;
    const b = source.length ? unionBox(source) : null;
    const inner = b ? (left ? b.max.x : b.min.x) : skullCenter.x + sign * 0.18;
    const shoulder = b
      ? new THREE.Vector3(inner - sign * 0.03, b.max.y - 0.04, (b.min.z + b.max.z) / 2)
      : new THREE.Vector3(skullCenter.x + sign * 0.18, 0.8, skullCenter.z);
    const arm = pivot(rig, shoulder);
    [...sleeve, ...handList].forEach((p) => arm.attach(p.mesh));
    const tip = handList.length ? unionBox(handList).getCenter(new THREE.Vector3()) : b ? new THREE.Vector3(left ? b.min.x : b.max.x, b.min.y, (b.min.z + b.max.z) / 2) : shoulder.clone().add(new THREE.Vector3(sign * 0.2, -0.2, 0.05));
    const reach = tip.clone().sub(shoulder);
    return { arm, shoulder, rest: reach.clone().normalize(), length: Math.max(0.05, reach.length()) };
  };
  const left = armSide(true);
  const right = armSide(false);

  const legSide = (isLeft) => {
    const onSide = (p) => (isLeft ? p.center.x < skullCenter.x - 0.02 : p.center.x > skullCenter.x + 0.02);
    const list = body.filter((p) => onSide(p) && !headParts.includes(p) && p.center.y < 0.5 && p.size.x < 0.32 && p.size.y < 0.5);
    const b = list.length ? unionBox(list) : null;
    const top = b
      ? new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2)
      : new THREE.Vector3(skullCenter.x + (isLeft ? -0.12 : 0.12), 0.45, skullCenter.z);
    const leg = pivot(rig, top);
    list.forEach((p) => leg.attach(p.mesh));
    return leg;
  };
  const legLeft = legSide(true);
  const legRight = legSide(false);

  const fx = new THREE.Group();
  head.add(fx);
  const drops = Array.from({ length: DROP_COUNT }, () => {
    const s = spriteOf("drop");
    fx.add(s);
    return s;
  });
  const puffs = Array.from({ length: PUFF_COUNT }, () => {
    const s = spriteOf("puff");
    fx.add(s);
    return s;
  });
  const sparkles = Array.from({ length: SPARKLE_COUNT }, () => {
    const s = spriteOf("sparkle");
    fx.add(s);
    return s;
  });
  const leafCenterLocal = head.worldToLocal(stemTip.clone().lerp(bladeTipWorld, 0.4));

  const rel = (v) => v.clone().sub(neckPoint);
  const headTop = new THREE.Vector3(skullCenter.x, skullBox.max.y - 0.04, skullCenter.z + skullSize.z * 0.1);
  const cheek = (e, sign) => {
    const x = e.center.x - sign * 0.02;
    const y = e.center.y - skullSize.y * 0.16;
    return new THREE.Vector3(x, y, surfaceZ(x, y) + 0.01);
  };

  rig.updateMatrixWorld(true);

  return {
    rig,
    norm,
    idleNorm: idleNormalized.norm,
    toRig,
    head,
    headBase,
    earLeft: new THREE.Group(),
    earRight: new THREE.Group(),
    capScale: 1,
    eyeLeft,
    eyeRight,
    nose,
    mouth,
    mouthLine: mouthLineGroup,
    bow,
    armLeft: left.arm,
    armRight: right.arm,
    legLeft,
    legRight,
    restLeft: left.rest,
    restRight: right.rest,
    armLengthLeft: left.length,
    armLengthRight: right.length,
    shoulderLeft: left.shoulder,
    shoulderRight: right.shoulder,
    mouthOffset: rel(mouthPoint),
    noseOffset: rel(nosePoint),
    headTopOffset: rel(headTop),
    eyeOffsetLeft: rel(eyeLeft.center),
    eyeOffsetRight: rel(eyeRight.center),
    eyeBagOffsetLeft: rel(cheek(eyeLeft, -1)),
    eyeBagOffsetRight: rel(cheek(eyeRight, 1)),
    eyeWidthLeft: eyeLeft.width,
    eyeWidthRight: eyeRight.width,
    leaf: {
      pivot: leafPivot,
      blade: bladePivot,
      spin: bladeSpin,
      tip: bladeTip,
      materials: leafMaterials,
      length: leafLength,
      flower: flowerParts,
      bud,
      center: leafCenterLocal,
      drops,
      puffs,
      sparkles,
    },
  };
}

export function useFrogRig(url, idleUrl) {
  const gltf = useGLTF(url);
  const idle = useGLTF(idleUrl || FROG_IDLE_MODEL);
  return useMemo(() => buildFrogRig(gltf, idle), [gltf, idle]);
}

const TINTS = {
  angry: new THREE.Color("#a3321a"),
  hungry: new THREE.Color("#8f8a1c"),
  sleeping: new THREE.Color("#1c3a6b"),
  fresh: new THREE.Color("#7fe08a"),
  none: new THREE.Color("#000000"),
};

const wave = (t, speed, phase = 0) => Math.sin(t * speed + phase);

function moodPose(mood, t, st, variant) {
  const p = {
    bendX: 0,
    bendZ: 0,
    droop: 0,
    spin: 0,
    spinRate: 0,
    fold: 0,
    curl: 0,
    jitter: 0,
    tint: TINTS.none,
    tintAmount: 0,
    flower: 0,
    bud: 0,
    drops: 0,
    puffs: 0,
    sparkles: 0,
    bounce: 0,
  };
  const sway = wave(t, 1.3) * 0.06;
  p.bendZ = sway;
  p.droop = wave(t, 1.7, 0.5) * 0.05;
  switch (mood) {
    case "angry": {
      const fit = 0.6 + 0.4 * Math.max(0, wave(t, 2.3));
      p.jitter = 0.16 * fit;
      p.curl = 0.35 + 0.15 * Math.abs(wave(t, 23));
      p.fold = 0.25 + 0.2 * Math.abs(wave(t, 17, 1));
      p.droop = -0.15 + wave(t, 31) * 0.08;
      p.tint = TINTS.angry;
      p.tintAmount = 0.35 + 0.15 * wave(t, 9);
      p.puffs = 1;
      break;
    }
    case "feeding": {
      p.flower = 1;
      p.bendZ = wave(t, 2.2) * 0.1;
      p.droop = -0.1 + Math.max(0, wave(t, 9)) * 0.08;
      p.sparkles = 0.5;
      break;
    }
    case "hungry": {
      const growl = Math.pow(Math.max(0, wave(t, 1.1)), 12);
      p.droop = 0.55 + wave(t, 0.8) * 0.06;
      p.curl = 0.3;
      p.fold = 0.15;
      p.bendX = 0.18;
      p.jitter = growl * 0.12;
      p.tint = TINTS.hungry;
      p.tintAmount = 0.3;
      break;
    }
    case "crying": {
      p.droop = 0.7 + wave(t, 3.4) * 0.05;
      p.bendX = 0.25 + wave(t, 6) * 0.03;
      p.bendZ = wave(t, 1.1) * 0.04;
      p.fold = 0.2;
      p.drops = 1;
      break;
    }
    case "sleepy": {
      const nod = (Math.sin(t * 0.7) * 0.5 + 0.5) ** 2;
      const jerk = pulse(0, 0.2, (t % 6.5) / 6.5);
      p.droop = 0.2 + nod * 0.5 - jerk * 0.5;
      p.bendX = 0.1 + nod * 0.25 - jerk * 0.2;
      p.fold = 0.35 * nod;
      break;
    }
    case "sleeping": {
      const breath = wave(t, 1.2) * 0.5 + 0.5;
      p.droop = 0.55 + breath * 0.08;
      p.bendX = 0.3 + breath * 0.05;
      p.bendZ = 0.12;
      p.fold = 0.62 + breath * 0.06;
      p.curl = 0.25;
      p.tint = TINTS.sleeping;
      p.tintAmount = 0.12;
      break;
    }
    case "woke": {
      const fair = variant === "fair";
      const open = smooth(0.2, fair ? 2.6 : 1.1, st);
      const boing = Math.exp(-st * (fair ? 1.5 : 3)) * Math.sin(st * (fair ? 7 : 14));
      p.fold = (1 - open) * 0.65;
      p.droop = (1 - open) * 0.6 - boing * 0.35;
      p.bendX = (1 - open) * 0.3;
      p.bendZ += boing * 0.1;
      p.sparkles = fair ? 0.3 : smooth(0.6, 1.2, st) * 0.8;
      break;
    }
    case "happy": {
      const cycle = t % 3.2;
      const twirl = smooth(0, 0.7, cycle);
      p.spin = twirl * Math.PI * 2;
      p.bounce = Math.abs(wave(t, 5)) * 0.06;
      p.droop = -0.12 + Math.abs(wave(t, 5)) * 0.08;
      p.sparkles = 0.6;
      p.bud = 0.6;
      break;
    }
    case "energetic": {
      p.spinRate = 18;
      p.droop = -0.35;
      p.bendZ = wave(t, 3) * 0.08;
      p.bounce = Math.abs(wave(t, 9)) * 0.05;
      p.sparkles = 0.4;
      break;
    }
    case "quiet": {
      p.bendZ = wave(t, 0.7) * 0.08;
      p.droop = 0.12 + wave(t, 0.9, 1) * 0.05;
      p.fold = 0.1 + (wave(t, 0.9) * 0.5 + 0.5) * 0.08;
      break;
    }
    case "other": {
      const ponder = (Math.sin(t * 0.9) * 0.5 + 0.5);
      p.curl = 0.55 + ponder * 0.2;
      p.bendZ = -0.22 + ponder * 0.06;
      p.droop = -0.05 + wave(t, 2.6) * 0.05;
      p.spin = 0.6 + ponder * 0.4;
      p.sparkles = 0.35;
      break;
    }
    case "playtime": {
      const flap = wave(t, 7);
      p.droop = flap * 0.35 - 0.05;
      p.bendZ = wave(t, 3.5) * 0.18;
      p.bounce = Math.abs(wave(t, 3.5)) * 0.08;
      p.spin = wave(t, 1.75) * 0.6;
      p.sparkles = 0.3;
      break;
    }
    case "diaper": {
      const shake = Math.pow(Math.max(0, wave(t, 0.9)), 8);
      p.droop = -0.25 + wave(t, 26) * 0.1 * shake;
      p.bendZ = wave(t, 30) * 0.12 * shake + sway;
      p.tint = TINTS.fresh;
      p.tintAmount = 0.12;
      p.sparkles = 0.8;
      break;
    }
    case "pet": {
      p.droop = -0.2 + wave(t, 9) * 0.06;
      p.bendZ = wave(t, 4.5) * 0.14;
      p.bud = 1;
      p.sparkles = 0.4;
      break;
    }
    case "comfort": {
      const lift = smooth(0.8, 2.6, st);
      p.droop = 0.65 * (1 - lift) - 0.1 * lift;
      p.bendX = 0.25 * (1 - lift);
      p.fold = 0.25 * (1 - lift);
      p.drops = 1 - lift;
      p.bud = lift;
      break;
    }
    default:
      break;
  }
  return p;
}

const ARM_MAX_RISE = -0.05;
const ARM_MIN_OUT = 0.75;
const _armDir = new THREE.Vector3();
const _armQ = new THREE.Quaternion();

function keepHandsOut(rig) {
  [
    [rig.armLeft, rig.restLeft, -1],
    [rig.armRight, rig.restRight, 1],
  ].forEach(([arm, rest, side]) => {
    if (!arm || !rest) return;
    _armDir.copy(rest).applyQuaternion(arm.quaternion);
    const rise = _armDir.y;
    const out = _armDir.x * side;
    if (rise <= ARM_MAX_RISE && (rise <= -0.3 || out >= ARM_MIN_OUT)) return;
    const y = Math.min(rise, ARM_MAX_RISE);
    const x = side * Math.max(out, rise > -0.3 ? ARM_MIN_OUT : out);
    _armDir.set(x, y, _armDir.z).normalize();
    _armQ.setFromUnitVectors(rest, _armDir);
    arm.quaternion.copy(_armQ);
  });
}

const _tipWorld = new THREE.Vector3();
const _tipLocal = new THREE.Vector3();
const _prev = new THREE.Vector3();

export function useFrogLife(rig, mood = "idle", variant) {
  const st = useRef(null);
  if (!st.current) {
    st.current = {
      start: null,
      bx: 0,
      vbx: 0,
      bz: 0,
      vbz: 0,
      last: null,
      vel: new THREE.Vector3(),
      spin: 0,
      flower: 0,
      bud: 0,
      tint: new THREE.Color(),
      dropSeeds: Array.from({ length: DROP_COUNT }, (_, i) => i / DROP_COUNT),
    };
  }
  useFrame((state, delta) => {
    keepHandsOut(rig);
    const leaf = rig.leaf;
    if (!leaf) return;
    const s = st.current;
    const t = state.clock.elapsedTime;
    if (s.start === null) s.start = t;
    const since = t - s.start;
    const dt = Math.min(0.05, Math.max(0.001, delta));
    const p = moodPose(mood, t, since, variant);

    const droopFromEars = (rig.earRight.rotation.z - rig.earLeft.rotation.z) * 1.4;
    const backFromEars = (rig.earLeft.rotation.x + rig.earRight.rotation.x) * 0.6;

    leaf.pivot.getWorldPosition(_tipWorld);
    if (!s.last) s.last = _tipWorld.clone();
    _prev.copy(_tipWorld).sub(s.last).divideScalar(dt);
    const ax = (_prev.x - s.vel.x) / dt;
    const ay = (_prev.y - s.vel.y) / dt;
    const az = (_prev.z - s.vel.z) / dt;
    s.vel.copy(_prev);
    s.last.copy(_tipWorld);
    const lift = THREE.MathUtils.clamp(1 + ay / LEAF_GRAVITY, 0, 2);
    const k = 70;
    const c = 7;
    s.vbz += (-k * s.bz - c * s.vbz + THREE.MathUtils.clamp(ax, -40, 40) * LEAF_GAIN * 10) * dt;
    s.vbx += (-k * s.bx - c * s.vbx - THREE.MathUtils.clamp(az, -40, 40) * LEAF_GAIN * 10) * dt;
    s.bz = THREE.MathUtils.clamp(s.bz + s.vbz * dt, -0.6, 0.6);
    s.bx = THREE.MathUtils.clamp(s.bx + s.vbx * dt, -0.6, 0.6);

    const jitterX = p.jitter ? (Math.sin(t * 47) + Math.sin(t * 71) * 0.6) * p.jitter : 0;
    const jitterZ = p.jitter ? (Math.sin(t * 53 + 1) + Math.sin(t * 89) * 0.6) * p.jitter : 0;
    leaf.pivot.rotation.set(p.bendX + backFromEars + s.bx + jitterX * 0.5, 0, p.bendZ + s.bz + jitterZ * 0.5);
    leaf.pivot.position.y = leaf.pivot.userData.baseY ?? (leaf.pivot.userData.baseY = leaf.pivot.position.y);
    leaf.pivot.position.y = leaf.pivot.userData.baseY + p.bounce;

    s.spin = p.spinRate ? s.spin + p.spinRate * dt : THREE.MathUtils.lerp(s.spin, p.spin, Math.min(1, dt * 6));
    if (!p.spinRate && Math.abs(s.spin) > Math.PI * 2) s.spin %= Math.PI * 2;
    leaf.spin.rotation.y = s.spin;
    const sag = THREE.MathUtils.clamp((1 - lift) * 0.3, -0.3, 0.3);
    leaf.blade.rotation.set(jitterX * 0.6, 0, -(p.droop + droopFromEars + sag) + jitterZ * 0.4);
    const fold = THREE.MathUtils.clamp(p.fold, 0, 0.8);
    const curl = THREE.MathUtils.clamp(p.curl, 0, 0.8);
    leaf.spin.scale.set(1 - curl * 0.35, 1 + fold * 0.6, 1 - fold * 0.75);

    s.tint.lerp(p.tint, Math.min(1, dt * 4));
    const glow = THREE.MathUtils.lerp(leaf.materials[0]?.emissiveIntensity ?? 0, p.tintAmount, Math.min(1, dt * 4));
    leaf.materials.forEach((m) => {
      if (!m.emissive) return;
      m.emissive.copy(s.tint);
      m.emissiveIntensity = glow;
    });

    s.flower = THREE.MathUtils.lerp(s.flower, p.flower, Math.min(1, dt * (p.flower > s.flower ? 0.6 : 3)));
    const fl = leaf.flower;
    fl.flower.visible = s.flower > 0.01;
    const grow = smooth(0, 0.5, s.flower);
    const open = smooth(0.4, 1, s.flower);
    fl.flower.scale.setScalar(Math.max(0.0001, grow));
    fl.flower.rotation.z = wave(t, 2.1) * 0.12;
    fl.bloom.rotation.y = t * 0.4;
    fl.petals.forEach((petal, i) => {
      petal.rotation.x = -1.35 * (1 - open) - 0.25 + wave(t, 3, i) * 0.06 * open;
    });

    s.bud = THREE.MathUtils.lerp(s.bud, p.bud, Math.min(1, dt * 2.5));
    leaf.bud.visible = s.bud > 0.01 && s.flower < 0.2;
    leaf.bud.scale.setScalar(Math.max(0.0001, smooth(0, 1, s.bud) * (1 + Math.abs(wave(t, 6)) * 0.08)));
    leaf.bud.rotation.z = wave(t, 3) * 0.15;

    leaf.tip.getWorldPosition(_tipWorld);
    _tipLocal.copy(_tipWorld);
    rig.head.worldToLocal(_tipLocal);
    leaf.drops.forEach((sp, i) => {
      const life = ((since * 0.55 + s.dropSeeds[i]) % 1 + 1) % 1;
      const on = p.drops > 0.02;
      sp.visible = on;
      if (!on) return;
      const fall = life < 0.35 ? 0 : (life - 0.35) / 0.65;
      sp.position.set(_tipLocal.x, _tipLocal.y - 0.01 - fall * fall * 0.55, _tipLocal.z + 0.02);
      const swell = smooth(0, 0.35, life);
      sp.scale.setScalar(0.05 * (0.4 + swell * 0.6));
      sp.material.opacity = p.drops * (1 - smooth(0.75, 1, life)) * 0.95;
    });

    leaf.puffs.forEach((sp, i) => {
      const life = ((t / 0.8 + i / PUFF_COUNT) % 1 + 1) % 1;
      const on = p.puffs > 0.02;
      sp.visible = on;
      if (!on) return;
      const side = i % 2 ? 1 : -1;
      sp.position.set(leaf.center.x + side * (0.05 + life * 0.12), leaf.center.y + 0.04 + life * 0.3, leaf.center.z);
      sp.scale.setScalar(0.06 + life * 0.1);
      sp.material.opacity = (1 - life) * 0.8 * p.puffs;
    });

    leaf.sparkles.forEach((sp, i) => {
      const life = ((t / 1.6 + i / SPARKLE_COUNT) % 1 + 1) % 1;
      const on = p.sparkles > 0.02;
      sp.visible = on;
      if (!on) return;
      const a = i * 2.4 + t * 0.6;
      sp.position.set(leaf.center.x + Math.cos(a) * 0.22, leaf.center.y + 0.05 + life * 0.18, leaf.center.z + Math.sin(a) * 0.12);
      sp.scale.setScalar(0.05 + Math.sin(life * Math.PI) * 0.04);
      sp.material.opacity = Math.sin(life * Math.PI) * p.sparkles;
      sp.material.rotation = t * 1.5 + i;
    });
  });
}

function FrogLife({ rig, leaf, variant }) {
  useFrogLife(rig, leaf, variant);
  return null;
}

const lifeWrapped = new WeakMap();

export function withFrogLife(Rig, leaf = "idle") {
  if (!lifeWrapped.has(Rig)) lifeWrapped.set(Rig, new Map());
  const byLeaf = lifeWrapped.get(Rig);
  if (!byLeaf.has(leaf)) {
    const Wrapped = (props) => (
      <>
        <Rig {...props} />
        <FrogLife rig={props.rig} leaf={leaf} variant={props.variant ?? props.quality} />
      </>
    );
    byLeaf.set(leaf, Wrapped);
  }
  return byLeaf.get(leaf);
}

export function FrogMood({ idleModelPath, modelUrl, Rig, leaf = "idle", ...props }) {
  return (
    <PandaMood
      {...props}
      modelUrl={modelUrl || FROG_IDLE_MODEL}
      Rig={withFrogLife(Rig, leaf)}
      idleModelPath={idleModelPath || FROG_IDLE_MODEL}
      useRig={useFrogRig}
    />
  );
}

export function FrogIdleRig({ rig, motion }) {
  const own = useRef({ hop: 0, glance: 0, nextHop: 2 + Math.random() * 2, hopAt: -10 });
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const m = (motion || own).current;
    if (!motion) {
      if (t > m.nextHop) {
        m.hopAt = t;
        m.nextHop = t + 3 + Math.random() * 3;
      }
      const h = (t - m.hopAt) / 0.42;
      m.hop = h > 0 && h < 1 ? Math.sin(h * Math.PI) : 0;
      m.glance = Math.sin(t * 0.45) * 0.2;
    }
    const hop = m.hop || 0;
    const squash = 1 + Math.sin(t * 1.6) * 0.015 - hop * 0.04;
    rig.rig.position.set(0, motion ? 0 : hop * 0.14, 0);
    rig.rig.rotation.set(0, (m.glance || 0) * 0.4, Math.sin(t * 1.1) * 0.02);
    rig.rig.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(Math.sin(t * 0.9) * 0.03 - hop * 0.08, Math.sin(t * 0.6) * 0.1 + (m.glance || 0) * 0.3, Math.sin(t * 1.3) * 0.04);
    rig.head.scale.set(1, 1, 1);
    rig.mouth.visible = false;
    rig.legLeft.rotation.set(-hop * 0.35, 0, 0);
    rig.legRight.rotation.set(-hop * 0.35, 0, 0);
    [
      [rig.armLeft, -1],
      [rig.armRight, 1],
    ].forEach(([arm, side]) => {
      arm.quaternion.identity();
      arm.rotation.set(Math.sin(t * 1.1 + side) * 0.08, 0, side * (0.04 + Math.sin(t * 1.6 + side) * 0.05 + hop * 0.4));
    });
  });
  return <primitive object={rig.rig} />;
}