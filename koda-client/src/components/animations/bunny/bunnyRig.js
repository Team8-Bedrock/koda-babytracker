import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { LOCAL_REFERENCE_HEIGHT, PandaMood, getTexture, aimArm, smooth, pulse } from "../panda/pandaRig";

export const BUNNY_IDLE_MODEL = "/models/characters/bunny/bunny.glb";
const MOUTH_TILT = 0.45;
const EAR_DAMP = 0.35;
const HEAD_Y = 0.92;
const PAW_SHARE = 0.48;
const PAW_DROP = 0.13;
const PAW_TUCK = 0.04;
const PAW_FALLBACK = "#c9a27a";
const TAIL_RADIUS = 0.11;
const SHOW_CROWN = true;
const HEAD_SCALE = 1;
export const BUNNY_HEAD_SCALE = HEAD_SCALE;
const LID_SETTLE = 0.012;
const LID_SQUASH = 0.65;
const EYE_GRID = 28;
const SHOW_OUTLINE = false;
const OUTLINE_WIDTH = 0.012;
const OUTLINE_COLOR = "#d9a7c7";
const SPARKLE_COUNT = 5;
const GRAVITY = 12;
const ACCEL_GAIN = 0.22;

const MOUTH_SHAPE = (() => {
  const s = new THREE.Shape();
  s.moveTo(-1, 0);
  s.quadraticCurveTo(-0.5, 0.2, 0, 0.04);
  s.quadraticCurveTo(0.5, 0.2, 1, 0);
  s.bezierCurveTo(0.9, -0.78, -0.9, -0.78, -1, 0);
  return s;
})();

const TONGUE_SHAPE = (() => {
  const s = new THREE.Shape();
  s.absellipse(0, -0.38, 0.48, 0.15, 0, Math.PI * 2, false, 0);
  return s;
})();

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

const isWhite = (rgb) => Math.min(...rgb) > 0.88;
const isDark = (rgb) => Math.max(...rgb) < 0.2;
const isEyeball = ([r, g, b]) => r > 0.6 && r < 0.94 && g > 0.58 && g < 0.94 && b >= r - 0.02;
const isBlueEye = ([r, g, b]) => b > 0.8 && r < 0.75 && g < 0.6;
const isEye = (rgb) => isDark(rgb) || isEyeball(rgb) || isBlueEye(rgb);
const isPink = ([r, g, b]) => r > 0.95 && g > 0.45 && g < 0.7 && b < 0.65;
const isRibbon = ([r, g, b]) => b > 0.85 && r > 0.6 && g < 0.62;

function princessMaterial(color, glow = 0) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25, emissive: color, emissiveIntensity: glow });
  m.userData.kodaMatte = true;
  return m;
}

function makeOutlineMaterial() {
  const m = new THREE.MeshBasicMaterial({ color: OUTLINE_COLOR, side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>\ntransformed += normalize(normal) * ${OUTLINE_WIDTH.toFixed(4)};`,
    );
  };
  m.userData.kodaMatte = true;
  return m;
}

function addOutline(mesh, material) {
  if (!mesh.geometry.attributes.normal) mesh.geometry.computeVertexNormals();
  const hull = new THREE.Mesh(mesh.geometry, material);
  hull.castShadow = false;
  hull.receiveShadow = false;
  hull.userData.kodaShadow = true;
  hull.userData.outline = true;
  hull.raycast = () => { };
  mesh.add(hull);
}

function sparkleSprite() {
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: getTexture("sparkle"), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  sp.scale.setScalar(0.0001);
  return sp;
}

function makeCrown(radius) {
  const crown = new THREE.Group();
  const gold = princessMaterial("#f6d58e", 0.16);
  gold.side = THREE.DoubleSide;
  const pearl = princessMaterial("#fff7fb", 0.12);
  const pink = princessMaterial("#ff9fc4", 0.4);
  const lilac = princessMaterial("#c9a6ff", 0.4);
  const h = radius * 0.5;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.92, h, 32, 1, true), gold);
  band.position.y = h / 2;
  crown.add(band);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.95, radius * 0.07, 8, 32), gold);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = radius * 0.03;
  crown.add(rim);
  const points = 5;
  for (let k = 0; k < points; k++) {
    const a = (k / points) * Math.PI * 2 + Math.PI / 2;
    const x = Math.cos(a) * radius * 0.97;
    const z = Math.sin(a) * radius * 0.97;
    const tall = k === 0 ? 0.75 : 0.55;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(radius * 0.3, radius * tall, 4), gold);
    spike.position.set(x, h + (radius * tall) / 2 - radius * 0.02, z);
    spike.rotation.y = -a;
    crown.add(spike);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.1, 12, 10), pearl);
    tip.position.set(x, h + radius * tall + radius * 0.04, z);
    crown.add(tip);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(radius * (k === 0 ? 0.16 : 0.1), 14, 10), k === 0 ? pink : k % 2 ? lilac : pink);
    gem.position.set(Math.cos(a) * radius * 1.02, h * 0.5, Math.sin(a) * radius * 1.02);
    gem.scale.set(1, 1.15, 0.6);
    gem.lookAt(gem.position.clone().multiplyScalar(2).setY(gem.position.y));
    crown.add(gem);
  }
  const glint = sparkleSprite();
  glint.position.set(0, h * 0.55, radius * 1.12);
  crown.add(glint);
  crown.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return { crown, glint };
}

function frontMap(meshes, box, steps) {
  const minX = box.min.x;
  const minY = box.min.y;
  const sx = (box.max.x - box.min.x) / steps || 1e-6;
  const sy = (box.max.y - box.min.y) / steps || 1e-6;
  const n = steps + 1;
  const z = new Float32Array(n * n).fill(-Infinity);
  const owner = new Array(n * n).fill(null);
  const v = new THREE.Vector3();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const write = (i, j, depth, mesh) => {
    if (i < 0 || j < 0 || i >= n || j >= n) return;
    const k = j * n + i;
    if (depth > z[k]) {
      z[k] = depth;
      owner[k] = mesh;
    }
  };
  const raster = (p0, p1, p2, mesh) => {
    const x0 = Math.min(p0.x, p1.x, p2.x);
    const x1 = Math.max(p0.x, p1.x, p2.x);
    const y0 = Math.min(p0.y, p1.y, p2.y);
    const y1 = Math.max(p0.y, p1.y, p2.y);
    if (x1 < box.min.x - sx || x0 > box.max.x + sx || y1 < box.min.y - sy || y0 > box.max.y + sy) return;
    const i0 = Math.max(0, Math.ceil((x0 - minX) / sx));
    const i1 = Math.min(steps, Math.floor((x1 - minX) / sx));
    const j0 = Math.max(0, Math.ceil((y0 - minY) / sy));
    const j1 = Math.min(steps, Math.floor((y1 - minY) / sy));
    const d = (p1.y - p2.y) * (p0.x - p2.x) + (p2.x - p1.x) * (p0.y - p2.y);
    if (Math.abs(d) < 1e-12) {
      write(Math.round(((p0.x + p1.x + p2.x) / 3 - minX) / sx), Math.round(((p0.y + p1.y + p2.y) / 3 - minY) / sy), Math.max(p0.z, p1.z, p2.z), mesh);
      return;
    }
    for (let j = j0; j <= j1; j++) {
      const y = minY + j * sy;
      for (let i = i0; i <= i1; i++) {
        const x = minX + i * sx;
        const w0 = ((p1.y - p2.y) * (x - p2.x) + (p2.x - p1.x) * (y - p2.y)) / d;
        const w1 = ((p2.y - p0.y) * (x - p2.x) + (p0.x - p2.x) * (y - p2.y)) / d;
        const w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        write(i, j, w0 * p0.z + w1 * p1.z + w2 * p2.z, mesh);
      }
    }
  };
  meshes.forEach((mesh) => {
    if (!mesh.visible || mesh.userData.outline) return;
    const mbox = new THREE.Box3().setFromObject(mesh);
    if (mbox.max.x < box.min.x || mbox.min.x > box.max.x || mbox.max.y < box.min.y || mbox.min.y > box.max.y) return;
    const pos = mesh.geometry.attributes.position;
    const m = mesh.matrixWorld;
    const idx = mesh.geometry.index;
    const count = idx ? idx.count : pos.count;
    for (let t = 0; t < count; t += 3) {
      v.fromBufferAttribute(pos, idx ? idx.getX(t) : t).applyMatrix4(m);
      a.fromBufferAttribute(pos, idx ? idx.getX(t + 1) : t + 1).applyMatrix4(m);
      b.fromBufferAttribute(pos, idx ? idx.getX(t + 2) : t + 2).applyMatrix4(m);
      raster(v, a, b, mesh);
    }
  });
  const at = (x, y) => {
    const i = THREE.MathUtils.clamp(Math.round((x - minX) / sx), 0, steps);
    const j = THREE.MathUtils.clamp(Math.round((y - minY) / sy), 0, steps);
    return j * n + i;
  };
  const cells = [];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      if (owner[k]) cells.push({ x: minX + i * sx, y: minY + j * sy, z: z[k], mesh: owner[k] });
    }
  }
  const surface = (x, y) => {
    const k = at(x, y);
    const zz = Number.isFinite(z[k]) ? z[k] : null;
    const zx1 = z[at(x + sx, y)];
    const zx0 = z[at(x - sx, y)];
    const zy1 = z[at(x, y + sy)];
    const zy0 = z[at(x, y - sy)];
    const normal = new THREE.Vector3(0, 0, 1);
    if ([zx1, zx0, zy1, zy0].every(Number.isFinite)) normal.set(-(zx1 - zx0) / (2 * sx), -(zy1 - zy0) / (2 * sy), 1).normalize();
    return { z: zz, normal, mesh: owner[k] };
  };
  return { cells, surface };
}

function visibleEye(side, occluders) {
  const balls = side.filter((p) => isEyeball(p.color));
  const source = balls.length ? balls : side;
  const targets = new Set(side.map((p) => p.mesh));
  const b = unionBox(source);
  const map = frontMap(occluders, b, EYE_GRID);
  const pts = map.cells.filter((c) => targets.has(c.mesh)).map((c) => new THREE.Vector3(c.x, c.y, c.z));
  if (pts.length < 4) return null;
  const vb = new THREE.Box3().setFromPoints(pts);
  const c = vb.getCenter(new THREE.Vector3());
  const hit = map.surface(c.x, c.y);
  const surface = new THREE.Vector3(c.x, c.y, hit.z ?? vb.max.z);
  return { surface, width: vb.max.x - vb.min.x, height: vb.max.y - vb.min.y };
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
  rig.updateMatrixWorld(true);
  const parts = [];
  rig.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const b = new THREE.Box3().setFromObject(o);
    parts.push({ mesh: o, box: b, center: b.getCenter(new THREE.Vector3()), size: b.getSize(new THREE.Vector3()), color: averageColor(o) });
  });
  return { rig, parts, norm: { center: center.clone(), minY: box.min.y, k } };
}

const isHandPart = (p) => isWhite(p.color) && Math.abs(p.center.x) > 0.26 && p.center.y > 0.3 && p.center.y < 0.65 && p.size.x < 0.22 && p.size.y < 0.22;

function unionBox(list) {
  const b = new THREE.Box3();
  list.forEach((p) => b.union(p.box));
  return b;
}

function farthestFrom(list, point) {
  const v = new THREE.Vector3();
  let best = null;
  let bestD = -1;
  list.forEach((p) => {
    const pos = p.mesh.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 400));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i);
      const d = v.distanceToSquared(point);
      if (d > bestD) {
        bestD = d;
        best = v.clone();
      }
    }
  });
  return best;
}

export function useBunnyRig(url, idleUrl) {
  const gltf = useGLTF(url);
  const idle = useGLTF(idleUrl);
  return useMemo(() => buildBunnyRig(gltf, idle), [gltf, idle]);
}

const rigPool = new WeakMap();

function snapshotRig(root) {
  const list = [];
  root.traverse((o) => list.push([o, o.position.clone(), o.quaternion.clone(), o.scale.clone(), o.visible]));
  return list;
}

function restoreRig(entry) {
  entry.snapshot.forEach(([o, p, q, sc, vis]) => {
    o.position.copy(p);
    o.quaternion.copy(q);
    o.scale.copy(sc);
    o.visible = vis;
  });
  const r = entry.rig;
  [r.eyeLeft, r.eyeRight].forEach((e) => e && (e.hideLid = false));
  [r.earLeft, r.earRight].forEach((g) => g.rotation.set(0, 0, 0));
  if (r.rig.parent) r.rig.parent.remove(r.rig);
}

export function usePooledBunnyRig(url, idleUrl) {
  const gltf = useGLTF(url);
  const idle = useGLTF(idleUrl);
  const entry = useMemo(() => {
    let pool = rigPool.get(gltf.scene);
    if (!pool) {
      pool = [];
      rigPool.set(gltf.scene, pool);
    }
    let found = pool.find((e) => !e.busy && e.idle === idle.scene);
    if (found) restoreRig(found);
    else {
      const rig = buildBunnyRig(gltf, idle);
      found = { rig, idle: idle.scene, snapshot: snapshotRig(rig.rig) };
      pool.push(found);
    }
    found.busy = true;
    return found;
  }, [gltf, idle]);
  useEffect(() => {
    entry.busy = true;
    return () => {
      entry.busy = false;
    };
  }, [entry]);
  return entry.rig;
}

function buildBunnyRig(gltf, idle) {
  {
    const { rig, parts, norm } = normalizedParts(gltf.scene);
    const toRig = ([x, y, z]) => new THREE.Vector3((x - norm.center.x) * norm.k, (y - norm.minY) * norm.k, (z - norm.center.z) * norm.k);

    const idleNormalized = idle.scene === gltf.scene ? { parts: [], norm } : normalizedParts(idle.scene);
    let hands = parts.filter(isHandPart);
    if (!hands.length) {
      const idleParts = idleNormalized.parts.filter(isHandPart);
      hands = idleParts.map((p) => {
        const h = p.mesh.clone(true);
        p.mesh.matrixWorld.decompose(h.position, h.quaternion, h.scale);
        h.castShadow = true;
        rig.add(h);
        h.updateMatrixWorld(true);
        const b = new THREE.Box3().setFromObject(h);
        return { mesh: h, box: b, center: b.getCenter(new THREE.Vector3()), size: b.getSize(new THREE.Vector3()), color: p.color };
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
      .filter((p) => !isEye(p.color) && !isRibbon(p.color) && p.size.y < 0.95)
      .sort((a, b) => b.size.x * b.size.y * b.size.z - a.size.x * a.size.y * a.size.z)[0];
    const skullBox = skull ? skull.box : unionBox(headParts);
    const skullCenter = skullBox.getCenter(new THREE.Vector3());
    const skullSize = skullBox.getSize(new THREE.Vector3());
    const neckPoint = new THREE.Vector3(skullCenter.x, skullBox.min.y + skullSize.y * 0.08, skullCenter.z);
    const head = pivot(rig, neckPoint);
    headParts.forEach((p) => head.attach(p.mesh));
    const headBase = head.position.clone();

    const earParts = headParts.filter((p) => {
      if (p === skull || isEye(p.color) || isRibbon(p.color) || isPink(p.color)) return false;
      const dx = Math.abs(p.center.x - skullCenter.x);
      const lop = dx > skullSize.x * 0.3 && p.size.y > skullSize.y * 0.6;
      const upright = p.center.y > skullCenter.y + skullSize.y * 0.2 && dx > 0.05;
      return lop || upright;
    });
    const earFor = (left) => {
      const side = earParts.filter((p) => (left ? p.center.x < skullCenter.x : p.center.x > skullCenter.x));
      const b = side.length ? unionBox(side) : null;
      const point = b
        ? new THREE.Vector3((b.min.x + b.max.x) / 2, Math.min(b.max.y - 0.1, Math.max(b.min.y, skullBox.max.y - 0.08)), (b.min.z + b.max.z) / 2)
        : new THREE.Vector3(skullCenter.x + (left ? -0.22 : 0.22), skullBox.max.y - 0.1, skullCenter.z);
      const g = pivot(head, point);
      side.forEach((p) => g.attach(p.mesh));
      return g;
    };
    const earLeft = earFor(true);
    const earRight = earFor(false);

    const front = headParts.filter((p) => !earParts.includes(p) && p.center.z > skullCenter.z + 0.12);
    const noseParts = front.filter((p) => isPink(p.color) && Math.abs(p.center.x - skullCenter.x) < 0.06);
    const eyeParts = front.filter((p) => !noseParts.includes(p) && isEye(p.color) && Math.abs(p.center.x - skullCenter.x) >= 0.05);

    const noseBox = noseParts.length ? unionBox(noseParts) : null;
    const nosePoint = noseBox ? noseBox.getCenter(new THREE.Vector3()) : new THREE.Vector3(skullCenter.x, skullCenter.y - 0.12, skullBox.max.z);
    const nose = pivot(head, nosePoint);
    const noseTwitch = pivot(nose, nosePoint);
    noseParts.forEach((p) => noseTwitch.attach(p.mesh));

    const eyeSide = (left) => {
      const side = eyeParts.filter((p) => (left ? p.center.x < skullCenter.x : p.center.x > skullCenter.x));
      const boxCenter = side.length
        ? unionBox(side).getCenter(new THREE.Vector3())
        : new THREE.Vector3(skullCenter.x + (left ? -0.14 : 0.14), nosePoint.y + 0.09, nosePoint.z - 0.04);
      rig.updateMatrixWorld(true);
      const vis = side.length ? visibleEye(side, headParts.map((q) => q.mesh)) : null;
      const point = vis ? new THREE.Vector3(vis.surface.x, vis.surface.y, boxCenter.z) : boxCenter;
      const patch = pivot(head, point);
      const innerGroup = pivot(patch, point);
      const blink = pivot(innerGroup, point);
      const eyeBox = side.length ? unionBox(side) : null;
      const eyeHeight = eyeBox ? eyeBox.max.y - eyeBox.min.y : 0.1;
      const dark = side.filter((p) => isDark(p.color));
      const upper = dark.filter((p) => p.center.y >= point.y + eyeHeight * 0.08);
      const lower = dark.filter((p) => !upper.includes(p) && p.center.y < point.y - eyeHeight * 0.15);
      side.filter((p) => !upper.includes(p)).forEach((p) => blink.attach(p.mesh));
      const lid = pivot(patch, point);
      upper.forEach((p) => lid.attach(p.mesh));
      const upperRel = upper.length ? unionBox(upper).getCenter(new THREE.Vector3()).y - point.y : 0;
      const closeRel = lower.length ? unionBox(lower).getCenter(new THREE.Vector3()).y - point.y + LID_SETTLE : -eyeHeight * 0.22;
      const lidSpan = upper.length ? upperRel * LID_SQUASH - closeRel : 0;
      return {
        patch,
        inner: [innerGroup],
        blink,
        lid,
        lidBase: lid.position.clone(),
        lidSpan,
        center: vis ? vis.surface : point,
        width: vis ? vis.width : skullSize.x * 0.25,
      };
    };
    rig.updateMatrixWorld(true);
    const eyeLeft = eyeSide(true);
    const eyeRight = eyeSide(false);

    const ribbonParts = headParts.filter((p) => !earParts.includes(p) && !eyeParts.includes(p) && !noseParts.includes(p) && isRibbon(p.color));
    const headBow = ribbonParts.length ? pivot(head, unionBox(ribbonParts).getCenter(new THREE.Vector3())) : null;
    ribbonParts.forEach((p) => headBow.attach(p.mesh));

    let tiara = null;
    let tiaraGlint = null;
    if (SHOW_CROWN && skull) {
      const radius = skullSize.x * 0.2;
      const made = makeCrown(radius);
      tiara = made.crown;
      tiaraGlint = made.glint;
      const seat = new THREE.Vector3(skullCenter.x + skullSize.x * 0.1, skullBox.max.y - skullSize.y * 0.07, skullCenter.z + skullSize.z * 0.02);
      const crownPivot = pivot(head, seat);
      crownPivot.rotation.set(-0.1, 0.25, -0.2);
      crownPivot.add(tiara);
    }

    const mouthPoint = nosePoint.clone().add(new THREE.Vector3(0, -0.06, -0.02));
    const mouthGroup = pivot(head, mouthPoint);
    mouthGroup.rotation.x = MOUTH_TILT;
    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 8, 6),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    mouth.visible = false;
    mouthGroup.add(mouth);

    const faceMeshes = headParts
      .filter((p) => !earParts.includes(p) && !noseParts.includes(p) && !eyeParts.includes(p))
      .map((p) => p.mesh);
    rig.updateMatrixWorld(true);
    const caster = new THREE.Raycaster(
      new THREE.Vector3(mouthPoint.x, mouthPoint.y, skullBox.max.z + 1),
      new THREE.Vector3(0, 0, -1),
    );
    const hit = caster.intersectObjects(faceMeshes, false)[0];
    const mouthSurface = hit ? hit.point.clone() : new THREE.Vector3(mouthPoint.x, mouthPoint.y, nosePoint.z);
    const mouthNormal = hit && hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 0, 1);
    if (mouthNormal.z < 0) mouthNormal.negate();
    mouthNormal.lerp(new THREE.Vector3(0, 0, 1), 0.35).normalize();

    const mouthMount = pivot(head, mouthSurface);
    mouthMount.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), mouthNormal);
    const mouthShape = new THREE.Group();
    mouthShape.position.z = 0.003;
    mouthShape.visible = false;
    mouthMount.add(mouthShape);
    const lip = new THREE.Mesh(
      new THREE.ShapeGeometry(MOUTH_SHAPE, 16),
      new THREE.MeshStandardMaterial({ color: "#5a1f2b", roughness: 0.8, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }),
    );
    const tongue = new THREE.Mesh(
      new THREE.ShapeGeometry(TONGUE_SHAPE, 16),
      new THREE.MeshStandardMaterial({ color: "#f07a92", roughness: 0.7, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3 }),
    );
    tongue.position.z = 0.0005;
    mouthShape.add(lip, tongue);

    const feetParts = body.filter((p) => p.center.y < 0.16 && Math.abs(p.center.x - skullCenter.x) > 0.04 && p.size.x < 0.36);
    const furColor = new THREE.Color(PAW_FALLBACK);
    const furSource = feetParts[0] || skull;
    if (furSource) {
      const m = Array.isArray(furSource.mesh.material) ? furSource.mesh.material[0] : furSource.mesh.material;
      const tint = m?.color ? m.color.clone() : new THREE.Color(1, 1, 1);
      furColor.setRGB(furSource.color[0] * tint.r, furSource.color[1] * tint.g, furSource.color[2] * tint.b, THREE.LinearSRGBColorSpace);
    }
    const tail = body.filter((p) => !feetParts.includes(p) && p.center.z < skullCenter.z - 0.15 && p.center.y < 0.5 && p.size.x < 0.3 && p.size.y < 0.3);
    const furMaterial = () => {
      const m = new THREE.MeshStandardMaterial({ color: furColor, roughness: 1, metalness: 0 });
      m.userData.kodaMatte = true;
      return m;
    };
    const skirt = body.filter((p) => p.size.x > 0.55 && p.center.y < HEAD_Y && p.center.y > 0.15);
    const skirtBox = skirt.length ? unionBox(skirt) : null;
    const tailRadius = TAIL_RADIUS;
    const tailPoint = tail.length
      ? unionBox(tail).getCenter(new THREE.Vector3())
      : new THREE.Vector3(skullCenter.x, skirtBox ? skirtBox.min.y + (skirtBox.max.y - skirtBox.min.y) * 0.3 : 0.36, (skirtBox ? skirtBox.min.z : skullCenter.z - 0.38) - tailRadius * 0.25);
    const bow = pivot(rig, tailPoint);
    const tailWag = pivot(bow, tailPoint);
    tail.forEach((p) => {
      p.mesh.material = furMaterial();
      tailWag.attach(p.mesh);
    });
    if (!tail.length) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(tailRadius, 24, 18), furMaterial());
      puff.scale.set(1, 0.95, 0.9);
      puff.castShadow = true;
      puff.receiveShadow = true;
      puff.position.copy(tailWag.worldToLocal(tailPoint.clone()));
      tailWag.add(puff);
    }

    const armSide = (left) => {
      const sign = left ? -1 : 1;
      const onSide = (p) => (left ? p.center.x < skullCenter.x - 0.15 : p.center.x > skullCenter.x + 0.15);
      const sleeve = body.filter((p) => onSide(p) && isWhite(p.color) && p.center.y > 0.45 && p.center.y <= HEAD_Y && p.size.y < 0.42 && p.size.x < 0.42);
      const handList = hands.filter((h) => (left ? h.center.x < 0 : h.center.x > 0));
      const source = sleeve.length ? sleeve : handList;
      const b = unionBox(source);
      const bc = b.getCenter(new THREE.Vector3());
      const bs = b.getSize(new THREE.Vector3());
      const shoulder = new THREE.Vector3(bc.x - sign * bs.x * 0.25, b.max.y - bs.y * 0.15, bc.z);
      let tip = handList[0] ? handList[0].center.clone() : farthestFrom(source, shoulder);
      const arm = pivot(rig, shoulder);
      [...sleeve, ...handList].forEach((p) => arm.attach(p.mesh));
      let paw = null;
      if (!handList.length && tip) {
        const dir = tip.clone().sub(shoulder).normalize();
        const sleeveSize = unionBox(sleeve.length ? sleeve : source).getSize(new THREE.Vector3());
        const pawRadius = Math.min(sleeveSize.x, sleeveSize.y, sleeveSize.z) * PAW_SHARE;
        paw = new THREE.Mesh(
          new THREE.SphereGeometry(pawRadius, 24, 18),
          furMaterial(),
        );
        paw.castShadow = true;
        paw.receiveShadow = true;
        paw.scale.set(1, 0.92, 1);
        const pawAt = tip.clone().addScaledVector(dir, pawRadius * 0.3).add(new THREE.Vector3(-sign * PAW_TUCK, -PAW_DROP, 0));
        paw.position.copy(arm.worldToLocal(pawAt.clone()));
        arm.add(paw);
        tip = pawAt.clone().addScaledVector(pawAt.clone().sub(shoulder).normalize(), pawRadius);
      }
      const reach = tip ? tip.clone().sub(shoulder) : new THREE.Vector3(sign, -1, 0.2);
      const length = tip ? Math.max(0.05, reach.length()) : 0.2;
      return { arm, shoulder, rest: reach.normalize(), length, paw };
    };
    const left = armSide(true);
    const right = armSide(false);

    const legSide = (isLeft) => {
      const onSide = (p) => (isLeft ? p.center.x < skullCenter.x : p.center.x > skullCenter.x);
      const legLike = (p) => onSide(p) && Math.abs(p.center.x - skullCenter.x) > 0.04 && p.size.x < 0.36 && p.size.z < 0.4;
      const pants = body.filter((p) => legLike(p) && p.center.y < 0.35 && p.center.y >= 0.16);
      const feet = body.filter((p) => legLike(p) && p.center.y < 0.16);
      const list = [...pants, ...feet];
      const b = pants.length ? unionBox(pants) : unionBox(list);
      const top = list.length
        ? new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2)
        : new THREE.Vector3(skullCenter.x + (isLeft ? -0.15 : 0.15), 0.25, skullCenter.z);
      const leg = pivot(rig, top);
      list.forEach((p) => leg.attach(p.mesh));
      return leg;
    };
    const legLeft = legSide(true);
    const legRight = legSide(false);

    if (SHOW_OUTLINE) {
      const outlineMat = makeOutlineMaterial();
      const skip = new Set([...eyeParts, ...noseParts].map((p) => p.mesh));
      parts.forEach((p) => {
        if (skip.has(p.mesh) || handSet.has(p.mesh)) return;
        if (Math.max(p.size.x, p.size.y, p.size.z) < 0.12) return;
        addOutline(p.mesh, outlineMat);
      });
      [left.paw, right.paw].forEach((paw) => paw && addOutline(paw, outlineMat));
    }

    const rel = (v) => v.clone().sub(neckPoint);
    const headTop = new THREE.Vector3(skullCenter.x, skullBox.max.y - skullSize.y * 0.1, skullCenter.z);

    const sparkles = Array.from({ length: SPARKLE_COUNT }, () => {
      const sp = sparkleSprite();
      rig.add(sp);
      return sp;
    });
    const sparkleCenter = new THREE.Vector3(skullCenter.x, skullCenter.y - skullSize.y * 0.1, skullCenter.z);

    return {
      rig,
      norm,
      idleNorm: idleNormalized.norm,
      toRig,
      head,
      headBase,
      earLeft: new THREE.Group(),
      earRight: new THREE.Group(),
      realEarLeft: earLeft,
      realEarRight: earRight,
      capScale: 0.85,
      eyeLeft,
      eyeRight,
      nose,
      noseTwitch,
      blinkLeft: eyeLeft.blink,
      blinkRight: eyeRight.blink,
      headBow,
      tiara,
      tiaraGlint,
      sparkles,
      sparkleCenter,
      sparkleRadius: skullSize.x * 0.85,
      tailWag,
      pawLeft: left.paw,
      pawRight: right.paw,
      mouth,
      mouthShape,
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
      eyeBagOffsetLeft: rel(eyeLeft.center).add(new THREE.Vector3(0, -0.07, 0.02)),
      eyeBagOffsetRight: rel(eyeRight.center).add(new THREE.Vector3(0, -0.07, 0.02)),
      eyeOffsetLeft: rel(eyeLeft.center),
      eyeOffsetRight: rel(eyeRight.center),
      eyeWidthLeft: eyeLeft.width,
      eyeWidthRight: eyeRight.width,
    };
  }
}

const _v = new THREE.Vector3();
const _a = new THREE.Vector3();
const _acc = new THREE.Vector3();
const _g = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();

const DANGLERS = [
  { key: "realEarLeft", proxy: "earLeft", stiff: 0.8, k: 60, c: 5.5, splay: -0.7, z: [-1.1, 0.12], x: [-0.8, 0.8] },
  { key: "realEarRight", proxy: "earRight", stiff: 0.8, k: 60, c: 5.5, splay: 0.7, z: [-0.12, 1.1], x: [-0.8, 0.8] },
  { key: "headBow", proxy: null, stiff: 0.22, k: 110, c: 6, splay: 0, z: [-0.35, 0.35], x: [-0.35, 0.35] },
];

const burst = (t, start, length) => {
  const u = (t - start) / length;
  return u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0;
};

export function useBunnyLife(rig) {
  const state = useRef(null);
  useFrame((frame, delta) => {
    const dt = Math.min(Math.max(delta, 0.0001), 1 / 30);
    const t = frame.clock.elapsedTime;
    if (!state.current) {
      state.current = {
        frames: 0,
        danglers: DANGLERS.map(() => ({ z: 0, vz: 0, x: 0, vx: 0, prev: new THREE.Vector3(), vel: new THREE.Vector3(), acc: new THREE.Vector3() })),
        blinkAt: -1,
        nextBlink: t + 1 + Math.random() * 2,
        twitchAt: -10,
        nextTwitch: t + 1.5 + Math.random() * 2,
        wagAt: -10,
        nextWag: t + 2 + Math.random() * 3,
        glintAt: -10,
        nextGlint: t + 1 + Math.random() * 2,
        sparkles: rig.sparkles.map(() => ({ start: t + Math.random() * 3, length: 0, angle: 0, height: 0, depth: 0.5 })),
      };
    }
    const st = state.current;
    st.frames += 1;

    rig.head.updateWorldMatrix(true, false);
    rig.head.getWorldQuaternion(_q).invert();
    rig.rig.getWorldScale(_s);
    const worldHeight = Math.max(0.001, _s.y * LOCAL_REFERENCE_HEIGHT);

    DANGLERS.forEach((d, i) => {
      const obj = rig[d.key];
      if (!obj) return;
      const ds = st.danglers[i];
      _v.copy(obj.position).applyMatrix4(rig.head.matrixWorld);
      if (st.frames > 2) {
        _a.copy(_v).sub(ds.prev).divideScalar(dt);
        _acc.copy(_a).sub(ds.vel).divideScalar(dt);
        ds.vel.copy(_a);
        if (st.frames > 4) ds.acc.lerp(_acc, 0.35);
      }
      ds.prev.copy(_v);
      _g.set(0, -GRAVITY, 0).addScaledVector(ds.acc, -ACCEL_GAIN / worldHeight).applyQuaternion(_q);
      const down = Math.max(0.2, -_g.y);
      const float = THREE.MathUtils.clamp(1 - -_g.y / GRAVITY, -0.5, 1);
      const gz = Math.atan2(_g.x, down) + float * d.splay;
      const gx = Math.atan2(-_g.z, down) - Math.abs(float * d.splay) * 0.2;
      const proxy = d.proxy ? rig[d.proxy] : null;
      const intentZ = proxy ? proxy.rotation.z * EAR_DAMP : 0;
      const intentX = proxy ? proxy.rotation.x * EAR_DAMP : 0;
      const tz = THREE.MathUtils.clamp(intentZ + d.stiff * gz, d.z[0], d.z[1]);
      const tx = THREE.MathUtils.clamp(intentX + d.stiff * gx, d.x[0], d.x[1]);
      for (let step = 0; step < 2; step++) {
        const h = dt / 2;
        ds.vz += (d.k * (tz - ds.z) - d.c * ds.vz) * h;
        ds.vx += (d.k * (tx - ds.x) - d.c * ds.vx) * h;
        ds.z = THREE.MathUtils.clamp(ds.z + ds.vz * h, d.z[0], d.z[1]);
        ds.x = THREE.MathUtils.clamp(ds.x + ds.vx * h, d.x[0], d.x[1]);
      }
      obj.rotation.set(ds.x, proxy ? proxy.rotation.y * EAR_DAMP : 0, ds.z);
    });

    if (t > st.nextBlink) {
      st.blinkAt = t;
      st.nextBlink = t + (Math.random() < 0.2 ? 0.28 : 2.2 + Math.random() * 3);
    }
    const blink = burst(t, st.blinkAt, 0.16);
    if (rig.blinkLeft) rig.blinkLeft.scale.y = 1 - blink * 0.92;
    if (rig.blinkRight) rig.blinkRight.scale.y = 1 - blink * 0.92;
    [rig.eyeLeft, rig.eyeRight].forEach((e) => {
      if (!e || !e.lid) return;
      const g = e.inner[0];
      const open = g.scale.y * e.blink.scale.y;
      e.lid.position.set(e.lidBase.x, e.lidBase.y + e.lidSpan * (Math.min(1, open) - 1), e.lidBase.z);
      e.lid.scale.set(g.scale.x, LID_SQUASH + (1 - LID_SQUASH) * Math.min(1, Math.max(0, open)), 1);
      e.lid.visible = !e.hideLid;
      e.blink.visible = open > 0.14;
    });

    if (t > st.nextTwitch) {
      st.twitchAt = t;
      st.nextTwitch = t + 2.5 + Math.random() * 3;
    }
    const twitch = burst(t, st.twitchAt, 0.7) * Math.sin(t * 38);
    if (rig.noseTwitch) {
      rig.noseTwitch.scale.set(1 + twitch * 0.14, 1 - twitch * 0.07, 1);
      rig.noseTwitch.position.y = Math.abs(twitch) * 0.004;
    }

    if (t > st.nextWag) {
      st.wagAt = t;
      st.nextWag = t + 3 + Math.random() * 3.5;
    }
    const wag = burst(t, st.wagAt, 0.9);
    if (rig.tailWag) {
      rig.tailWag.rotation.set(0, Math.sin(t * 24) * 0.3 * wag, Math.sin(t * 30) * 0.35 * wag);
      rig.tailWag.scale.setScalar(1 + wag * 0.08);
    }

    if (rig.tiaraGlint) {
      if (t > st.nextGlint) {
        st.glintAt = t;
        st.nextGlint = t + 2.2 + Math.random() * 2.5;
      }
      const g = burst(t, st.glintAt, 0.5);
      rig.tiaraGlint.material.opacity = g;
      rig.tiaraGlint.material.rotation = t * 2;
      rig.tiaraGlint.scale.setScalar(0.0001 + g * 0.13);
    }

    rig.sparkles.forEach((sp, i) => {
      const s = st.sparkles[i];
      const life = s.length ? (t - s.start) / s.length : 1;
      if (life >= 1) {
        s.start = t + 0.4 + Math.random() * 2.2;
        s.length = 1.1 + Math.random() * 0.9;
        s.angle = (Math.random() - 0.5) * Math.PI * 1.5;
        s.height = (Math.random() - 0.3) * rig.sparkleRadius * 0.9;
        s.depth = 0.3 + Math.random() * 0.4;
      }
      const on = life > 0 && life < 1 ? Math.sin(life * Math.PI) : 0;
      sp.position.set(
        rig.sparkleCenter.x + Math.sin(s.angle) * rig.sparkleRadius,
        rig.sparkleCenter.y + s.height + Math.max(0, life) * 0.06,
        rig.sparkleCenter.z + Math.cos(s.angle) * rig.sparkleRadius * s.depth,
      );
      sp.material.opacity = on * 0.8;
      sp.material.rotation = t * 1.5 + i;
      sp.scale.setScalar(0.0001 + on * (0.05 + (i % 3) * 0.015));
    });
  });
}

function RigSync({ rig }) {
  useBunnyLife(rig);
  useFrame(() => {
    const sx = Math.abs(rig.mouth.scale.x);
    const sy = Math.abs(rig.mouth.scale.y);
    rig.mouthShape.visible = rig.mouth.visible && sx > 0.004;
    rig.mouthShape.scale.set(sx * 1.1, Math.max(sy, 0.004) * 2.2, 1);
  });
  return null;
}

function ClosedEyes({ rig }) {
  useFrame(() => {
    [rig.eyeLeft, rig.eyeRight].forEach((e, i) => {
      e.inner.forEach((g) => g.scale.set(1.12, 0.08, 1));
      e.patch.rotation.z = i ? 0.3 : -0.3;
    });
  });
  return null;
}

const PRINCESS_ACTIONS = { curtsy: 2.4, twirl: 1.5, wave: 1.8, tilt: 1.6, sway: 2.2 };
const PRINCESS_NAMES = Object.keys(PRINCESS_ACTIONS);

export function BunnyPrincessIdleRig({ rig, motion }) {
  const action = useRef(null);
  const nextAction = useRef(2.5 + Math.random() * 2);
  const lastAction = useRef(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  const own = useRef({ hop: 0, glance: 0, busy: false, nextHop: 2 + Math.random() * 2, hopAt: -10 });
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const m = (motion || own).current;
    if (!motion) {
      if (t > m.nextHop) {
        if (m.busy) m.nextHop = t + 1.2;
        else {
          m.hopAt = t;
          m.nextHop = t + 2.5 + Math.random() * 2.5;
        }
      }
      const h = (t - m.hopAt) / 0.32;
      m.hop = h > 0 && h < 1 ? Math.sin(h * Math.PI) : 0;
      m.glance = Math.sin(t * 0.5) * 0.15;
    }
    const hop = m.hop;

    let a = action.current;
    if (!a && t > nextAction.current && hop === 0) {
      const options = PRINCESS_NAMES.filter((n) => n !== lastAction.current);
      const type = options[Math.floor(Math.random() * options.length)];
      a = action.current = { type, start: t, side: Math.random() < 0.5 ? -1 : 1 };
      lastAction.current = type;
    }
    let u = a ? (t - a.start) / PRINCESS_ACTIONS[a.type] : 0;
    if (a && u >= 1) {
      action.current = null;
      a = null;
      u = 0;
      nextAction.current = t + 3.5 + Math.random() * 3.5;
    }
    m.busy = !!a;
    const bell = a ? smooth(0, 0.2, u) * (1 - smooth(0.8, 1, u)) : 0;
    const is = (name) => (a && a.type === name ? 1 : 0);

    const shift = Math.sin(t * 1.05);
    const shiftLag = Math.sin(t * 1.05 - 0.7);
    const breath = Math.sin(t * 2.1);
    const bob = Math.abs(Math.sin(t * 1.05));
    let rootY = bob * 0.012 - 0.006;
    let rootSpin = Math.sin(t * 0.55) * 0.1 + m.glance * 0.35;
    let rootRoll = shift * 0.06;
    let squash = 1 + breath * 0.022 - hop * 0.05;
    let headX = breath * 0.03 + Math.sin(t * 0.9) * 0.03 - hop * 0.08;
    let headY = m.glance * 0.6 + Math.sin(t * 0.7) * 0.1 - rootSpin * 0.5;
    let headZ = -shiftLag * 0.1 + Math.sin(t * 1.7 + 0.6) * 0.04;
    let squint = 0;
    let smile = 0;
    let earZ = Math.sin(t * 1.3) * 0.1;
    let earX = 0;
    let legL = -hop * 0.35 + Math.max(0, -shift) * 0.12;
    let legR = -hop * 0.35 + Math.max(0, shift) * 0.12;
    const arms = {
      left: { amount: 0, x: 0, y: 0, z: 0 },
      right: { amount: 0, x: 0, y: 0, z: 0 },
    };
    const reach = (side, amount, x, y, z) => {
      const arm = side < 0 ? arms.left : arms.right;
      arm.amount = amount;
      arm.x = x * side;
      arm.y = y;
      arm.z = z;
    };

    if (is("curtsy")) {
      const dip = pulse(0.12, 0.88, u);
      rootY = -0.07 * dip;
      squash *= 1 - 0.04 * dip;
      headZ += 0.28 * dip * a.side;
      headX += 0.15 * dip;
      reach(-1, 0.85 * dip, 0.32, -0.22, 0.16);
      reach(1, 0.85 * dip, 0.32, -0.22, 0.16);
      if (a.side < 0) legL = 0.4 * dip;
      else legR = 0.4 * dip;
      earX = 0.25 * dip;
      squint = 0.55 * dip;
      smile = dip;
    }
    if (is("twirl")) {
      const k = THREE.MathUtils.clamp(u, 0, 1);
      const spin = k * k * (3 - 2 * k);
      const lift = Math.sin(Math.PI * k);
      rootSpin = spin * Math.PI * 2 * a.side;
      rootY = 0.05 * lift;
      reach(-1, 0.8 * lift, 0.5, 0.05, 0);
      reach(1, 0.8 * lift, 0.5, 0.05, 0);
      squint = 0.6 * lift;
      smile = lift;
      legL = -0.2 * lift;
      legR = -0.2 * lift;
    }
    if (is("wave")) {
      reach(a.side, 0.95 * bell, 0.12 + Math.sin(t * 14) * 0.07, 0.42, 0.18);
      headZ += -a.side * 0.12 * bell;
      squint = 0.35 * bell;
      smile = bell;
      earZ += Math.sin(t * 7) * 0.1 * bell;
    }
    if (is("tilt")) {
      const tip = pulse(0, 1, u);
      headZ += a.side * 0.38 * tip;
      headY += a.side * 0.15 * tip;
      headX -= 0.06 * tip;
      earZ += a.side * 0.15 * tip;
    }
    if (is("sway")) {
      const beat = Math.sin(t * 5);
      rootRoll = beat * 0.07 * bell;
      headZ += -beat * 0.08 * bell;
      reach(-1, 0.6 * bell, 0.25, -0.15 + Math.sin(t * 5) * 0.12, 0.12);
      reach(1, 0.6 * bell, 0.25, -0.15 + Math.sin(t * 5 + Math.PI) * 0.12, 0.12);
      squint = 0.5 * bell;
      smile = bell;
      legL = Math.max(0, beat) * 0.15 * bell;
      legR = Math.max(0, -beat) * 0.15 * bell;
    }

    rig.rig.position.set(0, rootY + (motion ? 0 : hop * 0.12), 0);
    rig.rig.rotation.set(0, rootSpin, rootRoll);
    rig.rig.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(headX, headY, headZ);
    rig.head.scale.set(1, 1, 1);
    [rig.eyeLeft, rig.eyeRight].forEach((e) => {
      e.patch.rotation.z = 0;
      e.inner.forEach((g) => g.scale.set(1 + squint * 0.08, 1 - squint, 1));
    });
    rig.earLeft.rotation.set(earX, 0, earZ);
    rig.earRight.rotation.set(earX, 0, -earZ);
    rig.nose.scale.set(1, 1, 1);
    rig.mouth.visible = smile > 0.05;
    rig.mouth.scale.set(0.024 * smile + 0.001, 0.008 * smile + 0.001, 0.01);
    rig.legLeft.rotation.set(legL, 0, 0);
    rig.legRight.rotation.set(legR, 0, 0);
    rig.bow.rotation.set(0, 0, 0);

    [
      [rig.armLeft, rig.shoulderLeft, rig.restLeft, arms.left, -1],
      [rig.armRight, rig.shoulderRight, rig.restRight, arms.right, 1],
    ].forEach(([arm, shoulder, rest, pose, side]) => {
      if (pose.amount > 0.001) {
        target.set(shoulder.x + pose.x, shoulder.y + pose.y, shoulder.z + pose.z);
        aimArm(arm, shoulder, rest, target, pose.amount);
      } else {
        arm.quaternion.identity();
        const swing = Math.sin(t * 1.05 - 0.9 + (side < 0 ? 0 : Math.PI));
        arm.rotation.set(swing * 0.22 - hop * 0.3, 0, side * (0.06 + breath * 0.05 + hop * 0.35) - shiftLag * 0.12);
      }
    });
  });
  return <primitive object={rig.rig} />;
}

const closedWrapped = new WeakMap();

export function withClosedEyes(Rig) {
  if (!closedWrapped.has(Rig)) {
    const Closed = (props) => (
      <>
        <Rig {...props} />
        <ClosedEyes rig={props.rig} />
      </>
    );
    closedWrapped.set(Rig, Closed);
  }
  return closedWrapped.get(Rig);
}

const wrapped = new WeakMap();

function withRigSync(Rig) {
  if (!wrapped.has(Rig)) {
    const BunnyRig = (props) => (
      <>
        <Rig {...props} />
        <RigSync rig={props.rig} />
      </>
    );
    wrapped.set(Rig, BunnyRig);
  }
  return wrapped.get(Rig);
}

export function BunnyMood({ idleModelPath, Rig, ...props }) {
  return <PandaMood {...props} Rig={withRigSync(Rig)} idleModelPath={idleModelPath || BUNNY_IDLE_MODEL} useRig={usePooledBunnyRig} />;
}