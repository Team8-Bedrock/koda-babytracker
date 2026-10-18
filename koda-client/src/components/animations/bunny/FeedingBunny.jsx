import { Suspense, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useBunnyRig, useBunnyLife, BUNNY_IDLE_MODEL } from "./bunnyRig";

const LOCAL_REFERENCE_HEIGHT = 1.6;
const IDLE_MODEL_FALLBACK = BUNNY_IDLE_MODEL;
const carrotAsset = { url: "/models/habitats/carrot.glb" };

const NECK = new THREE.Vector3();
const MOUTH = new THREE.Vector3();
const BITE_POINT = new THREE.Vector3();
const BITE_SHIFT = new THREE.Vector3(0.02, -0.01, 0.035);
const NOSE = new THREE.Vector3();
const SHOULDER_LEFT = new THREE.Vector3();
const SHOULDER_RIGHT = new THREE.Vector3();
const ARM_REST_LEFT = new THREE.Vector3();
const ARM_REST_RIGHT = new THREE.Vector3();
const FLOOR = 0.015;
const EAR_SWING = 1.4;

const CARROT_DIR = new THREE.Vector3(0.1, -0.95, 0.26).normalize();
const CARROT_QUAT = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), CARROT_DIR);
const CARROT_LENGTH = LOCAL_REFERENCE_HEIGHT * 0.28;
const GRIP = 0.16;
const PAW_SPREAD = 0.06;
const MAX_REACH = 1.4;

const CYCLE = 3;
const CYCLES_PER_CARROT = 6;
const NIBBLES = 4;
const NIBBLE_START = 0.06;
const NIBBLE_GAP = 0.09;
const CHEW_START = 0.45;
const CHEWS = 7;
const BITE_STEP = 0.12;
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

function snackState(t) {
  const k = Math.floor(t / CYCLE);
  const u = (t % CYCLE) / CYCLE;
  const n = k % CYCLES_PER_CARROT;
  const finale = n === CYCLES_PER_CARROT - 1;
  const s = { u, n, finale, nibble: 0, nibbleIndex: -1, chewing: 0, open: 0, eaten: 0, hop: 0, slurp: 0, grow: 1, puff: 0 };

  if (!finale) {
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
    if (n === 0) s.grow = easeOutBack(smooth(0, NIBBLE_START + 0.02, u));
  } else {
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

function useFeedingRig(idleModelPath) {
  const rig = useBunnyRig(BUNNY_IDLE_MODEL, idleModelPath);
  return useMemo(() => {
    NECK.copy(rig.headBase);
    MOUTH.copy(rig.headBase).add(rig.mouthOffset);
    NOSE.copy(rig.headBase).add(rig.noseOffset);
    BITE_POINT.copy(MOUTH).add(BITE_SHIFT);
    SHOULDER_LEFT.copy(rig.shoulderLeft);
    SHOULDER_RIGHT.copy(rig.shoulderRight);
    ARM_REST_LEFT.copy(rig.restLeft);
    ARM_REST_RIGHT.copy(rig.restRight);

    const mount = rig.mouthShape.parent;
    const toothMat = new THREE.MeshStandardMaterial({ color: "#fffaf2", roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -4 });
    const teeth = new THREE.Group();
    [-1, 1].forEach((side) => {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.013, 0.004), toothMat);
      tooth.position.set(side * 0.0065, -0.007, 0.006);
      teeth.add(tooth);
    });
    mount.add(teeth);
    rig.mouthShape.visible = true;

    return {
      rig: rig.rig,
      head: rig.head,
      headBase: rig.headBase,
      eyes: [...rig.eyeLeft.inner, ...rig.eyeRight.inner],
      nose: rig.nose,
      noseBaseY: rig.nose.position.y,
      earLeft: rig.earLeft,
      earRight: rig.earRight,
      source: rig,
      mouthShape: rig.mouthShape,
      teeth,
      armLeft: rig.armLeft,
      armRight: rig.armRight,
      armLengthLeft: rig.armLengthLeft || 0.2,
      armLengthRight: rig.armLengthRight || 0.2,
      tail: rig.bow,
      tailBase: rig.bow.position.clone(),
      norm: rig.norm,
    };
  }, [rig]);
}

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
        if (!vc && mat.map) col.setRGB(1, 1, 1);
        p.green = isGreen(col);
        pts.push(p);
      }
    });

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

    let prof = profile(pts);
    const midY = (prof.b.min.y + prof.b.max.y) / 2;
    const greens = pts.filter((p) => p.green);
    let tipIsHigh;
    if (greens.length > 20 && greens.length < pts.length * 0.9) {
      tipIsHigh = greens.reduce((a, p) => a + p.y, 0) / greens.length < midY;
    } else {
      const widest = prof.r.indexOf(Math.max(...prof.r));
      tipIsHigh = widest < BINS / 2;
    }
    if (tipIsHigh) {
      const flip = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
      orient.premultiply(flip);
      pts.forEach((p) => p.applyQuaternion(flip));
      prof = profile(pts);
    }

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
    cap.rotation.x = Math.PI / 2;

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
      sprite.position.x = (i % 2 ? 1 : -1) * (0.52 + Math.sin((t + seeds[i]) * 1.4 + i) * 0.08);
      sprite.position.z = 0.12 + Math.cos((t + seeds[i]) * 1.0 + i) * 0.08;
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
        radius: 0.62 + ((i * 13) % 10) / 70,
        yBase: 1.15 + ((i * 29) % 10) / 22,
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
      const boost = seed.kind === 2 ? happy * 0.5 : 0;
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
  const bunny = useFeedingRig(idleModelPath);
  const carrot = useCarrot(carrotAsset.url, CARROT_LENGTH);
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.localClippingEnabled = true;
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

    const head = bunny.head;
    const lunge = s.nibble * 0.018;
    head.position.copy(bunny.headBase);
    head.position.z += lunge;
    head.rotation.x = s.nibble * 0.07 + s.chewing * 0.025 - s.hop * 0.08;
    head.rotation.z = Math.sin(t * 1.1) * 0.03 + Math.sin(t * 2.6) * 0.03 * s.happy;
    const puff = s.chewing * 0.03 + s.puff * 0.02;
    head.scale.set(1 + puff, 1 - puff * 0.4, 1 + puff * 0.4);

    const open = s.open;
    bunny.mouthShape.scale.set((0.026 + open * 0.006) * 1.1, (0.004 + open * 0.022) * 2.2, 1);
    bunny.teeth.visible = open > 0.15;
    bunny.teeth.position.y = -open * 0.004;
    bunny.teeth.scale.setScalar(0.9 + open * 0.2);

    const twitchSpeed = 16 + s.chewing * 10;
    bunny.nose.position.y = bunny.noseBaseY + Math.sin(t * twitchSpeed) * 0.004 - s.chewing * 0.005;
    bunny.nose.scale.set(1 + Math.sin(t * twitchSpeed) * 0.12, 1, 1);

    bunny.eyes.forEach((eye) => eye.scale.set(1, 1 - s.nibble * 0.35 - s.chewing * 0.1 - s.happy * 0.2, 1));

    const earSway = Math.sin(t * 2.2) * 0.04;
    const chewFlop = Math.sin(t * 9) * s.chewing;
    bunny.earLeft.rotation.z = (0.05 + earSway + Math.max(0, chewFlop) * 0.12 + s.nibble * 0.06 + s.happy * Math.sin(t * 6) * 0.12) * EAR_SWING;
    bunny.earRight.rotation.z = (-0.05 + earSway - Math.max(0, -chewFlop) * 0.12 - s.nibble * 0.06 + s.happy * Math.sin(t * 6 + 1) * 0.12) * EAR_SWING;
    const earLag = (-s.hop * 0.35 + pulse(0.84, 0.95, s.u) * (s.finale ? 0.25 : 0)) * EAR_SWING;
    bunny.earLeft.rotation.x = earLag;
    bunny.earRight.rotation.x = earLag;

    if (bunny.tail) {
      const wig = s.chewing * 0.6 + s.happy + 0.15;
      bunny.tail.position.copy(bunny.tailBase);
      bunny.tail.position.x += Math.sin(t * 14) * 0.012 * wig;
      bunny.tail.scale.setScalar(1 + Math.abs(Math.sin(t * 7)) * 0.08 * wig);
    }

    tmp.mouth.copy(BITE_POINT).sub(NECK).applyEuler(head.rotation).add(NECK);
    tmp.mouth.z += lunge;

    const eatenLen = s.eaten * CARROT_LENGTH;
    const away = 0.03 * (1 - s.nibble) * (1 - s.slurp) - s.nibble * 0.004 + (s.chewing > 0 ? 0.015 : 0) * (1 - s.slurp);
    if (carrotRef.current) {
      const c = carrotRef.current;
      c.visible = s.eaten < 1;
      c.quaternion.copy(CARROT_QUAT);
      c.position.copy(tmp.mouth).addScaledVector(CARROT_DIR, away - eatenLen);
      c.scale.setScalar(Math.max(0.001, s.grow));

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

    const holding = THREE.MathUtils.clamp(1 - smooth(0.25, 0.35, s.finale ? s.u : 0) + (s.finale ? smooth(0.86, 1, s.u) : 0), 0, 1);
    const arms = [
      [bunny.armLeft, SHOULDER_LEFT, ARM_REST_LEFT, -1, bunny.armLengthLeft],
      [bunny.armRight, SHOULDER_RIGHT, ARM_REST_RIGHT, 1, bunny.armLengthRight],
    ];
    arms.forEach(([arm, shoulder, rest, side, length]) => {
      tmp.grip.copy(tmp.mouth).addScaledVector(CARROT_DIR, GRIP + away - eatenLen * 0.15);
      tmp.grip.x += side * PAW_SPREAD;
      tmp.v.copy(tmp.grip).sub(shoulder);
      const reach = THREE.MathUtils.clamp(tmp.v.length() / length, 1, MAX_REACH);
      tmp.v.normalize();
      tmp.q.setFromUnitVectors(rest, tmp.v);
      arm.quaternion.identity().slerp(tmp.q, 0.9 * holding);
      arm.rotation.z += side * s.happy * (0.5 + Math.sin(t * 10) * 0.15);
      arm.scale.setScalar(1 + (reach - 1) * holding);
    });

    if (symbolsRef.current) {
      symbolsRef.current.position.y = 1.25 + Math.sin(t * 1.4) * 0.03;
    }
  });

  useBunnyLife(bunny.source);

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
    const { homePosition, offset, scale, yaw = 0, lean = 0 } = placement;
    const { center, minY, k } = bunny.norm;
    const feetY = offset[1] + scale * minY;
    return (
      <group ref={matteRef} position={[homePosition[0], feetY, homePosition[1]]} rotation={[-lean, yaw, 0]}>
        <group position={[offset[0], offset[1] - feetY, offset[2]]} scale={scale}>
          <group position={[center.x, minY, center.z]} scale={1 / k}>
            {content}
          </group>
        </group>
      </group>
    );
  }

  return <group scale={worldScale}>{content}</group>;
}

const idleModelPathFromHabitat = () =>
  (typeof window !== "undefined" && window.__idlePlacement?.bunny?.modelPath) || IDLE_MODEL_FALLBACK;

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

useGLTF.preload(BUNNY_IDLE_MODEL);
useGLTF.preload(carrotAsset.url);