import { Suspense, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LOCAL_REFERENCE_HEIGHT = 1.6;
const koalaAsset = { url: "/models/characters/koala/feeding.glb" };
const IDLE_MODEL_FALLBACK = "/models/characters/koala/koala.glb";

const RAW = {
  neck: [0.304, -0.2, 0.04],
  mouth: [0.305, -0.181, 0.094],
  earLeft: [0.27, -0.11, 0.03],
  earRight: [0.34, -0.108, 0.035],
  shoulderLeft: [0.272, -0.205, 0.045],
  shoulderRight: [0.336, -0.205, 0.045],
};
const MOUTH_TILT = 0.7;
const HEAD_MIN_Y = -0.17;
const ARM_BAND = [-0.235, -0.185];
const IDLE_HAND_BAND = [-0.27, -0.23];

const LEAVES = 6;
const CYCLE = 2.8;
const CYCLES_PER_SPRIG = LEAVES + 1;
const CHOMP_AT = 0.2;
const SLURP_END = 0.32;
const CHEW_START = 0.34;
const CHEWS = 3;
const STEM_LENGTH = 0.62;
const LEAF_SPOTS = Array.from({ length: LEAVES }, (_, i) => 0.58 - i * 0.075);

const smooth = (a, b, x) => {
  const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};
const pulse = (a, b, x) => (x > a && x < b ? Math.sin(((x - a) / (b - a)) * Math.PI) : 0);
const easeOutBack = (k) => 1 + 3.2 * Math.pow(k - 1, 3) + 2.2 * Math.pow(k - 1, 2);

function munchState(t) {
  const k = Math.floor(t / CYCLE);
  const u = (t % CYCLE) / CYCLE;
  const n = k % CYCLES_PER_SPRIG;
  const toss = n === LEAVES;
  const chewU = (u - CHEW_START) / (1 - CHEW_START);
  const chewing = !toss && u > CHEW_START ? 0.5 - 0.5 * Math.cos(chewU * Math.PI * 2 * CHEWS) : 0;
  return {
    k,
    u,
    n,
    toss,
    leaf: toss ? -1 : n,
    slurp: toss ? 0 : smooth(CHOMP_AT, SLURP_END, u),
    reach: toss ? 0 : smooth(0, CHOMP_AT, u) * (1 - smooth(SLURP_END, SLURP_END + 0.12, u)),
    chomp: toss ? 0 : pulse(CHOMP_AT - 0.03, CHOMP_AT + 0.09, u),
    tug: toss ? 0 : pulse(CHOMP_AT + 0.02, SLURP_END + 0.04, u),
    open: toss ? 0 : Math.max(smooth(0.05, CHOMP_AT - 0.02, u) * (1 - smooth(CHOMP_AT - 0.02, CHOMP_AT + 0.02, u)), chewing * 0.3),
    chewing,
    flight: toss ? THREE.MathUtils.clamp((u - 0.18) / 0.3, 0, 1) : 0,
    sprigVisible: !(toss && u > 0.5 && u < 0.62),
    grow: toss && u >= 0.62 ? easeOutBack(smooth(0.62, 0.78, u)) : 1,
    fresh: toss && u >= 0.62,
    happy: toss ? smooth(0.12, 0.2, u) * (1 - smooth(0.85, 1, u)) : 0,
    hop: toss ? pulse(0.5, 0.66, u) : 0,
  };
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

function cuffTip(meshes, shoulder) {
  const v = new THREE.Vector3();
  const verts = [];
  meshes.forEach((m) => {
    const pos = m.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 3000));
    for (let i = 0; i < pos.count; i += step) verts.push(v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).clone());
  });
  if (!verts.length) return shoulder.clone();
  const far = Math.max(...verts.map((p) => p.distanceTo(shoulder)));
  const ring = verts.filter((p) => p.distanceTo(shoulder) > far * 0.9);
  return ring.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(ring.length);
}

function useKoalaRig(url, idleUrl, targetHeight) {
  const gltf = useGLTF(url);
  const idle = useGLTF(idleUrl);
  return useMemo(() => {
    const root = gltf.scene.clone(true);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const k = targetHeight / (size.y || 1);
    const norm = { center: center.clone(), minY: box.min.y, k };
    const toRig = ([x, y, z]) => new THREE.Vector3((x - center.x) * k, (y - box.min.y) * k, (z - center.z) * k);
    const v3 = (a) => new THREE.Vector3(...a);

    const parts = meshesOf(root);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    const armMeshes = (left) =>
      parts.filter(
        (p) => p.center.y > ARM_BAND[0] && p.center.y < ARM_BAND[1] && p.size.y < 0.06 && (left ? p.center.x < center.x - 0.02 : p.center.x > center.x + 0.02),
      );
    const leftArm = armMeshes(true);
    const rightArm = armMeshes(false);

    const idleHands = meshesOf(idle.scene).filter(
      (p) => p.center.y > IDLE_HAND_BAND[0] && p.center.y < IDLE_HAND_BAND[1] && Math.abs(p.center.x - center.x) > 0.06,
    );
    const placeHand = (left) => {
      const src = idleHands.find((p) => (left ? p.center.x < center.x : p.center.x > center.x));
      const shoulder = v3(left ? RAW.shoulderLeft : RAW.shoulderRight);
      const tip = cuffTip((left ? leftArm : rightArm).map((p) => p.mesh), shoulder);
      const out = tip.clone().sub(shoulder).normalize();
      if (!src) return null;
      const h = src.mesh.clone(true);
      src.mesh.matrixWorld.decompose(h.position, h.quaternion, h.scale);
      const radius = Math.min(src.size.x, src.size.y, src.size.z) / 2;
      h.position.add(tip.clone().addScaledVector(out, radius * 0.45).sub(src.center));
      h.castShadow = true;
      root.add(h);
      return h;
    };
    const handLeft = placeHand(true);
    const handRight = placeHand(false);

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
    const ownPivot = (parent, mesh) => {
      const c = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
      const p = pivot(parent, c);
      p.attach(mesh);
      return p;
    };

    const neckPoint = toRig(RAW.neck);
    const head = pivot(rig, neckPoint);
    const headParts = parts.filter((p) => p.center.y > HEAD_MIN_Y);
    headParts.forEach((p) => head.attach(p.mesh));
    const headBase = head.position.clone();

    const earParts = headParts.filter((p) => p.center.y > -0.115 && Math.abs(p.center.x - center.x) > 0.03);
    const earLeft = pivot(head, toRig(RAW.earLeft));
    const earRight = pivot(head, toRig(RAW.earRight));
    earParts.forEach((p) => (p.center.x < center.x ? earLeft : earRight).attach(p.mesh));

    const eyes = headParts
      .filter((p) => p.center.z > 0.09 && p.size.y < 0.025 && Math.abs(p.center.x - center.x) > 0.015)
      .map((p) => ownPivot(head, p.mesh));

    const mouthGroup = pivot(head, toRig(RAW.mouth));
    mouthGroup.rotation.x = MOUTH_TILT;
    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshStandardMaterial({ color: "#4a2a2e", roughness: 0.7 }),
    );
    mouthGroup.add(mouth);

    const armFor = (left) => {
      const arm = pivot(rig, toRig(left ? RAW.shoulderLeft : RAW.shoulderRight));
      (left ? leftArm : rightArm).forEach((p) => arm.attach(p.mesh));
      const hand = left ? handLeft : handRight;
      if (hand) arm.attach(hand);
      return arm;
    };
    const armLeft = armFor(true);
    const armRight = armFor(false);
    const restDir = (left) => {
      const shoulder = toRig(left ? RAW.shoulderLeft : RAW.shoulderRight);
      const hand = left ? handLeft : handRight;
      if (!hand) return new THREE.Vector3(0, 0, 1);
      return new THREE.Box3().setFromObject(hand).getCenter(new THREE.Vector3()).sub(shoulder).normalize();
    };

    return {
      rig,
      norm,
      head,
      headBase,
      earLeft,
      earRight,
      eyes,
      mouth,
      armLeft,
      armRight,
      restLeft: restDir(true),
      restRight: restDir(false),
      shoulderLeft: toRig(RAW.shoulderLeft),
      shoulderRight: toRig(RAW.shoulderRight),
      mouthOffset: toRig(RAW.mouth).sub(neckPoint),
    };
  }, [gltf, idle, targetHeight]);
}

function useSprig() {
  return useMemo(() => {
    const group = new THREE.Group();
    const stemMat = new THREE.MeshStandardMaterial({ color: "#8a7358", roughness: 0.85 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, STEM_LENGTH, 8), stemMat);
    stem.position.y = STEM_LENGTH / 2;
    stem.castShadow = true;
    group.add(stem);
    const twig = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.12, 6), stemMat);
    twig.position.set(0.03, STEM_LENGTH * 0.28, 0);
    twig.rotation.z = -0.7;
    group.add(twig);

    const leafGeo = new THREE.SphereGeometry(1, 14, 10);
    const leaves = LEAF_SPOTS.map((y, i) => {
      const side = i % 2 === 0 ? 1 : -1;
      const holder = new THREE.Group();
      holder.position.set(0, y, 0);
      const leaf = new THREE.Mesh(
        leafGeo,
        new THREE.MeshStandardMaterial({ color: i % 3 === 1 ? "#8fae84" : "#a3bd94", roughness: 0.75 }),
      );
      leaf.scale.set(0.036, 0.09, 0.013);
      leaf.position.set(side * 0.06, 0.045, 0.016);
      leaf.rotation.set(0.2, side * 0.3, side * -0.9);
      leaf.castShadow = true;
      holder.add(leaf);
      holder.userData.rest = holder.position.clone();
      group.add(holder);
      return holder;
    });
    return { group, leaves };
  }, []);
}

function makeSymbolTexture(kind) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.translate(64, 64);
  if (kind === "sparkle") {
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
  } else if (kind === "leaf") {
    ctx.rotate(-0.7);
    const g = ctx.createLinearGradient(-40, 0, 40, 0);
    g.addColorStop(0, "#b9cfa6");
    g.addColorStop(1, "#7c9a70");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-44, 0);
    ctx.quadraticCurveTo(0, -20, 44, 0);
    ctx.quadraticCurveTo(0, 20, -44, 0);
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
  const textures = useMemo(() => ["leaf", "sparkle", "heart"].map(makeSymbolTexture), []);
  const refs = useRef([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: SYMBOL_COUNT }, (_, i) => ({
        angle0: (i / SYMBOL_COUNT) * Math.PI * 2,
        radius: 0.5 + ((i * 13) % 10) / 70,
        yBase: 1.35 + ((i * 29) % 10) / 22,
        speed: 0.45 + ((i * 7) % 10) / 24,
        bob: 0.05 + ((i * 19) % 10) / 170,
        phase: (i / SYMBOL_COUNT) * 3.1,
        kind: i % 3,
        size: 0.07 + ((i * 23) % 10) / 250,
      })),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { happy } = munchState(t);
    refs.current.forEach((s, i) => {
      if (!s) return;
      const seed = seeds[i];
      const life = ((t * seed.speed + seed.phase) % 3.4) / 3.4;
      const fade = Math.sin(life * Math.PI);
      const a = seed.angle0 + t * 0.22;
      s.position.set(
        Math.cos(a) * seed.radius,
        seed.yBase + Math.sin(life * Math.PI * 2) * seed.bob + life * 0.1,
        Math.sin(a) * seed.radius * 0.55,
      );
      s.material.opacity = THREE.MathUtils.lerp(s.material.opacity, fade * 0.9, 0.12);
      s.material.rotation = Math.sin(t * 1.1 + i) * 0.25;
      s.scale.setScalar(seed.size * (0.8 + fade * 0.4 + (seed.kind === 2 ? happy * 0.5 : 0)));
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

const BITS = 5;

function LeafBits({ originRef }) {
  const refs = useRef([]);
  const origin = useMemo(() => new THREE.Vector3(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: BITS }, (_, i) => ({
        vx: ((i * 37) % 10) / 10 - 0.5,
        vz: 0.15 + ((i * 29) % 10) / 40,
        drift: 0.6 + ((i * 53) % 10) / 12,
        spin: 2 + ((i * 11) % 5),
      })),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = munchState(t);
    const tb = (s.u - CHOMP_AT) * CYCLE;
    if (originRef.current && tb < 0.03) origin.copy(originRef.current);
    refs.current.forEach((m, i) => {
      if (!m) return;
      const sd = seeds[i];
      const life = THREE.MathUtils.clamp(tb / 1.6, 0, 1);
      m.visible = !s.toss && tb > 0 && life < 1;
      m.position.set(
        origin.x + sd.vx * 0.25 * life + Math.sin(t * 3 + i) * 0.02 * life,
        Math.max(0.01, origin.y - life * life * origin.y * sd.drift * 0.9),
        origin.z + sd.vz * life,
      );
      m.rotation.set(t * sd.spin, t * sd.spin * 0.6, i);
      m.scale.set(0.018, 0.034, 0.006).multiplyScalar(1 - life * 0.3);
    });
  });

  return (
    <group>
      {seeds.map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshStandardMaterial color={i % 2 ? "#a3bd94" : "#8fae84"} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function FeedingKoalaRig({ worldScale, idleModelPath, placement }) {
  const koala = useKoalaRig(koalaAsset.url, idleModelPath, LOCAL_REFERENCE_HEIGHT);
  const sprig = useSprig();
  const bodyRef = useRef(null);
  const matteRef = useRef(null);
  const sprigRef = useRef(null);
  const bitOrigin = useRef(new THREE.Vector3());

  useEffect(() => {
    if (placement && matteRef.current) makeMatte(matteRef.current);
  }, [placement]);

  const tmp = useMemo(
    () => ({
      mouth: new THREE.Vector3(),
      base: new THREE.Vector3(),
      grip: new THREE.Vector3(),
      v: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      toss1: new THREE.Vector3(-0.7, 0.02, -0.6),
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = munchState(t);
    const breathe = Math.sin(t * 1.4) * 0.015;
    const doze = Math.sin(t * 0.7) * 0.5 + 0.5;

    if (bodyRef.current) {
      const sq = s.chewing * 0.025 + s.chomp * 0.03;
      bodyRef.current.scale.set(1 + sq + breathe * 0.5 - s.hop * 0.04, 1 - sq * 1.2 + breathe + s.hop * 0.07, 1 + sq + breathe * 0.5 - s.hop * 0.04);
      bodyRef.current.position.y = -sq * 0.3 + s.hop * 0.12;
      bodyRef.current.rotation.z = Math.sin(t * 0.9) * 0.025 + Math.sin(t * 6) * 0.05 * s.happy;
    }

    const head = koala.head;
    const lunge = s.reach * 0.02 + s.chomp * 0.015;
    head.position.copy(koala.headBase);
    head.position.z += lunge;
    const lookAtStick = s.toss ? smooth(0, 0.12, s.u) * (1 - smooth(0.16, 0.3, s.u)) : 0;
    head.rotation.set(
      s.reach * 0.06 + s.chomp * 0.08 - s.tug * 0.1 + s.chewing * 0.035 + doze * 0.03 + lookAtStick * 0.2,
      s.toss ? -pulse(0.18, 0.5, s.u) * 0.45 : Math.sin(t * 0.5) * 0.06,
      Math.sin(t * 0.8) * 0.06 + Math.sin(t * 6) * 0.05 * s.happy,
    );
    const puff = s.chewing * 0.04;
    head.scale.set(1 + puff, 1 - puff * 0.4, 1 + puff * 0.5);
    head.updateMatrix();

    koala.mouth.visible = s.open > 0.02;
    koala.mouth.scale.set(0.035 + s.open * 0.03, 0.002 + s.open * 0.035, 0.012);
    koala.eyes.forEach((e) => e.scale.set(1, 1 - s.chomp * 0.35 - s.chewing * 0.15, 1));
    const wiggle = Math.sin(t * 2.2) * 0.05 + s.chewing * 0.06 + s.chomp * 0.1;
    koala.earLeft.rotation.z = wiggle + Math.sin(t * 6) * 0.1 * s.happy;
    koala.earRight.rotation.z = -wiggle - Math.sin(t * 6 + 1) * 0.1 * s.happy;

    tmp.mouth.copy(koala.mouthOffset).applyMatrix4(head.matrix);
    const target = s.leaf >= 0 ? LEAF_SPOTS[s.leaf] + 0.03 : LEAF_SPOTS[LEAVES - 1];
    tmp.base.copy(tmp.mouth).add(tmp.v.set(0, -target - 0.03, 0.06));
    tmp.base.y -= 0.08 * (1 - s.reach);
    tmp.base.z += 0.05 * (1 - s.reach) + s.tug * 0.02;
    if (s.toss) {
      tmp.base.copy(tmp.mouth).add(tmp.v.set(0, -0.62, 0.12));
      tmp.base.y += lookAtStick * 0.08;
      if (s.flight > 0 && s.u < 0.62) {
        tmp.v.copy(tmp.base);
        tmp.base.lerpVectors(tmp.v, tmp.toss1, s.flight);
        tmp.base.y += Math.sin(s.flight * Math.PI) * 0.7;
      }
    }

    if (sprigRef.current) {
      const g = sprigRef.current;
      g.visible = s.sprigVisible;
      g.position.copy(tmp.base);
      const spin = s.toss && s.u < 0.62 ? s.flight * 8 : 0;
      g.rotation.set(-0.12 + s.tug * 0.15 + Math.sin(t * 1.3) * 0.03 + spin, Math.sin(t * 0.9) * 0.15, Math.sin(t * 1.1) * 0.04 + spin * 0.5);
      g.scale.setScalar(Math.max(0.001, s.grow));
    }
    const eatenBefore = s.toss ? (s.fresh ? 0 : LEAVES) : s.n;
    sprig.leaves.forEach((leaf, i) => {
      if (i < eatenBefore) {
        leaf.visible = false;
        return;
      }
      leaf.visible = true;
      leaf.position.copy(leaf.userData.rest);
      leaf.scale.setScalar(1);
      if (i === s.leaf && s.slurp > 0) {
        leaf.visible = s.slurp < 0.98;
        leaf.position.y += s.slurp * 0.04;
        leaf.position.z += s.slurp * 0.03;
        leaf.scale.setScalar(1 - s.slurp * 0.9);
      }
      leaf.rotation.z = Math.sin(t * 2 + i) * 0.08;
    });
    bitOrigin.current.copy(tmp.mouth).add(tmp.v.set(0, -0.03, 0.05));

    const holding = s.toss ? 1 - pulse(0.12, 0.55, s.u) : 1;
    const arms = [
      [koala.armLeft, koala.shoulderLeft, koala.restLeft, -1],
      [koala.armRight, koala.shoulderRight, koala.restRight, 1],
    ];
    arms.forEach(([arm, shoulder, rest, side]) => {
      tmp.grip.copy(tmp.base).add(tmp.v.set(side * 0.07, 0.02, -0.01));
      if (s.toss && s.u < 0.62) tmp.grip.set(side * 0.5, 1.05, 0.25);
      tmp.v.copy(tmp.grip).sub(shoulder).normalize();
      tmp.q.setFromUnitVectors(rest, tmp.v);
      arm.quaternion.identity().slerp(tmp.q, 0.9 * THREE.MathUtils.clamp(holding + (s.toss ? 0.5 : 0), 0, 1));
      arm.rotation.z += side * Math.sin(t * 9) * 0.12 * s.happy;
    });
  });

  const content = (
    <group ref={bodyRef}>
      <primitive object={koala.rig} />
      <group ref={sprigRef}>
        <primitive object={sprig.group} />
      </group>
      <LeafBits originRef={bitOrigin} />
      <FloatSymbols />
    </group>
  );

  if (placement) {
    const { homePosition, offset, scale, yaw = 0, lean = 0 } = placement;
    const { center, minY, k } = koala.norm;
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
  (typeof window !== "undefined" && window.__idlePlacement?.koala?.modelPath) || IDLE_MODEL_FALLBACK;

export default function FeedingKoala({ homePosition = [0, 0], scale = 1, referenceHeight = 1, placement, idleModelPath: idlePathProp }) {
  const idleModelPath = useMemo(() => idlePathProp || idleModelPathFromHabitat(), [idlePathProp]);
  const worldScale = (referenceHeight * scale) / LOCAL_REFERENCE_HEIGHT;
  if (placement) {
    return (
      <Suspense fallback={null}>
        <FeedingKoalaRig placement={placement} idleModelPath={idleModelPath} />
      </Suspense>
    );
  }
  return (
    <group position={[homePosition[0], 0, homePosition[1]]}>
      <Suspense fallback={null}>
        <FeedingKoalaRig worldScale={worldScale} idleModelPath={idleModelPath} />
      </Suspense>
    </group>
  );
}

useGLTF.preload(koalaAsset.url);