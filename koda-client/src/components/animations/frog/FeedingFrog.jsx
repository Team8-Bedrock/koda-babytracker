import { Suspense, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LOCAL_REFERENCE_HEIGHT = 1.6;
const frogAsset = { url: "/models/characters/frog/feeding.glb" };
const IDLE_MODEL_FALLBACK = "/models/characters/frog/frog.glb";

const RAW = {
  neck: [0, -0.4, 0.02],
  mouth: [0.005, -0.29, 0.149],
  tongueBase: [0.005, -0.292, 0.13],
  throat: [0, -0.345, 0.15],
  leaf: [0.01, -0.18, 0.049],
  shoulderLeft: [-0.045, -0.405, 0.07],
  shoulderRight: [0.045, -0.405, 0.07],
};
const HEAD_MIN_Y = -0.37;
const ARM_BAND = [-0.49, -0.385];
const IDLE_HAND_BAND = [-0.5, -0.45];

const CYCLE = 3.6;
const TONGUE_OUT = 0.46;
const TONGUE_HIT = 0.51;
const TONGUE_BACK = 0.6;
const CHEW_START = 0.68;
const CHEWS = 3;

const FLY_CENTER = new THREE.Vector3(0, 1.22, 0.95);
const FLY_RADIUS = new THREE.Vector3(0.45, 0.14, 0.16);
const TONGUE_RADIUS = 0.024;
const TONGUE_TIP = 0.038;
const ARM_REACH = 0.85;
const PETAL_COUNT = 5;
const PETAL_COLOR = "#ffb3cf";
const PETAL_TIP = "#ff8fb8";
const FLOWER_HEART = "#ffd84d";
const SEPAL_COLOR = "#5aa83a";
const BLOOM_SECONDS = 0.9;
const HABITAT_TUNING = { lift: 0.42, flySize: 1.8, tongue: 1.6 };
const CARD_TUNING = { lift: 0, flySize: 1, tongue: 1 };

const smooth = (a, b, x) => {
  const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};
const pulse = (a, b, x) => (x > a && x < b ? Math.sin(((x - a) / (b - a)) * Math.PI) : 0);

function flyPath(time, out, lift = 0) {
  const a = time * 2.1;
  return out.set(
    FLY_CENTER.x + Math.sin(a) * FLY_RADIUS.x,
    FLY_CENTER.y + lift + Math.sin(a * 2.3) * FLY_RADIUS.y,
    FLY_CENTER.z + Math.cos(a * 1.3) * FLY_RADIUS.z,
  );
}

function catchState(t) {
  const k = Math.floor(t / CYCLE);
  const u = (t % CYCLE) / CYCLE;
  const side = k % 2 === 0 ? 1 : -1;
  const extend = u < TONGUE_HIT ? smooth(TONGUE_OUT, TONGUE_HIT, u) : 1 - smooth(TONGUE_HIT, TONGUE_BACK, u);
  const chewU = (u - CHEW_START) / (0.95 - CHEW_START);
  const chewing = u > CHEW_START && u < 0.95 ? 0.5 - 0.5 * Math.cos(chewU * Math.PI * 2 * CHEWS) : 0;
  return {
    k,
    u,
    side,
    hitTime: (k + TONGUE_HIT) * CYCLE,
    arrive: smooth(0, 0.2, u),
    flyAlive: u < TONGUE_BACK,
    caught: u >= TONGUE_HIT && u < TONGUE_BACK,
    extend: u > TONGUE_OUT && u < TONGUE_BACK ? extend : 0,
    open: smooth(TONGUE_OUT - 0.06, TONGUE_OUT, u) * (1 - smooth(TONGUE_BACK, TONGUE_BACK + 0.03, u)) + chewing * 0.25,
    crouch: pulse(TONGUE_OUT - 0.14, TONGUE_OUT + 0.02, u),
    gulp: pulse(TONGUE_BACK, TONGUE_BACK + 0.12, u),
    chewing,
    hop: pulse(0.74, 0.88, u),
    happy: smooth(0.62, 0.7, u) * (1 - smooth(0.95, 1, u)),
    track: 1 - smooth(TONGUE_HIT, TONGUE_BACK, u),
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

function averageColor(mesh) {
  const col = mesh.geometry?.attributes?.color;
  if (col) {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let i = 0; i < col.count; i += 7) {
      r += col.getX(i);
      g += col.getY(i);
      b += col.getZ(i);
      n++;
    }
    return [r / Math.max(1, n), g / Math.max(1, n), b / Math.max(1, n)];
  }
  const m = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  const c = m?.color || new THREE.Color(1, 1, 1);
  return [c.r, c.g, c.b];
}

const isStemColor = ([r, g, b]) => g > 0.34 && g < 0.52 && r > 0.1 && r < 0.24 && b < 0.06;
const isBladeColor = ([r, g, b]) => g > 0.14 && g < 0.3 && r < 0.09 && b < 0.06;

function topVertex(meshes) {
  const v = new THREE.Vector3();
  let best = null;
  meshes.forEach((mesh) => {
    const pos = mesh.geometry.attributes.position;
    const step = Math.max(1, Math.floor(pos.count / 1500));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      if (!best || v.y > best.y) best = v.clone();
    }
  });
  return best;
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
  const sepal = new THREE.Mesh(new THREE.SphereGeometry(size * 0.3, 12, 8), softMaterial(SEPAL_COLOR));
  sepal.scale.set(1, 0.45, 1);
  sepal.position.y = -size * 0.06;
  bloom.add(sepal);
  flower.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  flower.scale.setScalar(0.0001);
  flower.visible = false;
  return { flower, bloom, petals };
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

function useFrogRig(url, idleUrl, targetHeight) {
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

    const parts = meshesOf(root);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });

    const idleParts = meshesOf(idle.scene);
    const hands = idleParts
      .filter((p) => p.center.y > IDLE_HAND_BAND[0] && p.center.y < IDLE_HAND_BAND[1] && Math.abs(p.center.x) > 0.1 && p.size.y < 0.07)
      .map((p) => {
        const h = p.mesh.clone(true);
        p.mesh.matrixWorld.decompose(h.position, h.quaternion, h.scale);
        h.castShadow = true;
        root.add(h);
        return { mesh: h, left: p.center.x < 0 };
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

    const neckPoint = toRig(RAW.neck);
    const head = pivot(rig, neckPoint);
    const headParts = parts.filter((p) => p.center.y > HEAD_MIN_Y);
    headParts.forEach((p) => head.attach(p.mesh));
    const headBase = head.position.clone();
    headParts
      .filter((p) => Math.abs(p.center.x) < 0.05 && p.center.y > -0.31 && p.center.y < -0.27 && p.center.z > 0.12 && p.size.y < 0.05)
      .forEach((p) => {
        p.mesh.visible = false;
      });

    const stemParts = headParts.filter((p) => p.center.y > -0.215 && Math.abs(p.center.x) < 0.07);
    const leaf = pivot(head, toRig(RAW.leaf));
    stemParts.forEach((p) => leaf.attach(p.mesh));
    rig.updateMatrixWorld(true);
    const stems = stemParts.filter((p) => isStemColor(averageColor(p.mesh)));
    const blades = stemParts.filter((p) => isBladeColor(averageColor(p.mesh)));
    const stemTip = topVertex((stems.length ? stems : stemParts).map((p) => p.mesh)) || toRig(RAW.leaf).add(new THREE.Vector3(0, 0.2, 0));
    const bladeBox = new THREE.Box3();
    blades.forEach((p) => bladeBox.union(new THREE.Box3().setFromObject(p.mesh)));
    const leafLength = bladeBox.isEmpty() ? 0.3 : Math.max(bladeBox.max.x - bladeBox.min.x, bladeBox.max.z - bladeBox.min.z);
    const stemBox = new THREE.Box3();
    (stems.length ? stems : stemParts).forEach((p) => stemBox.union(new THREE.Box3().setFromObject(p.mesh)));
    const stemHeight = stemBox.isEmpty() ? 0.25 : stemBox.max.y - stemBox.min.y;
    const flowerParts = makeFlower(Math.max(leafLength * 0.62, stemHeight * 0.7));
    const flowerSeat = pivot(leaf, stemTip.clone().add(new THREE.Vector3(0, leafLength * 0.03, 0)));
    flowerSeat.add(flowerParts.flower);

    const eyes = headParts
      .filter((p) => Math.abs(p.center.x) > 0.06 && p.center.z > 0.09 && p.center.y > -0.3 && p.size.y < 0.06)
      .map((p) => {
        const c = new THREE.Box3().setFromObject(p.mesh).getCenter(new THREE.Vector3());
        const e = pivot(head, c);
        e.attach(p.mesh);
        return e;
      });

    const mouthGroup = pivot(head, toRig(RAW.mouth));
    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 14),
      new THREE.MeshStandardMaterial({ color: "#6b2235", roughness: 0.7 }),
    );
    mouthGroup.add(mouth);

    const throatGroup = pivot(head, toRig(RAW.throat));
    const throat = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      new THREE.MeshStandardMaterial({ color: "#d6ec86", roughness: 0.8 }),
    );
    throatGroup.add(throat);

    const armFor = (left, shoulderRaw) => {
      const arm = pivot(rig, toRig(shoulderRaw));
      parts
        .filter((p) => p.center.y > ARM_BAND[0] && p.center.y < ARM_BAND[1] && (left ? p.center.x < -0.03 : p.center.x > 0.03) && p.size.y < 0.1)
        .forEach((p) => arm.attach(p.mesh));
      hands.filter((h) => h.left === left).forEach((h) => arm.attach(h.mesh));
      return arm;
    };
    const armLeft = armFor(true, RAW.shoulderLeft);
    const armRight = armFor(false, RAW.shoulderRight);

    const handRest = (left) => {
      const h = hands.find((x) => x.left === left);
      const shoulder = toRig(left ? RAW.shoulderLeft : RAW.shoulderRight);
      if (!h) return new THREE.Vector3(left ? -1 : 1, -1, 0.3).normalize();
      return new THREE.Box3().setFromObject(h.mesh).getCenter(new THREE.Vector3()).sub(shoulder).normalize();
    };

    return {
      rig,
      norm,
      head,
      headBase,
      leaf,
      flower: flowerParts,
      eyes,
      mouth,
      throat,
      armLeft,
      armRight,
      restLeft: handRest(true),
      restRight: handRest(false),
      shoulderLeft: toRig(RAW.shoulderLeft),
      shoulderRight: toRig(RAW.shoulderRight),
      tongueOffset: toRig(RAW.tongueBase).sub(neckPoint),
    };
  }, [gltf, idle, targetHeight]);
}

function useFly(size) {
  return useMemo(() => {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: "#1c1a17", roughness: 0.6 });
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(size * 0.32, 12, 10), bodyMat);
    abdomen.scale.set(1, 0.85, 1.3);
    abdomen.castShadow = true;
    group.add(abdomen);
    const head = new THREE.Mesh(new THREE.SphereGeometry(size * 0.2, 10, 8), bodyMat);
    head.position.z = size * 0.4;
    group.add(head);
    const eyeMat = new THREE.MeshStandardMaterial({ color: "#7a1f2b", roughness: 0.4 });
    [-1, 1].forEach((side) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(size * 0.1, 8, 6), eyeMat);
      eye.position.set(side * size * 0.14, 0, size * 0.46);
      group.add(eye);
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: "#e4f4fa",
      transparent: true,
      opacity: 0.6,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
    const wings = [-1, 1].map((side) => {
      const hinge = new THREE.Group();
      hinge.position.set(side * size * 0.08, size * 0.2, 0);
      const wing = new THREE.Mesh(new THREE.CircleGeometry(size * 0.45, 14), wingMat);
      wing.position.set(side * size * 0.3, 0, -size * 0.05);
      wing.rotation.x = -Math.PI / 2;
      wing.scale.set(1, 0.6, 1);
      hinge.add(wing);
      hinge.userData.side = side;
      group.add(hinge);
      return hinge;
    });
    return { group, wings };
  }, [size]);
}

function makeBubbleTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 40, 128, 128, 120);
  g.addColorStop(0, "rgba(120,190,90,0.1)");
  g.addColorStop(0.85, "rgba(70,150,60,0.22)");
  g.addColorStop(1, "rgba(45,120,45,0.6)");
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

function GulpBubbles() {
  const texture = useMemo(() => makeBubbleTexture(), []);
  const refs = useRef([]);
  const seeds = useMemo(() => [0, 0.06, 0.12, 0.18], []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const { u } = catchState(t);
    refs.current.forEach((sprite, i) => {
      if (!sprite) return;
      const start = TONGUE_BACK + 0.08 + seeds[i];
      const life = THREE.MathUtils.clamp((u - start) / 0.3, 0, 1);
      const on = u > start && life < 1;
      sprite.visible = on;
      sprite.position.set(Math.sin(i * 2.1 + t * 1.5) * 0.12, 1.45 + life * 0.45, 0.25 + Math.cos(i * 1.7) * 0.06);
      sprite.material.opacity = Math.sin(life * Math.PI) * 0.85;
      sprite.scale.setScalar((0.05 + life * 0.06) * (1 + (i % 2) * 0.4));
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
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "leaf") {
    ctx.rotate(-0.55);
    const g = ctx.createLinearGradient(-42, -16, 42, 16);
    g.addColorStop(0, "#9be36b");
    g.addColorStop(1, "#3d9a4e");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 42, 17, 0, 0, Math.PI * 2);
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
        radius: 0.6 + ((i * 13) % 10) / 70,
        yBase: 1.35 + ((i * 29) % 10) / 22,
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
    const { happy } = catchState(t);
    refs.current.forEach((s, i) => {
      if (!s) return;
      const seed = seeds[i];
      const life = ((t * seed.speed + seed.phase) % 3.4) / 3.4;
      const fade = Math.sin(life * Math.PI);
      const a = seed.angle0 + t * 0.25;
      s.position.set(
        Math.cos(a) * seed.radius,
        seed.yBase + Math.sin(life * Math.PI * 2) * seed.bob + life * 0.1,
        Math.sin(a) * seed.radius * 0.55,
      );
      s.material.opacity = THREE.MathUtils.lerp(s.material.opacity, fade * 0.9, 0.12);
      s.material.rotation = Math.sin(t * 1.2 + i) * 0.25;
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

const CATCH_SPARKS = 6;

function CatchSparkles({ lift }) {
  const texture = useMemo(() => makeSymbolTexture("sparkle"), []);
  const refs = useRef([]);
  const hit = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = catchState(t);
    flyPath(s.hitTime, hit, lift);
    const life = THREE.MathUtils.clamp((s.u - TONGUE_HIT) / 0.12, 0, 1);
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      const a = (i / CATCH_SPARKS) * Math.PI * 2;
      sp.visible = s.u > TONGUE_HIT && life < 1;
      sp.position.set(hit.x + Math.cos(a) * life * 0.18, hit.y + Math.sin(a) * life * 0.18, hit.z + 0.02);
      sp.material.opacity = 1 - life;
      sp.material.rotation = life * 2;
      sp.scale.setScalar(0.06 * (1 + lift) * (1 - life * 0.4));
    });
  });

  return (
    <group>
      {Array.from({ length: CATCH_SPARKS }, (_, i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)}>
          <spriteMaterial map={texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

function FeedingFrogRig({ worldScale, idleModelPath, placement }) {
  const frog = useFrogRig(frogAsset.url, idleModelPath, LOCAL_REFERENCE_HEIGHT);
  const tuning = placement ? HABITAT_TUNING : CARD_TUNING;
  const fly = useFly(LOCAL_REFERENCE_HEIGHT * 0.1 * tuning.flySize);
  const bodyRef = useRef(null);
  const matteRef = useRef(null);
  const flyRef = useRef(null);
  const tongueRef = useRef(null);
  const tongueBodyRef = useRef(null);
  const tongueTipRef = useRef(null);
  const bloomState = useRef({ started: null, amount: 0 });
  const tongueGeometry = useMemo(() => new THREE.CylinderGeometry(TONGUE_RADIUS, TONGUE_RADIUS * 1.15, 1, 12).translate(0, 0.5, 0), []);

  useEffect(() => {
    if (placement && matteRef.current) makeMatte(matteRef.current);
  }, [placement]);

  const tmp = useMemo(
    () => ({
      fly: new THREE.Vector3(),
      hit: new THREE.Vector3(),
      entry: new THREE.Vector3(),
      base: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      tip: new THREE.Vector3(),
      look: new THREE.Vector3(),
      v: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      up: new THREE.Vector3(0, 1, 0),
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = catchState(t);
    const breathe = Math.sin(t * 1.6) * 0.015;

    flyPath(t, tmp.fly, tuning.lift);
    flyPath(s.hitTime, tmp.hit, tuning.lift);
    tmp.entry.set(s.side * 1.5, 1.75 + tuning.lift, 1.4);
    tmp.fly.lerpVectors(tmp.entry, tmp.fly, s.arrive);
    tmp.fly.lerp(tmp.hit, smooth(TONGUE_OUT - 0.06, TONGUE_OUT, s.u));

    if (bodyRef.current) {
      const sq = s.crouch * 0.07 + s.gulp * 0.04 + s.chewing * 0.025;
      bodyRef.current.scale.set(1 + sq + breathe * 0.5 - s.hop * 0.04, 1 - sq * 1.2 + breathe + s.hop * 0.07, 1 + sq + breathe * 0.5 - s.hop * 0.04);
      bodyRef.current.position.y = -sq * 0.3 + s.hop * 0.14;
      bodyRef.current.rotation.z = Math.sin(t * 1.3) * 0.02 + Math.sin(t * 7) * 0.04 * s.happy;
    }

    const head = frog.head;
    tmp.look.copy(tmp.fly).sub(frog.headBase);
    const yaw = THREE.MathUtils.clamp(Math.atan2(tmp.look.x, Math.max(0.2, tmp.look.z)), -0.5, 0.5) * s.track * s.arrive;
    const pitch = THREE.MathUtils.clamp(-Math.atan2(tmp.look.y - 0.35, Math.max(0.2, tmp.look.z)), -0.35, 0.25) * s.track * s.arrive;
    head.position.copy(frog.headBase);
    head.position.z += s.extend * 0.03;
    head.rotation.set(pitch * 0.7 + s.chewing * 0.03 - s.gulp * 0.06, yaw * 0.7, Math.sin(t * 1.1) * 0.03 + Math.sin(t * 7) * 0.04 * s.happy);
    const puff = s.chewing * 0.035 + s.gulp * 0.02;
    head.scale.set(1 + puff, 1 - puff * 0.5, 1 + puff * 0.4);
    head.updateMatrix();

    frog.mouth.visible = s.open > 0.02;
    frog.mouth.scale.set(0.03 + s.open * 0.05, 0.001 + s.open * 0.053, 0.02);
    frog.throat.scale.setScalar(0.03 + s.gulp * 0.05 + s.chewing * 0.012 + Math.max(0, Math.sin(t * 3)) * 0.006);
    frog.eyes.forEach((e) => e.scale.set(1, 1 - s.gulp * 0.4 - s.chewing * 0.15, 1));
    frog.leaf.rotation.z = Math.sin(t * 2.4) * 0.12 + s.hop * 0.4 * Math.sin(t * 9);
    frog.leaf.rotation.x = -s.hop * 0.3 + s.crouch * 0.15;

    const bloom = bloomState.current;
    if (bloom.started === null && s.gulp > 0.1) bloom.started = t;
    bloom.amount = bloom.started === null ? 0 : smooth(0, BLOOM_SECONDS, t - bloom.started);
    const fl = frog.flower;
    const grow = smooth(0, 0.5, bloom.amount);
    const open = smooth(0.4, 1, bloom.amount);
    const pop = 1 + s.gulp * 0.18 + s.chewing * 0.04;
    fl.flower.visible = bloom.amount > 0.01;
    fl.flower.scale.setScalar(Math.max(0.0001, grow * pop));
    fl.flower.rotation.z = Math.sin(t * 2.1) * 0.12 + Math.sin(t * 9) * 0.08 * s.happy;
    fl.bloom.rotation.y = t * 0.4 + s.happy * 0.6;
    fl.petals.forEach((petal, i) => {
      petal.rotation.x = -1.35 * (1 - open) - 0.25 + Math.sin(t * 3 + i) * 0.06 * open - s.gulp * 0.25 + s.happy * Math.sin(t * 10 + i) * 0.08;
    });

    tmp.base.copy(frog.tongueOffset).applyMatrix4(head.matrix);
    tmp.dir.copy(tmp.hit).sub(tmp.base);
    const fullLen = tmp.dir.length();
    tmp.dir.normalize();
    const len = Math.max(0.0001, fullLen * s.extend);
    tmp.tip.copy(tmp.base).addScaledVector(tmp.dir, len);

    if (tongueRef.current) {
      tongueRef.current.visible = s.extend > 0.01;
      tongueRef.current.position.copy(tmp.base);
      tongueRef.current.quaternion.setFromUnitVectors(tmp.up, tmp.dir);
      if (tongueBodyRef.current) tongueBodyRef.current.scale.set(tuning.tongue, len, tuning.tongue);
      if (tongueTipRef.current) {
        tongueTipRef.current.position.set(0, len, 0);
        tongueTipRef.current.scale.setScalar(tuning.tongue);
      }
    }

    if (flyRef.current) {
      const f = flyRef.current;
      f.visible = s.flyAlive;
      f.position.copy(s.caught ? tmp.tip : tmp.fly);
      f.position.y += s.caught ? 0 : Math.sin(t * 13) * 0.012;
      f.rotation.set(0, s.caught ? 0 : Math.atan2(-Math.cos(t * 2.1), Math.sin(t * 2.1)) + Math.PI, Math.sin(t * 9) * 0.2);
      f.scale.setScalar(Math.max(0.001, s.arrive) * (s.caught ? 0.85 : 1));
      fly.wings.forEach((w) => {
        w.rotation.z = w.userData.side * (0.2 + Math.sin(t * 70) * 0.6) * (s.caught ? 0.3 : 1);
      });
    }

    const arms = [
      [frog.armLeft, frog.shoulderLeft, frog.restLeft, -1],
      [frog.armRight, frog.shoulderRight, frog.restRight, 1],
    ];
    arms.forEach(([arm, shoulder, rest, side]) => {
      tmp.v.set(side * 0.7, 0.98, 0.32).sub(shoulder).normalize();
      tmp.q.setFromUnitVectors(rest, tmp.v);
      arm.quaternion.identity().slerp(tmp.q, ARM_REACH * (s.happy + s.hop * 0.3));
      arm.rotation.z += side * s.crouch * 0.25 + side * Math.sin(t * 10) * 0.15 * s.happy;
    });
  });

  const content = (
    <>
      <group ref={bodyRef}>
        <primitive object={frog.rig} />
        <group ref={tongueRef} visible={false}>
          <mesh ref={tongueBodyRef} geometry={tongueGeometry} castShadow>
            <meshStandardMaterial color="#ff7f9e" roughness={0.6} />
          </mesh>
          <mesh ref={tongueTipRef}>
            <sphereGeometry args={[TONGUE_TIP, 16, 12]} />
            <meshStandardMaterial color="#ff6b8f" roughness={0.6} />
          </mesh>
        </group>
        <group ref={flyRef}>
          <primitive object={fly.group} />
        </group>
        <CatchSparkles lift={tuning.lift} />
        <GulpBubbles />
        <FloatSymbols />
      </group>
    </>
  );

  if (placement) {
    const { homePosition, offset, scale, yaw = 0, lean = 0 } = placement;
    const { center, minY, k } = frog.norm;
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
  (typeof window !== "undefined" && window.__idlePlacement?.frog?.modelPath) || IDLE_MODEL_FALLBACK;

export default function FeedingFrog({ homePosition = [0, 0], scale = 1, referenceHeight = 1, placement, idleModelPath: idlePathProp }) {
  const idleModelPath = useMemo(() => idlePathProp || idleModelPathFromHabitat(), [idlePathProp]);
  const worldScale = (referenceHeight * scale) / LOCAL_REFERENCE_HEIGHT;
  if (placement) {
    return (
      <Suspense fallback={null}>
        <FeedingFrogRig placement={placement} idleModelPath={idleModelPath} />
      </Suspense>
    );
  }
  return (
    <group position={[homePosition[0], 0, homePosition[1]]}>
      <Suspense fallback={null}>
        <FeedingFrogRig worldScale={worldScale} idleModelPath={idleModelPath} />
      </Suspense>
    </group>
  );
}

useGLTF.preload(frogAsset.url);