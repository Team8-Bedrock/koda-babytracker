import { Suspense, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const LOCAL_REFERENCE_HEIGHT = 1.6;
const bunnyAsset = { url: "/models/characters/bunny/feeding.glb" };
// The idle model has her real round hands (the feeding model only has sleeves).
// BunnyHabitat3D records the exact idle model path; this is just the fallback.
const IDLE_MODEL_FALLBACK = "/models/characters/bunny/bunny.glb";
const IDLE_HAND_NODES = { left: 31, right: 32 };
const carrotAsset = { url: "/models/habitats/carrot.glb" };

// glTF node indices inside bunny/feeding.glb, so we can move pieces separately.
const PARTS = {
  head: [1],
  eyes: [2, 3],
  nose: [22],
  earLeft: [24, 28],
  earRight: [26, 30],
  armLeft: [5],
  armRight: [7],
  tail: [14],
};

// Points in normalized (1.6-tall) space.
const NECK = new THREE.Vector3(0, 0.66, 0);
const MOUTH = new THREE.Vector3(0, 0.715, 0.224); // just under the nose, on the face
const MOUTH_TILT = 0.76; // the face slopes back here, so the mouth faces a little downward
const BITE_POINT = new THREE.Vector3(0.022, 0.71, 0.25); // where the carrot meets the mouth
const NOSE = new THREE.Vector3(0, 0.76, 0.285);
const EAR_LEFT = new THREE.Vector3(-0.19, 1.08, 0.02);
const EAR_RIGHT = new THREE.Vector3(0.11, 1.08, 0.0);
const SHOULDER_LEFT = new THREE.Vector3(-0.11, 0.66, 0.06);
const SHOULDER_RIGHT = new THREE.Vector3(0.09, 0.65, 0.05);
const ARM_REST_LEFT = new THREE.Vector3(-0.16, -0.11, 0.04).normalize();
const ARM_REST_RIGHT = new THREE.Vector3(0.16, -0.11, 0.04).normalize();
const FLOOR = 0.015;

// The carrot hangs from the mouth down and out in front, pointy end first.
const CARROT_DIR = new THREE.Vector3(0.1, -0.95, 0.26).normalize();
const CARROT_QUAT = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), CARROT_DIR);
const CARROT_LENGTH = LOCAL_REFERENCE_HEIGHT * 0.28;
const GRIP = 0.09; // how far down the carrot the paws hold it
const PAW_SPREAD = 0.075;
const HAND_RADIUS = 0.04;
const HAND_ROUGHNESS = 0.3; // close to the model's own finish
const ARM_REACH = 0.08; // sleeves stretch a touch while holding the carrot

// One cycle = a burst of quick nibbles, then a chewy pause.
const CYCLE = 3;
const CYCLES_PER_CARROT = 6; // 5 nibbling cycles + 1 "slurp the leaves and hop" cycle
const NIBBLES = 4;
const NIBBLE_START = 0.06;
const NIBBLE_GAP = 0.09;
const CHEW_START = 0.45;
const CHEWS = 7;
const BITE_STEP = 0.12; // fraction of the carrot eaten per cycle
const EATEN_BEFORE_SLURP = BITE_STEP * (CYCLES_PER_CARROT - 1);

const smooth = (a, b, x) => {
  const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};
const easeOutBack = (k) => {
  const c = 2.2;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
};
const pulse = (a, b, x) => (x > a && x < b ? Math.sin(((x - a) / (b - a)) * Math.PI) : 0);

// Everything about "where are we in the snack" comes from the clock.
function snackState(t) {
  const k = Math.floor(t / CYCLE);
  const u = (t % CYCLE) / CYCLE;
  const n = k % CYCLES_PER_CARROT;
  const finale = n === CYCLES_PER_CARROT - 1;
  const s = { u, n, finale, nibble: 0, nibbleIndex: -1, chewing: 0, open: 0, eaten: 0, hop: 0, slurp: 0, grow: 1, puff: 0 };

  if (!finale) {
    // quick nibbles: each one nips a little bit off the tip
    let bitesDone = 0;
    for (let i = 0; i < NIBBLES; i++) {
      const at = NIBBLE_START + i * NIBBLE_GAP;
      const p = pulse(at, at + NIBBLE_GAP * 0.8, u);
      if (p > s.nibble) {
        s.nibble = p;
        s.nibbleIndex = i;
      }
      bitesDone += smooth(at + NIBBLE_GAP * 0.35, at + NIBBLE_GAP * 0.5, u);
    }
    s.eaten = (n + bitesDone / NIBBLES) * BITE_STEP;
    const chewU = (u - CHEW_START) / (1 - CHEW_START);
    s.chewing = u > CHEW_START ? 0.5 - 0.5 * Math.cos(chewU * Math.PI * 2 * CHEWS) : 0;
    s.puff = smooth(NIBBLE_START, CHEW_START, u) * (1 - smooth(0.9, 1, u));
    s.open = Math.max(s.nibble, s.chewing * 0.35);
    // a brand new carrot pops into the paws at the start
    if (n === 0) s.grow = easeOutBack(smooth(0, NIBBLE_START + 0.02, u));
  } else {
    // slurp up the rest, leaves and all, chew with big cheeks, happy hop, new carrot
    s.slurp = smooth(0, 0.3, u);
    s.eaten = THREE.MathUtils.lerp(EATEN_BEFORE_SLURP, 1.02, s.slurp);
    s.open = u < 0.3 ? 0.7 + Math.sin(u * 60) * 0.15 : 0;
    const chewU = (u - 0.3) / 0.3;
    s.chewing = u > 0.3 && u < 0.6 ? 0.5 - 0.5 * Math.cos(chewU * Math.PI * 2 * 5) : 0;
    s.open = Math.max(s.open, s.chewing * 0.3);
    s.puff = 1.8 * smooth(0.1, 0.3, u) * (1 - smooth(0.55, 0.65, u));
    s.hop = pulse(0.62, 0.84, u);
    s.happy = smooth(0.58, 0.65, u) * (1 - smooth(0.9, 1, u));
  }
  s.happy = s.happy || 0;
  return s;
}

function useBunnyRig(url, idleUrl, targetHeight) {
  const gltf = useGLTF(url);
  const idle = useGLTF(idleUrl);
  return useMemo(() => {
    const src = gltf.scene;
    const root = src.clone(true);

    // clone() keeps traversal order, so pair originals with clones to find nodes by index.
    const originals = [];
    const clones = [];
    src.traverse((o) => originals.push(o));
    root.traverse((o) => clones.push(o));
    const byNode = new Map();
    originals.forEach((o, i) => {
      const a = gltf.parser?.associations?.get(o);
      if (a && a.nodes !== undefined) byNode.set(a.nodes, clones[i]);
    });

    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    root.position.set(-center.x, -box.min.y, -center.z);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const scaled = new THREE.Group();
    scaled.add(root);
    const k = targetHeight / (size.y || 1);
    scaled.scale.setScalar(k);
    // how to undo the normalization (used when drawn in the habitat in the idle bunny's place)
    const norm = { center: center.clone(), minY: box.min.y, k };

    // Bring her real hands over from the idle model. Both models share the same
    // coordinates, so the hands land right at the ends of her sleeves.
    const idleNodes = new Map();
    idle.scene.updateMatrixWorld(true);
    idle.scene.traverse((o) => {
      const a = idle.parser?.associations?.get(o);
      if (a && a.nodes !== undefined) idleNodes.set(a.nodes, o);
    });
    const idleHand = (id) => {
      const src = idleNodes.get(id);
      if (!src) return null;
      const h = src.clone(true);
      src.matrixWorld.decompose(h.position, h.quaternion, h.scale);
      h.traverse((o) => {
        if (o.isMesh) o.castShadow = true;
      });
      root.add(h);
      return h;
    };
    const idleHandLeft = idleHand(IDLE_HAND_NODES.left);
    const idleHandRight = idleHand(IDLE_HAND_NODES.right);

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
    const take = (group, ids) =>
      ids.forEach((id) => {
        const o = byNode.get(id);
        if (o) group.attach(o);
      });
    const centerOf = (id) => {
      const o = byNode.get(id);
      return o ? new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()) : null;
    };
    const ownPivot = (parent, id) => {
      const c = centerOf(id);
      if (!c) return null;
      const p = pivot(parent, c);
      p.attach(byNode.get(id));
      return p;
    };

    const head = pivot(rig, NECK);
    take(head, PARTS.head);
    const headBase = head.position.clone();
    const eyes = PARTS.eyes.map((id) => ownPivot(head, id)).filter(Boolean);

    const nose = pivot(head, NOSE);
    take(nose, PARTS.nose);

    const earLeft = pivot(head, EAR_LEFT);
    take(earLeft, PARTS.earLeft);
    const earRight = pivot(head, EAR_RIGHT);
    take(earRight, PARTS.earRight);

    // A little mouth with two buck teeth, so you can see every nibble.
    const mouth = pivot(head, MOUTH);
    mouth.rotation.x = MOUTH_TILT;
    const mouthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshStandardMaterial({ color: "#7a3448", roughness: 0.6 }),
    );
    mouth.add(mouthMesh);
    const toothMat = new THREE.MeshStandardMaterial({ color: "#fffaf2", roughness: 0.5 });
    const teeth = new THREE.Group();
    [-1, 1].forEach((side) => {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.013, 0.005), toothMat);
      tooth.position.set(side * 0.006, -0.0065, 0.009);
      teeth.add(tooth);
    });
    mouth.add(teeth);

    const armLeft = pivot(rig, SHOULDER_LEFT);
    take(armLeft, PARTS.armLeft);
    const armRight = pivot(rig, SHOULDER_RIGHT);
    take(armRight, PARTS.armRight);

    // Fallback if the idle model's hands can't be found: round hands at the cuffs.
    const furMat = new THREE.MeshStandardMaterial({ color: "#fdfbfd", roughness: HAND_ROUGHNESS });
    const handFor = (arm, ids, shoulder) => {
      // the cuff is the ring of sleeve vertices farthest from the shoulder
      const verts = [];
      const v = new THREE.Vector3();
      ids.forEach((id) =>
        byNode.get(id)?.traverse((m) => {
          if (!m.isMesh) return;
          m.updateMatrixWorld(true);
          const pos = m.geometry.attributes.position;
          const step = Math.max(1, Math.floor(pos.count / 4000));
          for (let i = 0; i < pos.count; i += step) verts.push(v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).clone());
        }),
      );
      if (!verts.length) return null;
      const far = Math.max(...verts.map((p) => p.distanceTo(shoulder)));
      const ring = verts.filter((p) => p.distanceTo(shoulder) > far * 0.9);
      const cuff = ring.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(ring.length);
      const out = cuff.clone().sub(shoulder).normalize();
      const hand = pivot(arm, cuff.addScaledVector(out, HAND_RADIUS * 0.55));
      const ball = new THREE.Mesh(new THREE.SphereGeometry(HAND_RADIUS, 20, 16), furMat);
      ball.castShadow = true;
      hand.add(ball);
      return hand;
    };
    const attachHand = (arm, idleH, ids, shoulder) => {
      if (idleH) {
        arm.attach(idleH);
        return idleH;
      }
      return handFor(arm, ids, shoulder);
    };
    const handLeft = attachHand(armLeft, idleHandLeft, PARTS.armLeft, SHOULDER_LEFT);
    const handRight = attachHand(armRight, idleHandRight, PARTS.armRight, SHOULDER_RIGHT);

    const tail = ownPivot(rig, PARTS.tail[0]);
    const tailBase = tail ? tail.position.clone() : null;

    return { rig, head, headBase, eyes, nose, noseBaseY: nose.position.y, earLeft, earRight, mouth: mouthMesh, teeth, armLeft, armRight, handLeft, handRight, tail, tailBase, norm };
  }, [gltf, idle, targetHeight]);
}

// Loads the carrot, stands it up pointy-end-down whatever way it was modelled,
// and works out how thick it is along its length (for the bitten-end cap).
function useCarrot(url, length) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const root = scene.clone(true);
    root.updateMatrixWorld(true);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      const clip = (m) => {
        const c = m.clone();
        c.clippingPlanes = [plane];
        c.clipShadows = true;
        c.side = THREE.DoubleSide;
        return c;
      };
      o.material = Array.isArray(o.material) ? o.material.map(clip) : clip(o.material);
    });

    // Gather a sample of vertex positions, remembering which ones are green (leaves).
    const pts = [];
    const v = new THREE.Vector3();
    const col = new THREE.Color();
    const isGreen = (c) => c.g > c.r * 1.1 && c.g > c.b;
    root.traverse((o) => {
      if (!o.isMesh) return;
      const pos = o.geometry.attributes.position;
      const vc = o.geometry.attributes.color;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      const step = Math.max(1, Math.floor(pos.count / 3000));
      for (let i = 0; i < pos.count; i += step) {
        const p = v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld).clone();
        if (vc) col.setRGB(vc.getX(i), vc.getY(i), vc.getZ(i));
        else col.copy(mat.color || col.setRGB(1, 1, 1));
        if (!vc && mat.map) col.setRGB(1, 1, 1); // textured: can't tell, fall back to shape
        p.green = isGreen(col);
        pts.push(p);
      }
    });

    // Point the longest side up.
    const box = new THREE.Box3().setFromPoints(pts);
    const size = box.getSize(new THREE.Vector3());
    const orient = new THREE.Quaternion();
    if (size.x >= size.y && size.x >= size.z) orient.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    else if (size.z >= size.y && size.z >= size.x) orient.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    pts.forEach((p) => p.applyQuaternion(orient));

    const BINS = 24;
    const profile = (points) => {
      const b = new THREE.Box3().setFromPoints(points);
      const cx = (b.min.x + b.max.x) / 2;
      const cz = (b.min.z + b.max.z) / 2;
      const r = new Array(BINS).fill(0);
      const h = b.max.y - b.min.y || 1;
      points.forEach((p) => {
        const i = Math.min(BINS - 1, Math.floor(((p.y - b.min.y) / h) * BINS));
        r[i] = Math.max(r[i], Math.hypot(p.x - cx, p.z - cz));
      });
      return { r, b, cx, cz, h };
    };

    // Pointy end goes at the bottom (y = 0).
    let prof = profile(pts);
    const midY = (prof.b.min.y + prof.b.max.y) / 2;
    const greens = pts.filter((p) => p.green);
    let tipIsHigh;
    if (greens.length > 20 && greens.length < pts.length * 0.9) {
      // leaves are green, so the tip is the other end
      tipIsHigh = greens.reduce((a, p) => a + p.y, 0) / greens.length < midY;
    } else {
      // no colour clue: a carrot is widest near the leaves, so the tip is the far end
      const widest = prof.r.indexOf(Math.max(...prof.r));
      tipIsHigh = widest < BINS / 2;
    }
    if (tipIsHigh) {
      const flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
      orient.premultiply(flip);
      pts.forEach((p) => p.applyQuaternion(flip));
      prof = profile(pts);
    }

    // Centre on the root half of the carrot (leaves can be lopsided).
    const lower = pts.filter((p) => p.y < prof.b.min.y + prof.h * 0.5);
    const lowBox = new THREE.Box3().setFromPoints(lower.length ? lower : pts);
    const cx = (lowBox.min.x + lowBox.max.x) / 2;
    const cz = (lowBox.min.z + lowBox.max.z) / 2;
    const s = length / prof.h;

    const inner = new THREE.Group();
    inner.quaternion.copy(orient);
    inner.add(root);
    const placed = new THREE.Group();
    placed.add(inner);
    placed.position.set(-cx * s, -prof.b.min.y * s, -cz * s);
    placed.scale.setScalar(s);
    const carrot = new THREE.Group();
    carrot.add(placed);

    const radii = prof.r.map((r) => r * s);
    const radiusAt = (y) => {
      const f = THREE.MathUtils.clamp((y / length) * BINS - 0.5, 0, BINS - 1);
      const i = Math.floor(f);
      const j = Math.min(BINS - 1, i + 1);
      return THREE.MathUtils.lerp(radii[i], radii[j], f - i);
    };

    // The freshly bitten end: orange rim, paler core.
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    g.addColorStop(0, "#ffe2a8");
    g.addColorStop(0.45, "#ffc36e");
    g.addColorStop(0.75, "#ff9f45");
    g.addColorStop(1, "#ee7d2c");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.fill();
    const capTex = new THREE.CanvasTexture(c);
    capTex.colorSpace = THREE.SRGBColorSpace;
    const cap = new THREE.Mesh(
      new THREE.CircleGeometry(1, 20),
      new THREE.MeshStandardMaterial({ map: capTex, roughness: 0.7, side: THREE.DoubleSide }),
    );
    cap.rotation.x = Math.PI / 2; // facing down the carrot, toward the mouth

    return { carrot, plane, cap, radiusAt };
  }, [scene, length]);
}

function makeBubbleTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 256, 256);
  const g = ctx.createRadialGradient(128, 128, 40, 128, 128, 120);
  g.addColorStop(0, "rgba(255,255,255,0.08)");
  g.addColorStop(0.85, "rgba(190,225,255,0.18)");
  g.addColorStop(1, "rgba(255,255,255,0.55)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(92, 82, 22, 13, -0.6, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function Bubbles() {
  const texture = useMemo(() => makeBubbleTexture(), []);
  const refs = useRef([]);
  const seeds = useMemo(() => [0, 0.9, 1.8, 2.7], []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((sprite, i) => {
      if (!sprite) return;
      const life = ((t + seeds[i]) % 4.2) / 4.2;
      const fade = Math.sin(life * Math.PI);
      sprite.position.y = 0.02 + life * 0.4;
      sprite.position.x = Math.sin((t + seeds[i]) * 1.4 + i) * 0.18;
      sprite.position.z = Math.cos((t + seeds[i]) * 1.0 + i) * 0.08;
      sprite.material.opacity = THREE.MathUtils.lerp(sprite.material.opacity, fade * 0.8, 0.15);
      sprite.scale.setScalar((0.06 + life * 0.07) * (1 + (i % 2) * 0.35));
    });
  });

  return (
    <group>
      {seeds.map((_, i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)}>
          <spriteMaterial map={texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

function makeSymbolTexture(kind) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.translate(64, 64);

  if (kind === "carrot") {
    ctx.rotate(0.5);
    ctx.fillStyle = "#6cc35a";
    [-0.5, 0, 0.5].forEach((a) => {
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.ellipse(0, -40, 7, 16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    const g = ctx.createLinearGradient(-18, 0, 18, 0);
    g.addColorStop(0, "#ffa04a");
    g.addColorStop(1, "#ef7a28");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-18, -26);
    ctx.quadraticCurveTo(0, -34, 18, -26);
    ctx.lineTo(2, 44);
    ctx.quadraticCurveTo(0, 48, -2, 44);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(190,90,20,0.6)";
    ctx.lineWidth = 3;
    [-8, 6, 20].forEach((y) => {
      ctx.beginPath();
      ctx.moveTo(-10 + y * 0.2, y);
      ctx.lineTo(0, y + 3);
      ctx.stroke();
    });
  } else if (kind === "sparkle") {
    ctx.fillStyle = "#ffe9a3";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? 46 : 17;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = "#ffb7c9";
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.bezierCurveTo(-52, -8, -26, -46, 0, -18);
    ctx.bezierCurveTo(26, -46, 52, -8, 0, 30);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const SYMBOL_COUNT = 9;

function FloatSymbols() {
  const textures = useMemo(() => ["carrot", "sparkle", "heart"].map(makeSymbolTexture), []);
  const refs = useRef([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: SYMBOL_COUNT }, (_, i) => ({
        angle0: (i / SYMBOL_COUNT) * Math.PI * 2,
        radius: 0.38 + ((i * 13) % 10) / 70,
        yBase: 1.0 + ((i * 29) % 10) / 22,
        speed: 0.5 + ((i * 7) % 10) / 22,
        bob: 0.05 + ((i * 19) % 10) / 170,
        phase: (i / SYMBOL_COUNT) * 3.1,
        kind: i % 3,
        size: 0.07 + ((i * 23) % 10) / 250,
      })),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { happy } = snackState(t);
    refs.current.forEach((s, i) => {
      if (!s) return;
      const seed = seeds[i];
      const life = ((t * seed.speed + seed.phase) % 3.4) / 3.4;
      const fade = Math.sin(life * Math.PI);
      const boost = seed.kind === 2 ? happy * 0.5 : 0; // extra hearts during the happy hop
      const a = seed.angle0 + t * 0.25;
      s.position.set(
        Math.cos(a) * seed.radius,
        seed.yBase + Math.sin(life * Math.PI * 2) * seed.bob + life * 0.1,
        Math.sin(a) * seed.radius * 0.55,
      );
      s.material.opacity = THREE.MathUtils.lerp(s.material.opacity, fade * 0.9, 0.12);
      s.material.rotation = Math.sin(t * 1.2 + i) * 0.25;
      s.scale.setScalar(seed.size * (0.8 + fade * 0.4 + boost));
    });
  });

  return (
    <group>
      {seeds.map((seed, i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)}>
          <spriteMaterial map={textures[seed.kind]} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

// Little orange crumbs that spray off each nibble and land on the floor.
const CRUMBS_PER_NIBBLE = 3;
const GRAVITY = -3.2;

function NibbleCrumbs() {
  const refs = useRef([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: NIBBLES * CRUMBS_PER_NIBBLE }, (_, i) => {
        const nib = Math.floor(i / CRUMBS_PER_NIBBLE);
        const a = ((i * 2.4) % (Math.PI * 1.4)) - 0.2;
        return {
          at: (NIBBLE_START + nib * NIBBLE_GAP + NIBBLE_GAP * 0.42) * CYCLE,
          vx: Math.cos(a) * (0.18 + ((i * 37) % 10) / 40),
          vy: 0.25 + ((i * 53) % 10) / 22,
          vz: 0.2 + ((i * 29) % 10) / 30,
          size: 0.007 + ((i * 17) % 10) / 1000,
          spin: 4 + ((i * 11) % 5) * 1.5,
        };
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const cycleStart = Math.floor(t / CYCLE) * CYCLE;
    const n = Math.floor(t / CYCLE) % CYCLES_PER_CARROT;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const s = seeds[i];
      const tb = t - cycleStart - s.at;
      const y0 = BITE_POINT.y - 0.02;
      const land = (s.vy + Math.sqrt(s.vy * s.vy - 2 * GRAVITY * (y0 - FLOOR))) / -GRAVITY;
      const tt = Math.max(0, Math.min(tb, land));
      m.position.set(
        BITE_POINT.x + s.vx * tt * 0.6,
        Math.max(FLOOR, y0 + s.vy * tt + 0.5 * GRAVITY * tt * tt),
        BITE_POINT.z + 0.02 + s.vz * tt * 0.6,
      );
      if (tb < land) m.rotation.set(tb * s.spin + i, tb * s.spin * 0.7, i);
      const fade = 1 - smooth(CYCLE - s.at - 0.6, CYCLE - s.at - 0.05, tb);
      m.scale.setScalar(s.size * fade);
      m.visible = tb > 0 && fade > 0.01 && n !== CYCLES_PER_CARROT - 1;
    });
  });

  return (
    <group>
      {seeds.map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 3 === 0 ? "#ffc070" : "#f08a3a"} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

// Same matte finish the rest of the app uses (no glossy highlights).
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

function FeedingBunnyRig({ worldScale, idleModelPath, placement }) {
  const bunny = useBunnyRig(bunnyAsset.url, idleModelPath, LOCAL_REFERENCE_HEIGHT);
  const carrot = useCarrot(carrotAsset.url, CARROT_LENGTH);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.localClippingEnabled = true; // lets bites actually remove the carrot tip
  }, [gl]);

  const bodyRef = useRef(null);
  const matteRef = useRef(null);
  useEffect(() => {
    if (placement && matteRef.current) makeMatte(matteRef.current);
  }, [placement]);
  const carrotRef = useRef(null);
  const capRef = useRef(null);
  const symbolsRef = useRef(null);

  const tmp = useMemo(
    () => ({
      q: new THREE.Quaternion(),
      v: new THREE.Vector3(),
      n: new THREE.Vector3(),
      p: new THREE.Vector3(),
      mouth: new THREE.Vector3(),
      grip: new THREE.Vector3(),
      nm: new THREE.Matrix3(),
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = snackState(t);
    const breathe = Math.sin(t * 1.6) * 0.015;

    // Body: little bounce on each chew, a big happy hop after finishing a carrot.
    if (bodyRef.current) {
      const sq = s.chewing * 0.03 + s.nibble * 0.02;
      const crouch = pulse(0.56, 0.63, s.u) * (s.finale ? 1 : 0) + pulse(0.83, 0.9, s.u) * (s.finale ? 1 : 0);
      bodyRef.current.scale.set(
        1 + sq + breathe * 0.5 + crouch * 0.06 - s.hop * 0.04,
        1 - sq * 1.2 + breathe - crouch * 0.08 + s.hop * 0.08,
        1 + sq + breathe * 0.5 + crouch * 0.06 - s.hop * 0.04,
      );
      bodyRef.current.position.y = -sq * 0.4 + s.hop * 0.16;
      bodyRef.current.rotation.z = Math.sin(t * 1.3) * 0.02;
      bodyRef.current.rotation.y = Math.sin(t * 0.5) * 0.1 + s.hop * Math.sin(s.u * 40) * 0.08;
    }

    // Head: pecks forward on each nibble, bobs while chewing.
    const head = bunny.head;
    const lunge = s.nibble * 0.018;
    head.position.copy(bunny.headBase);
    head.position.z += lunge;
    head.rotation.x = s.nibble * 0.07 + s.chewing * 0.025 - s.hop * 0.08;
    head.rotation.z = Math.sin(t * 1.1) * 0.03 + Math.sin(t * 2.6) * 0.03 * s.happy;
    const puff = s.chewing * 0.03 + s.puff * 0.02;
    head.scale.set(1 + puff, 1 - puff * 0.4, 1 + puff * 0.4);

    // Mouth + buck teeth.
    const open = s.open;
    bunny.mouth.scale.set(0.026 + open * 0.006, 0.004 + open * 0.022, 0.01);
    bunny.teeth.position.y = open * 0.01;
    bunny.teeth.scale.setScalar(0.9 + open * 0.2);

    // Bunny nose: always twitching, extra fast while eating.
    const twitchSpeed = 16 + s.chewing * 10;
    bunny.nose.position.y = bunny.noseBaseY + Math.sin(t * twitchSpeed) * 0.004 - s.chewing * 0.005;
    bunny.nose.scale.set(1 + Math.sin(t * twitchSpeed) * 0.12, 1, 1);

    // Happy squint on nibbles.
    bunny.eyes.forEach((eye) => eye.scale.set(1, 1 - s.nibble * 0.35 - s.chewing * 0.1 - s.happy * 0.2, 1));

    // Long ears: flop out with the chews (taking turns), swing back on the hop.
    const earSway = Math.sin(t * 2.2) * 0.04;
    const chewFlop = Math.sin(t * 9) * s.chewing;
    bunny.earLeft.rotation.z = 0.05 + earSway + Math.max(0, chewFlop) * 0.12 + s.nibble * 0.06 + s.happy * Math.sin(t * 6) * 0.12;
    bunny.earRight.rotation.z = -0.05 + earSway - Math.max(0, -chewFlop) * 0.12 - s.nibble * 0.06 + s.happy * Math.sin(t * 6 + 1) * 0.12;
    const earLag = -s.hop * 0.35 + pulse(0.84, 0.95, s.u) * (s.finale ? 0.25 : 0);
    bunny.earLeft.rotation.x = earLag;
    bunny.earRight.rotation.x = earLag;

    // Fluffy tail wiggles.
    if (bunny.tail) {
      const wig = s.chewing * 0.6 + s.happy + 0.15;
      bunny.tail.position.copy(bunny.tailBase);
      bunny.tail.position.x += Math.sin(t * 14) * 0.012 * wig;
      bunny.tail.scale.setScalar(1 + Math.abs(Math.sin(t * 7)) * 0.08 * wig);
    }

    // Where the mouth is right now (follows the head).
    tmp.mouth.copy(BITE_POINT).sub(NECK).applyEuler(head.rotation).add(NECK);
    tmp.mouth.z += lunge;

    // Carrot: slides up through the paws so the bitten end is always at the mouth.
    const eatenLen = s.eaten * CARROT_LENGTH;
    const away = 0.03 * (1 - s.nibble) * (1 - s.slurp) - s.nibble * 0.004 + (s.chewing > 0 ? 0.015 : 0) * (1 - s.slurp);
    if (carrotRef.current) {
      const c = carrotRef.current;
      c.visible = s.eaten < 1;
      c.quaternion.copy(CARROT_QUAT);
      c.position.copy(tmp.mouth).addScaledVector(CARROT_DIR, away - eatenLen);
      c.scale.setScalar(Math.max(0.001, s.grow));

      // Clip away everything that's been eaten (world-space plane).
      c.updateWorldMatrix(true, false);
      tmp.p.set(0, eatenLen, 0).applyMatrix4(c.matrixWorld);
      tmp.n.set(0, 1, 0).applyMatrix3(tmp.nm.getNormalMatrix(c.matrixWorld)).normalize();
      carrot.plane.setFromNormalAndCoplanarPoint(tmp.n, tmp.p);

      if (capRef.current) {
        const r = carrot.radiusAt(eatenLen) * 0.96;
        capRef.current.visible = eatenLen > 0.002 && r > 0.002 && s.eaten < 0.98;
        capRef.current.position.set(0, eatenLen + 0.0005, 0);
        capRef.current.scale.setScalar(Math.max(r, 0.0001));
      }
    }

    // Arms reach for the carrot; paws hold it just under the mouth.
    const holding = 1 - smooth(0.25, 0.35, s.finale ? s.u : 0) + (s.finale ? smooth(0.86, 1, s.u) : 0);
    const arms = [
      [bunny.armLeft, SHOULDER_LEFT, ARM_REST_LEFT, -1],
      [bunny.armRight, SHOULDER_RIGHT, ARM_REST_RIGHT, 1],
    ];
    arms.forEach(([arm, shoulder, rest, side]) => {
      tmp.grip.copy(BITE_POINT).addScaledVector(CARROT_DIR, GRIP + away);
      tmp.grip.x += side * PAW_SPREAD;
      tmp.v.copy(tmp.grip).sub(shoulder).normalize();
      tmp.q.setFromUnitVectors(rest, tmp.v);
      // during the happy hop, paws go up in a little cheer
      arm.quaternion.identity().slerp(tmp.q, 0.9 * THREE.MathUtils.clamp(holding, 0, 1));
      arm.rotation.z += side * s.happy * (0.5 + Math.sin(t * 10) * 0.15);
      arm.scale.setScalar(1 + ARM_REACH * THREE.MathUtils.clamp(holding, 0, 1));
    });

    if (symbolsRef.current) {
      symbolsRef.current.position.y = 1.25 + Math.sin(t * 1.4) * 0.03;
    }
  });

  const content = (
    <>
      <group ref={bodyRef}>
        <primitive object={bunny.rig} />
        <group ref={symbolsRef}>
          <Bubbles />
        </group>
        <FloatSymbols />
        <group ref={carrotRef}>
          <primitive object={carrot.carrot} />
          <group ref={capRef}>
            <primitive object={carrot.cap} />
          </group>
        </group>
      </group>
      <NibbleCrumbs />
    </>
  );

  if (placement) {
    // Drawn inside the habitat, standing exactly where IdleBunny stands:
    // same home spot, grounding offset, model scale and facing.
    const { homePosition, offset, scale, yaw = 0, lean = 0 } = placement;
    const { center, minY, k } = bunny.norm;
    // lean pivots at her feet: the idle bunny's feet are at offset[1] + scale * (model's lowest point)
    const feetY = offset[1] + scale * minY;
    return (
      <group ref={matteRef} position={[homePosition[0], feetY, homePosition[1]]} rotation={[-lean, yaw, 0]}>
        <group position={[offset[0], offset[1] - feetY, offset[2]]} scale={scale}>
          {/* undo our own normalization so everything lines up with the raw model */}
          <group position={[center.x, minY, center.z]} scale={1 / k}>
            {content}
          </group>
        </group>
      </group>
    );
  }

  return <group scale={worldScale}>{content}</group>;
}

// BunnyHabitat3D's IdleBunny records which model it uses, so we can borrow its hands.
const idleModelPathFromHabitat = () =>
  (typeof window !== "undefined" && window.__idlePlacement?.bunny?.modelPath) || IDLE_MODEL_FALLBACK;

// placement: pass IdleBunny's { homePosition, offset, scale, yaw } to draw her in the habitat
// in the idle bunny's exact spot. Without it she's drawn centred at referenceHeight (MoodBuddy cards).
export default function FeedingBunny({ homePosition = [0, 0], scale = 1, referenceHeight = 1, placement, idleModelPath: idlePathProp }) {
  const idleModelPath = useMemo(() => idlePathProp || idleModelPathFromHabitat(), [idlePathProp]);
  const worldScale = (referenceHeight * scale) / LOCAL_REFERENCE_HEIGHT;
  if (placement) {
    return (
      <Suspense fallback={null}>
        <FeedingBunnyRig placement={placement} idleModelPath={idleModelPath} />
      </Suspense>
    );
  }
  return (
    <group position={[homePosition[0], 0, homePosition[1]]}>
      <Suspense fallback={null}>
        <FeedingBunnyRig worldScale={worldScale} idleModelPath={idleModelPath} />
      </Suspense>
    </group>
  );
}

useGLTF.preload(bunnyAsset.url);
useGLTF.preload(carrotAsset.url);