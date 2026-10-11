import { Suspense, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

export const LOCAL_REFERENCE_HEIGHT = 1.6;
export const PANDA_IDLE_MODEL = "/models/characters/panda/panda.glb";

const RAW = {
  neck: [0.304, -0.18, 0.04],
  mouth: [0.306, -0.1646, 0.1025],
  nose: [0.304, -0.152, 0.112],
  earLeft: [0.262, -0.115, 0.03],
  earRight: [0.348, -0.115, 0.035],
  shoulderLeft: [0.275, -0.205, 0.045],
  shoulderRight: [0.336, -0.205, 0.045],
  hipLeft: [0.279, -0.29, 0.05],
  hipRight: [0.328, -0.29, 0.05],
  bow: [0.308, -0.19, 0.075],
};
const MOUTH_TILT = 0.45;

export const smooth = (a, b, x) => {
  const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};
export const pulse = (a, b, x) => (x > a && x < b ? Math.sin(((x - a) / (b - a)) * Math.PI) : 0);

export function makeMatte(root) {
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

function meshesOf(root) {
  const list = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh) return;
    const box = new THREE.Box3().setFromObject(o);
    list.push({ mesh: o, center: box.getCenter(new THREE.Vector3()), size: box.getSize(new THREE.Vector3()) });
  });
  return list;
}

export function usePandaRig(url, idleUrl) {
  const gltf = useGLTF(url);
  const idle = useGLTF(idleUrl);
  return useMemo(() => {
    const root = gltf.scene.clone(true);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const k = LOCAL_REFERENCE_HEIGHT / (size.y || 1);
    const norm = { center: center.clone(), minY: box.min.y, k };
    const toRig = ([x, y, z]) => new THREE.Vector3((x - center.x) * k, (y - box.min.y) * k, (z - center.z) * k);
    const cx = center.x;

    const parts = meshesOf(root);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    const isHand = (p) => p.center.y > -0.27 && p.center.y < -0.23 && Math.abs(p.center.x - cx) > 0.06 && p.size.y < 0.08;
    const ownHands = parts.filter(isHand);
    const hands = ownHands.length
      ? ownHands.map((p) => ({ mesh: p.mesh, left: p.center.x < cx }))
      : meshesOf(idle.scene)
          .filter(isHand)
          .map((p) => {
            const h = p.mesh.clone(true);
            p.mesh.matrixWorld.decompose(h.position, h.quaternion, h.scale);
            h.castShadow = true;
            root.add(h);
            return { mesh: h, left: p.center.x < cx };
          });

    root.position.set(-center.x, -box.min.y, -center.z);
    const scaled = new THREE.Group();
    scaled.add(root);
    scaled.scale.setScalar(k);
    const rig = new THREE.Group();
    rig.add(scaled);
    rig.updateMatrixWorld(true);

    const pivot = (parent, point) => {
      parent.updateMatrixWorld(true);
      const g = new THREE.Group();
      g.position.copy(parent.worldToLocal(point.clone()));
      parent.add(g);
      g.updateMatrixWorld(true);
      return g;
    };
    const centerOf = (mesh) => new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());

    const neckPoint = toRig(RAW.neck);
    const head = pivot(rig, neckPoint);
    const headParts = parts.filter((p) => p.center.y > -0.17);
    headParts.forEach((p) => head.attach(p.mesh));
    const headBase = head.position.clone();

    const earParts = headParts.filter((p) => p.center.y > -0.11 && Math.abs(p.center.x - cx) > 0.03);
    const earLeft = pivot(head, toRig(RAW.earLeft));
    const earRight = pivot(head, toRig(RAW.earRight));
    earParts.forEach((p) => (p.center.x < cx ? earLeft : earRight).attach(p.mesh));

    const faceParts = headParts.filter((p) => p.center.z > 0.085 && p.center.y < -0.12 && p.center.y > -0.16 && Math.abs(p.center.x - cx) > 0.012);
    const eyeSide = (left) => {
      const side = faceParts.filter((p) => (left ? p.center.x < cx : p.center.x > cx));
      const patchPart = side.find((p) => p.size.y > 0.04);
      const patch = pivot(head, patchPart ? centerOf(patchPart.mesh) : toRig([left ? 0.278 : 0.331, -0.134, 0.095]));
      if (patchPart) patch.attach(patchPart.mesh);
      const inner = side
        .filter((p) => p.size.y <= 0.04)
        .map((p) => {
          const g = pivot(patch, centerOf(p.mesh));
          g.attach(p.mesh);
          return g;
        });
      return { patch, inner };
    };
    const eyeLeft = eyeSide(true);
    const eyeRight = eyeSide(false);

    const nose = pivot(head, toRig(RAW.nose));
    headParts
      .filter((p) => p.center.z > 0.1 && Math.abs(p.center.x - cx) < 0.012 && p.size.y < 0.02)
      .forEach((p) => nose.attach(p.mesh));

    const mouthGroup = pivot(head, toRig(RAW.mouth));
    mouthGroup.rotation.x = MOUTH_TILT;
    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshStandardMaterial({ color: "#5a1f2b", roughness: 0.7 }),
    );
    mouth.visible = false;
    mouthGroup.add(mouth);

    const bow = pivot(rig, toRig(RAW.bow));
    parts
      .filter((p) => p.center.y > -0.205 && p.center.y < -0.185 && p.size.y > 0.05 && p.center.z > 0.05)
      .forEach((p) => bow.attach(p.mesh));

    const armFor = (left) => {
      const arm = pivot(rig, toRig(left ? RAW.shoulderLeft : RAW.shoulderRight));
      parts
        .filter((p) => p.center.y > -0.235 && p.center.y < -0.2 && p.size.y < 0.06 && (left ? p.center.x < cx - 0.02 : p.center.x > cx + 0.02))
        .forEach((p) => arm.attach(p.mesh));
      hands.filter((h) => h.left === left).forEach((h) => arm.attach(h.mesh));
      return arm;
    };
    const armLeft = armFor(true);
    const armRight = armFor(false);
    const restDir = (left) => {
      const h = hands.find((x) => x.left === left);
      const shoulder = toRig(left ? RAW.shoulderLeft : RAW.shoulderRight);
      if (!h) return new THREE.Vector3(left ? -1 : 1, -1, 0.2).normalize();
      return centerOf(h.mesh).sub(shoulder).normalize();
    };

    const legFor = (left) => {
      const leg = pivot(rig, toRig(left ? RAW.hipLeft : RAW.hipRight));
      parts
        .filter((p) => p.center.y < -0.295 && Math.abs(p.center.x - cx) > 0.008 && p.size.x < 0.06 && (left ? p.center.x < cx : p.center.x > cx))
        .forEach((p) => leg.attach(p.mesh));
      return leg;
    };
    const legLeft = legFor(true);
    const legRight = legFor(false);

    return {
      rig,
      norm,
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
      mouthOffset: toRig(RAW.mouth).sub(neckPoint),
      noseOffset: toRig(RAW.nose).sub(neckPoint),
      headTopOffset: toRig([0.303, -0.078, 0.03]).sub(neckPoint),
      eyeBagOffsetLeft: toRig([0.278, -0.158, 0.101]).sub(neckPoint),
      eyeBagOffsetRight: toRig([0.331, -0.159, 0.105]).sub(neckPoint),
      eyeOffsetLeft: toRig([0.276, -0.15, 0.1]).sub(neckPoint),
      eyeOffsetRight: toRig([0.334, -0.15, 0.104]).sub(neckPoint),
    };
  }, [gltf, idle]);
}

const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();

export function aimArm(arm, shoulder, rest, target, amount) {
  _v.copy(target).sub(shoulder).normalize();
  _q.setFromUnitVectors(rest, _v);
  arm.quaternion.identity().slerp(_q, THREE.MathUtils.clamp(amount, 0, 1));
}

export function headPoint(rig, offset, out) {
  rig.head.updateMatrix();
  return out.copy(offset).applyMatrix4(rig.head.matrix);
}

export function makeTexture(kind) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.translate(64, 64);
  if (kind === "z") {
    ctx.font = "bold 92px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 10;
    ctx.strokeStyle = "#ffffff";
    ctx.strokeText("Z", 0, 4);
    ctx.fillStyle = "#7d86d9";
    ctx.fillText("Z", 0, 4);
  } else if (kind === "puff") {
    const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 60);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.6, "rgba(240,240,245,0.7)");
    g.addColorStop(1, "rgba(230,230,240,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 60, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "anger") {
    ctx.strokeStyle = "#e5383b";
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    [0, 1, 2, 3].forEach((i) => {
      ctx.save();
      ctx.rotate((i * Math.PI) / 2);
      ctx.beginPath();
      ctx.moveTo(12, -40);
      ctx.quadraticCurveTo(12, -12, 40, -12);
      ctx.stroke();
      ctx.restore();
    });
  } else if (kind === "tear") {
    const g = ctx.createLinearGradient(-20, -40, 20, 40);
    g.addColorStop(0, "#e6f6ff");
    g.addColorStop(1, "#7cc4f2");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -46);
    ctx.bezierCurveTo(12, -22, 32, 0, 32, 18);
    ctx.arc(0, 18, 32, 0, Math.PI);
    ctx.bezierCurveTo(-32, 0, -12, -22, 0, -46);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(-11, 14, 6, 10, -0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "thought") {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(90,110,90,0.35)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    [[-26, -6, 30], [6, -18, 34], [30, 6, 28], [-4, 20, 30]].forEach(([x, y, r]) => {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    });
    ctx.fill();
    ctx.save();
    ctx.rotate(-0.5);
    ctx.fillStyle = "#3f9a46";
    ctx.fillRect(-7, -36, 14, 72);
    ctx.fillStyle = "#b8e46a";
    [-16, 4, 22].forEach((y) => ctx.fillRect(-9, y, 18, 4));
    ctx.fillStyle = "#7fd34e";
    ctx.beginPath();
    ctx.ellipse(16, -26, 16, 6, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (kind === "dot") {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "rgba(90,110,90,0.35)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (kind === "rumble") {
    ctx.strokeStyle = "#c98a3a";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    [-22, 0, 22].forEach((y) => {
      ctx.beginPath();
      for (let x = -40; x <= 40; x += 4) {
        const yy = y + Math.sin(x / 7) * 6;
        if (x === -40) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    });
  } else if (kind === "star") {
    ctx.fillStyle = "#fff1a8";
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 46 : 20;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  } else if (kind === "moon") {
    ctx.fillStyle = "#ffe9a8";
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(22, -14, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  } else if (kind === "sun") {
    ctx.fillStyle = "#ffd25a";
    for (let i = 0; i < 10; i++) {
      ctx.save();
      ctx.rotate((i / 10) * Math.PI * 2);
      ctx.beginPath();
      ctx.moveTo(-7, -34);
      ctx.lineTo(0, -56);
      ctx.lineTo(7, -34);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#ffe27a";
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "cloud" || kind === "raincloud") {
    ctx.fillStyle = kind === "raincloud" ? "#9aa4b8" : "#ffffff";
    ctx.beginPath();
    [[-26, 6, 24], [0, -8, 30], [26, 6, 22], [0, 14, 22]].forEach(([x, y, r]) => {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    });
    ctx.fill();
    if (kind === "raincloud") {
      ctx.strokeStyle = "#7cc4f2";
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      [-22, 0, 22].forEach((x) => {
        ctx.beginPath();
        ctx.moveTo(x, 40);
        ctx.lineTo(x - 5, 56);
        ctx.stroke();
      });
    }
  } else if (kind === "note") {
    ctx.fillStyle = "#8d7fd6";
    ctx.beginPath();
    ctx.ellipse(-14, 26, 17, 12, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-1, -40, 8, 66);
    ctx.beginPath();
    ctx.moveTo(7, -40);
    ctx.quadraticCurveTo(36, -28, 30, -6);
    ctx.quadraticCurveTo(26, -22, 7, -24);
    ctx.fill();
  } else if (kind === "bolt") {
    ctx.fillStyle = "#ffd23f";
    ctx.strokeStyle = "#f4a51c";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, -50);
    ctx.lineTo(-22, 6);
    ctx.lineTo(-2, 6);
    ctx.lineTo(-12, 50);
    ctx.lineTo(24, -10);
    ctx.lineTo(4, -10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (kind === "question") {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(0, 0, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,110,90,0.35)";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.font = "bold 74px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#6b8f5a";
    ctx.fillText("?", 0, 5);
  } else if (kind === "speed") {
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    [-24, 0, 24].forEach((y, i) => {
      ctx.beginPath();
      ctx.moveTo(-44 + i * 8, y);
      ctx.lineTo(30 - i * 6, y);
      ctx.stroke();
    });
  } else if (kind === "heart") {
    ctx.fillStyle = "#ffb7c9";
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.bezierCurveTo(-52, -8, -26, -46, 0, -18);
    ctx.bezierCurveTo(26, -46, 52, -8, 0, 30);
    ctx.closePath();
    ctx.fill();
  } else if (kind.startsWith("battery")) {
    const level = Number(kind.slice(7)) || 0;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#5a4635";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.roundRect(-48, -26, 88, 52, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#5a4635";
    ctx.beginPath();
    ctx.roundRect(42, -11, 10, 22, 4);
    ctx.fill();
    ctx.fillStyle = level >= 3 ? "#7ccf6a" : level === 2 ? "#ffcc4d" : "#f2786b";
    for (let i = 0; i < level; i++) {
      ctx.beginPath();
      ctx.roundRect(-40 + i * 19.5, -18, 15, 36, 4);
      ctx.fill();
    }
  } else if (kind === "sparkle") {
    ctx.fillStyle = "#ffe9a3";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? 46 : 17;
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  } else if (kind === "drop") {
    ctx.fillStyle = "#6cc3f5";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.bezierCurveTo(26, -14, 38, 6, 38, 20);
    ctx.arc(0, 20, 38, 0, Math.PI);
    ctx.bezierCurveTo(-38, 6, -26, -14, 0, -52);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.ellipse(-14, 18, 7, 13, 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "stink") {
    ctx.strokeStyle = "#8bbf4a";
    ctx.lineWidth = 11;
    ctx.lineCap = "round";
    [-30, 0, 30].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 54);
      ctx.bezierCurveTo(x + 22, 24, x - 22, 0, x, -22);
      ctx.bezierCurveTo(x + 18, -38, x - 10, -50, x, -56);
      ctx.stroke();
    });
  } else if (kind === "bubble") {
    const g = ctx.createRadialGradient(-12, -12, 4, 0, 0, 56);
    g.addColorStop(0, "rgba(255,255,255,0.15)");
    g.addColorStop(0.75, "rgba(200,230,255,0.25)");
    g.addColorStop(1, "rgba(170,210,255,0.7)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.ellipse(-22, -22, 12, 7, -0.7, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "diaper") {
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-54, -34);
    ctx.lineTo(54, -34);
    ctx.quadraticCurveTo(58, 2, 30, 14);
    ctx.quadraticCurveTo(14, 22, 14, 44);
    ctx.lineTo(-14, 44);
    ctx.quadraticCurveTo(-14, 22, -30, 14);
    ctx.quadraticCurveTo(-58, 2, -54, -34);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#9fb7cc";
    ctx.stroke();
    ctx.fillStyle = "#a8d8f0";
    ctx.fillRect(-52, -34, 104, 12);
    ctx.fillStyle = "#ffb3c7";
    ctx.beginPath();
    ctx.roundRect(-60, -26, 16, 18, 5);
    ctx.roundRect(44, -26, 16, 18, 5);
    ctx.fill();
    ctx.fillStyle = "#ff9fb8";
    ctx.beginPath();
    ctx.moveTo(0, 10);
    ctx.bezierCurveTo(-14, 0, -10, -14, 0, -8);
    ctx.bezierCurveTo(10, -14, 14, 0, 0, 10);
    ctx.fill();
  } else if (kind === "ball") {
    ctx.fillStyle = "#ff8fa3";
    ctx.fillRect(-64, -64, 128, 128);
    ctx.fillStyle = "#ffe08a";
    ctx.fillRect(-64, -64, 128, 22);
    ctx.fillRect(-64, 20, 128, 22);
    ctx.fillStyle = "#8fd3ff";
    ctx.fillRect(-64, -21, 128, 20);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const textureCache = new Map();

export function getTexture(kind) {
  if (!textureCache.has(kind)) textureCache.set(kind, makeTexture(kind));
  return textureCache.get(kind);
}

function PandaMoodInner({ modelUrl, idleModelPath, placement, worldScale, Rig, rigProps, useRig }) {
  const useRigHook = useRig || usePandaRig;
  const rig = useRigHook(modelUrl, idleModelPath);
  const matteRef = useRef(null);
  useEffect(() => {
    if (placement && matteRef.current) makeMatte(matteRef.current);
  }, [placement]);

  if (placement) {
    const { homePosition, offset, scale, yaw = 0, lean = 0 } = placement;
    const { center, minY, k } = rig.idleNorm || rig.norm;
    const feetY = offset[1] + scale * minY;
    return (
      <group ref={matteRef} position={[homePosition[0], feetY, homePosition[1]]} rotation={[-lean, yaw, 0]}>
        <group position={[offset[0], offset[1] - feetY, offset[2]]} scale={scale}>
          <group position={[center.x, minY, center.z]} scale={1 / k}>
            <Rig rig={rig} {...rigProps} />
          </group>
        </group>
      </group>
    );
  }
  return (
    <group scale={worldScale}>
      <Rig rig={rig} {...rigProps} />
    </group>
  );
}

export function PandaMood({ modelUrl, Rig, rigProps, homePosition = [0, 0], scale = 1, referenceHeight = 1, placement, idleModelPath, useRig }) {
  const idlePath = idleModelPath || PANDA_IDLE_MODEL;
  const worldScale = (referenceHeight * scale) / LOCAL_REFERENCE_HEIGHT;
  const inner = (
    <Suspense fallback={null}>
      <PandaMoodInner modelUrl={modelUrl} idleModelPath={idlePath} placement={placement} worldScale={worldScale} Rig={Rig} rigProps={rigProps} useRig={useRig} />
    </Suspense>
  );
  if (placement) return inner;
  return <group position={[homePosition[0], 0, homePosition[1]]}>{inner}</group>;
}