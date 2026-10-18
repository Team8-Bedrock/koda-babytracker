import * as THREE from "three";
import { LOCAL_REFERENCE_HEIGHT } from "./pandaRig";

export function meshesOf(root) {
  const list = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const box = new THREE.Box3().setFromObject(o);
    list.push({ mesh: o, box, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) });
  });
  return list;
}

export function normOf(scene) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  return { box, center: box.getCenter(new THREE.Vector3()), minY: box.min.y, k: LOCAL_REFERENCE_HEIGHT / (size.y || 1) };
}

export function borrowMesh(root, part) {
  const h = part.mesh.clone(true);
  part.mesh.matrixWorld.decompose(h.position, h.quaternion, h.scale);
  h.castShadow = true;
  root.add(h);
  return h;
}

export function cuffTip(meshes, shoulder) {
  const v = new THREE.Vector3();
  const verts = [];
  meshes.forEach((m) => {
    const pos = m.geometry?.attributes?.position;
    if (!pos) return;
    const step = Math.max(1, Math.floor(pos.count / 3000));
    for (let i = 0; i < pos.count; i += step) verts.push(v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).clone());
  });
  if (!verts.length) return null;
  const far = Math.max(...verts.map((p) => p.distanceTo(shoulder)));
  const ring = verts.filter((p) => p.distanceTo(shoulder) > far * 0.9);
  return ring.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(ring.length);
}

export function makePivot(parent, point) {
  parent.updateMatrixWorld(true);
  const g = new THREE.Group();
  g.position.copy(parent.worldToLocal(point.clone()));
  parent.add(g);
  g.updateMatrixWorld(true);
  return g;
}

export const boxCenter = (obj) => new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());

export function unionOf(meshes) {
  const b = new THREE.Box3();
  meshes.forEach((m) => b.union(new THREE.Box3().setFromObject(m)));
  return b;
}

export function stageRoot(root, norm) {
  root.position.set(-norm.center.x, -norm.minY, -norm.center.z);
  const scaled = new THREE.Group();
  scaled.add(root);
  scaled.scale.setScalar(norm.k);
  const rig = new THREE.Group();
  rig.add(scaled);
  rig.updateMatrixWorld(true);
  return rig;
}

export function eyePair(head, eyeMeshes, cx, fallbackLeft, fallbackRight) {
  const side = (left) => {
    const list = eyeMeshes.filter((m) => (left ? boxCenter(m).x < cx : boxCenter(m).x >= cx));
    const box = list.length ? unionOf(list) : null;
    const center = box ? box.getCenter(new THREE.Vector3()) : (left ? fallbackLeft : fallbackRight).clone();
    const height = box ? box.getSize(new THREE.Vector3()).y : 0;
    const patch = makePivot(head, center);
    const inner = list.map((m) => {
      const g = makePivot(patch, boxCenter(m));
      g.attach(m);
      return g;
    });
    if (!inner.length) inner.push(makePivot(patch, center));
    return { patch, inner, blink: inner[0], center, height };
  };
  return [side(true), side(false)];
}

export function lifeLayer(outer, meshes) {
  outer.updateMatrixWorld(true);
  const inner = new THREE.Group();
  outer.add(inner);
  inner.updateMatrixWorld(true);
  meshes.forEach((m) => inner.attach(m));
  return inner;
}

export function canvasTexture(draw, size = 128) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  ctx.translate(size / 2, size / 2);
  ctx.scale(size / 128, size / 128);
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function floaty(texture) {
  const m = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, toneMapped: false });
  const s = new THREE.Sprite(m);
  s.visible = false;
  return s;
}

export const wave = (t, speed, phase = 0) => Math.sin(t * speed + phase);
export const twitch = (t, speed, phase = 0, sharp = 24) => Math.pow(Math.max(0, Math.sin(t * speed + phase)), sharp);
export const approach = (from, to, dt, rate) => from + (to - from) * Math.min(1, dt * rate);
