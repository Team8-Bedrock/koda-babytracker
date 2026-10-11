import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { LOCAL_REFERENCE_HEIGHT, PandaMood } from "../panda/pandaRig";

export const BEAR_IDLE_MODEL = "/models/characters/bear/bear.glb";
const MOUTH_TILT = 0.45;

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

const isDark = ([r, g, b]) => Math.max(r, g, b) < 0.12;
const isSleeve = ([r, g, b]) => r > 0.13 && r < 0.24 && Math.abs(r - g) < 0.04 && b < r;
const isBrown = ([r, g, b]) => r > 0.2 && r < 0.4 && g < 0.16 && b < 0.06;
const isGreen = ([r, g, b]) => g > r && g > 0.24 && g < 0.4 && r < 0.3;
const isWhite = (rgb) => Math.min(...rgb) > 0.9;
const isPants = ([r, g, b]) => r > 0.85 && g > 0.95 && b < 0.35;

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

const isHandPart = (p) => isBrown(p.color) && Math.abs(p.center.x) > 0.25 && p.center.y > 0.3 && p.center.y < 0.85;

function unionBox(list) {
  const b = new THREE.Box3();
  list.forEach((p) => b.union(p.box));
  return b;
}

export function useBearRig(url, idleUrl) {
  const gltf = useGLTF(url);
  const idle = useGLTF(idleUrl);
  return useMemo(() => {
    const { rig, parts, norm } = normalizedParts(gltf.scene);
    const toRig = ([x, y, z]) => new THREE.Vector3((x - norm.center.x) * norm.k, (y - norm.minY) * norm.k, (z - norm.center.z) * norm.k);

    const idleNormalized = normalizedParts(idle.scene);
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

    const HEAD_Y = 0.864;
    const headParts = body.filter((p) => p.center.y > HEAD_Y);
    const skull = headParts.filter((p) => isBrown(p.color)).sort((a, b) => b.size.x * b.size.y - a.size.x * a.size.y)[0];
    const skullBox = skull ? skull.box : unionBox(headParts);
    const skullCenter = skullBox.getCenter(new THREE.Vector3());
    const skullSize = skullBox.getSize(new THREE.Vector3());
    const neckPoint = new THREE.Vector3(skullCenter.x, skullBox.min.y + skullSize.y * 0.08, skullCenter.z);
    const head = pivot(rig, neckPoint);
    headParts.forEach((p) => head.attach(p.mesh));
    const headBase = head.position.clone();

    const earParts = headParts.filter((p) => p !== skull && p.center.y > skullCenter.y + skullSize.y * 0.18 && Math.abs(p.center.x - skullCenter.x) > 0.13);
    const earFor = (left) => {
      const side = earParts.filter((p) => (left ? p.center.x < skullCenter.x : p.center.x > skullCenter.x));
      const b = side.length ? unionBox(side) : null;
      const point = b
        ? new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y + (b.max.y - b.min.y) * 0.2, (b.min.z + b.max.z) / 2)
        : new THREE.Vector3(skullCenter.x + (left ? -0.22 : 0.22), skullBox.max.y - 0.1, skullCenter.z);
      const g = pivot(head, point);
      side.forEach((p) => g.attach(p.mesh));
      return g;
    };
    const earLeft = earFor(true);
    const earRight = earFor(false);

    const faceDark = headParts.filter((p) => isDark(p.color) && p.center.z > skullCenter.z + 0.05);
    const noseParts = faceDark.filter((p) => Math.abs(p.center.x - skullCenter.x) < 0.08);
    const eyeParts = faceDark.filter((p) => Math.abs(p.center.x - skullCenter.x) >= 0.08 && p.center.y > skullBox.min.y + skullSize.y * 0.25);
    const noseBox = noseParts.length ? unionBox(noseParts) : null;
    const nosePoint = noseBox ? noseBox.getCenter(new THREE.Vector3()) : new THREE.Vector3(skullCenter.x, skullCenter.y - 0.12, skullBox.max.z);
    const nose = pivot(head, nosePoint);
    noseParts.forEach((p) => nose.attach(p.mesh));

    const eyeSide = (left) => {
      const side = eyeParts.filter((p) => (left ? p.center.x < skullCenter.x : p.center.x > skullCenter.x));
      const point = side.length
        ? unionBox(side).getCenter(new THREE.Vector3())
        : new THREE.Vector3(skullCenter.x + (left ? -0.17 : 0.17), nosePoint.y + 0.11, nosePoint.z - 0.07);
      const patch = pivot(head, point);
      const innerGroup = pivot(patch, point);
      side.forEach((p) => innerGroup.attach(p.mesh));
      return { patch, inner: [innerGroup], center: point };
    };
    const eyeLeft = eyeSide(true);
    const eyeRight = eyeSide(false);

    const mouthPoint = nosePoint.clone().add(new THREE.Vector3(0, -0.1, -0.035));
    const mouthGroup = pivot(head, mouthPoint);
    mouthGroup.rotation.x = MOUTH_TILT;
    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshStandardMaterial({ color: "#5a1f2b", roughness: 0.7 }),
    );
    mouth.visible = false;
    mouthGroup.add(mouth);

    const collar = body.filter((p) => isWhite(p.color) && p.center.y > 0.68 && p.center.y <= HEAD_Y && Math.abs(p.center.x - skullCenter.x) < 0.15);
    const collarPoint = collar.length ? unionBox(collar).getCenter(new THREE.Vector3()) : new THREE.Vector3(skullCenter.x, 0.82, skullCenter.z + 0.1);
    const bow = pivot(rig, collarPoint);
    collar.forEach((p) => bow.attach(p.mesh));

    const armSide = (left) => {
      const sign = left ? -1 : 1;
      const onSide = (p) => (left ? p.center.x < skullCenter.x - 0.12 : p.center.x > skullCenter.x + 0.12);
      const sleeve = body.filter((p) => onSide(p) && isSleeve(p.color) && p.center.y > 0.55 && p.center.y <= HEAD_Y && p.size.y > 0.12);
      const cuff = body.filter((p) => onSide(p) && isGreen(p.color) && p.center.y > 0.5 && p.size.x < 0.45);
      const handList = hands.filter((h) => (left ? h.center.x < 0 : h.center.x > 0));
      const b = sleeve.length ? unionBox(sleeve) : unionBox(cuff.length ? cuff : handList);
      const bc = b.getCenter(new THREE.Vector3());
      const bs = b.getSize(new THREE.Vector3());
      const shoulder = new THREE.Vector3(bc.x - sign * bs.x * 0.25, b.max.y - bs.y * 0.15, bc.z);
      const arm = pivot(rig, shoulder);
      [...sleeve, ...cuff, ...handList].forEach((p) => arm.attach(p.mesh));
      const hand = handList[0];
      const rest = hand ? hand.center.clone().sub(shoulder).normalize() : new THREE.Vector3(sign, -1, 0.2).normalize();
      return { arm, shoulder, rest };
    };
    const left = armSide(true);
    const right = armSide(false);

    const legSide = (isLeft) => {
      const onSide = (p) => (isLeft ? p.center.x < skullCenter.x : p.center.x > skullCenter.x);
      const pants = body.filter((p) => onSide(p) && isPants(p.color) && p.center.y < 0.4);
      const feet = body.filter((p) => onSide(p) && isBrown(p.color) && p.center.y < 0.3);
      const list = [...pants, ...feet];
      const b = pants.length ? unionBox(pants) : unionBox(list);
      const top = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2);
      const leg = pivot(rig, top);
      list.forEach((p) => leg.attach(p.mesh));
      return leg;
    };
    const legLeft = legSide(true);
    const legRight = legSide(false);

    const rel = (v) => v.clone().sub(neckPoint);
    const headTop = new THREE.Vector3(skullCenter.x, skullBox.max.y - skullSize.y * 0.3, skullCenter.z);

    return {
      rig,
      norm,
      idleNorm: idleNormalized.norm,
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
      armLeft: left.arm,
      armRight: right.arm,
      legLeft,
      legRight,
      restLeft: left.rest,
      restRight: right.rest,
      shoulderLeft: left.shoulder,
      shoulderRight: right.shoulder,
      mouthOffset: rel(mouthPoint),
      noseOffset: rel(nosePoint),
      headTopOffset: rel(headTop),
      eyeBagOffsetLeft: rel(eyeLeft.center).add(new THREE.Vector3(0, -0.07, 0.02)),
      eyeBagOffsetRight: rel(eyeRight.center).add(new THREE.Vector3(0, -0.07, 0.02)),
      eyeOffsetLeft: rel(eyeLeft.center),
      eyeOffsetRight: rel(eyeRight.center),
    };
  }, [gltf, idle]);
}

export function BearMood({ idleModelPath, ...props }) {
  return <PandaMood {...props} idleModelPath={idleModelPath || BEAR_IDLE_MODEL} useRig={useBearRig} />;
}
