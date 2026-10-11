import { Suspense, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LOCAL_REFERENCE_HEIGHT = 1.6;
const foxAsset = { url: "/models/characters/fox/feeding.glb" };
const IDLE_MODEL_FALLBACK = "/models/characters/fox/fox.glb";

const RAW = {
  neck: [0.33, -0.1, 0.03],
  mouth: [0.34, 0.112, 0.372],
  earLeft: [0.15, 0.42, -0.03],
  earRight: [0.53, 0.42, 0.02],
  shoulderLeft: [0.12, -0.2, 0.06],
  shoulderRight: [0.5, -0.2, 0.05],
  tail: [0.29, -0.6, -0.14],
};
const MOUTH_TILT = 0.25;

const APPLE_R = 0.13;
const BITES = 5;
const BITE_RADIUS = 0.6;
const CYCLE = 2.4;
const CYCLES_PER_APPLE = BITES + 1;
const CHOMP_AT = 0.2;
const CHEW_START = 0.4;
const CHEWS = 4;

const smooth = (a, b, x) => {
  const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};
const pulse = (a, b, x) => (x > a && x < b ? Math.sin(((x - a) / (b - a)) * Math.PI) : 0);
const easeOutBack = (k) => 1 + 3.2 * Math.pow(k - 1, 3) + 2.2 * Math.pow(k - 1, 2);

function snackState(t) {
  const k = Math.floor(t / CYCLE);
  const u = (t % CYCLE) / CYCLE;
  const n = k % CYCLES_PER_APPLE;
  const toss = n === BITES;
  const chewU = (u - CHEW_START) / (1 - CHEW_START);
  const chewing = !toss && u > CHEW_START ? 0.5 - 0.5 * Math.cos(chewU * Math.PI * 2 * CHEWS) : 0;
  const bitesDone = toss ? BITES : n + (u >= CHOMP_AT ? 1 : 0);
  const turn = toss ? BITES : n + smooth(0.5, 0.92, u) * (n < BITES - 1 ? 1 : 0);
  return {
    k,
    u,
    n,
    toss,
    bitesDone: toss && u >= 0.6 ? 0 : bitesDone,
    turn: toss && u >= 0.6 ? 0 : turn,
    reach: toss ? 0 : smooth(0, CHOMP_AT, u) * (1 - smooth(CHOMP_AT + 0.03, CHEW_START, u)),
    chomp: toss ? 0 : pulse(CHOMP_AT - 0.03, CHOMP_AT + 0.08, u),
    tug: toss ? 0 : pulse(CHOMP_AT + 0.05, CHEW_START, u),
    open: toss ? 0 : Math.max(smooth(0.04, CHOMP_AT - 0.02, u) * (1 - smooth(CHOMP_AT - 0.02, CHOMP_AT + 0.01, u)), chewing * 0.35),
    chewing,
    flight: toss ? THREE.MathUtils.clamp((u - 0.15) / 0.3, 0, 1) : 0,
    grow: toss ? (u >= 0.6 ? easeOutBack(smooth(0.6, 0.76, u)) : 1) : 1,
    appleVisible: !(toss && u > 0.47 && u < 0.6),
    happy: toss ? smooth(0.12, 0.2, u) * (1 - smooth(0.85, 1, u)) : 0,
    hop: toss ? pulse(0.48, 0.66, u) : 0,
    chompTime: (k + CHOMP_AT) * CYCLE,
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

function useFoxRig(url, idleUrl, targetHeight) {
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

    const midX = center.x;
    const hands = meshesOf(idle.scene)
      .filter((p) => p.center.y > -0.56 && p.center.y < -0.44 && Math.abs(p.center.x - midX) > 0.35)
      .map((p) => {
        const h = p.mesh.clone(true);
        p.mesh.matrixWorld.decompose(h.position, h.quaternion, h.scale);
        h.castShadow = true;
        root.add(h);
        return { mesh: h, left: p.center.x < midX };
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
    const ownPivot = (parent, mesh) => {
      const c = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3());
      const p = pivot(parent, c);
      p.attach(mesh);
      return p;
    };

    const neckPoint = toRig(RAW.neck);
    const head = pivot(rig, neckPoint);
    const headParts = parts.filter((p) => p.center.y > -0.05);
    headParts.forEach((p) => head.attach(p.mesh));
    const headBase = head.position.clone();

    const earParts = headParts.filter((p) => p.center.y > 0.35);
    const earLeft = pivot(head, toRig(RAW.earLeft));
    const earRight = pivot(head, toRig(RAW.earRight));
    earParts.forEach((p) => (p.center.x < midX ? earLeft : earRight).attach(p.mesh));

    const eyes = headParts
      .filter((p) => p.center.z > 0.25 && p.center.y > 0.2 && p.center.y < 0.3 && Math.abs(p.center.x - midX) > 0.1)
      .map((p) => ownPivot(head, p.mesh));

    const mouthGroup = pivot(head, toRig(RAW.mouth));
    mouthGroup.rotation.x = MOUTH_TILT;
    const mouth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshStandardMaterial({ color: "#5a1d1a", roughness: 0.7 }),
    );
    mouthGroup.add(mouth);

    const tailParts = parts.filter((p) => p.center.z < -0.2 && p.center.y > -0.85 && p.center.y < -0.5);
    const tail = pivot(rig, toRig(RAW.tail));
    tailParts.forEach((p) => tail.attach(p.mesh));

    const armFor = (left, shoulderRaw) => {
      const arm = pivot(rig, toRig(shoulderRaw));
      parts
        .filter((p) => p.center.y > -0.42 && p.center.y < -0.2 && p.size.y < 0.45 && (left ? p.center.x < midX - 0.15 : p.center.x > midX + 0.15))
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
      earLeft,
      earRight,
      eyes,
      mouth,
      tail,
      armLeft,
      armRight,
      restLeft: handRest(true),
      restRight: handRest(false),
      shoulderLeft: toRig(RAW.shoulderLeft),
      shoulderRight: toRig(RAW.shoulderRight),
      mouthOffset: toRig(RAW.mouth).sub(neckPoint),
    };
  }, [gltf, idle, targetHeight]);
}

function useBittenApple() {
  return useMemo(() => {
    const group = new THREE.Group();
    const centers = Array.from({ length: BITES }, (_, i) => {
      const a = (i / BITES) * Math.PI * 2;
      return new THREE.Vector3(Math.sin(a), (i % 2 ? 0.08 : -0.06), -Math.cos(a)).multiplyScalar(APPLE_R * 1.02);
    });
    const uniforms = {
      uBites: { value: centers },
      uBiteCount: { value: 0 },
      uBiteR: { value: APPLE_R * BITE_RADIUS },
      uFlesh: { value: new THREE.Color("#f7e3a8") },
    };

    const skin = new THREE.MeshStandardMaterial({ color: "#d9322b", roughness: 0.45, side: THREE.DoubleSide });
    skin.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vAppleLocal;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvAppleLocal = position;");
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
varying vec3 vAppleLocal;
uniform vec3 uBites[${BITES}];
uniform int uBiteCount;
uniform float uBiteR;
uniform vec3 uFlesh;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
for (int i = 0; i < ${BITES}; i++) {
  if (i < uBiteCount && distance(vAppleLocal, uBites[i]) < uBiteR) discard;
}
if (!gl_FrontFacing) diffuseColor.rgb = uFlesh;`,
        );
    };
    skin.customProgramCacheKey = () => "koda-bitten-apple";
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(APPLE_R, 40, 30), skin);
    fruit.castShadow = true;
    group.add(fruit);

    const core = new THREE.Mesh(
      new THREE.SphereGeometry(APPLE_R * 0.46, 24, 18),
      new THREE.MeshStandardMaterial({ color: "#f7e3a8", roughness: 0.85 }),
    );
    core.scale.set(1, 1.85, 1);
    group.add(core);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(APPLE_R * 0.06, APPLE_R * 0.08, APPLE_R * 0.5, 8),
      new THREE.MeshStandardMaterial({ color: "#5a3219", roughness: 0.8 }),
    );
    stem.position.y = APPLE_R * 1.05;
    stem.rotation.z = -0.15;
    group.add(stem);
    const leaf = new THREE.Mesh(
      new THREE.CircleGeometry(APPLE_R * 0.32, 14),
      new THREE.MeshStandardMaterial({ color: "#4f8c35", roughness: 0.7, side: THREE.DoubleSide }),
    );
    leaf.scale.set(1.7, 0.72, 1);
    leaf.position.set(APPLE_R * 0.3, APPLE_R * 1.1, 0);
    leaf.rotation.set(-0.25, 0.15, -0.45);
    group.add(leaf);

    const setBites = (count) => {
      uniforms.uBiteCount.value = count;
    };
    return { group, setBites };
  }, []);
}

const CRUMBS = 9;
const GRAVITY = -3.2;

function BiteCrumbs({ originRef }) {
  const refs = useRef([]);
  const origin = useMemo(() => new THREE.Vector3(), []);
  const seeds = useMemo(
    () =>
      Array.from({ length: CRUMBS }, (_, i) => {
        const a = (i / CRUMBS) * Math.PI * 1.7 - 0.35;
        return {
          vx: Math.cos(a) * (0.2 + ((i * 37) % 10) / 34),
          vy: 0.35 + ((i * 53) % 10) / 18,
          vz: 0.2 + ((i * 29) % 10) / 26,
          size: i % 3 === 2 ? 0.012 : 0.017 + ((i * 7) % 3) / 400,
          juice: i % 3 === 2,
          spin: 4 + ((i * 11) % 5) * 1.5,
        };
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = snackState(t);
    let tb = t - s.chompTime;
    if (tb < 0) tb += CYCLE;
    const fromToss = Math.floor((t - tb) / CYCLE) % CYCLES_PER_APPLE === BITES;
    if (originRef.current && tb < 0.02) origin.copy(originRef.current);
    refs.current.forEach((m, i) => {
      if (!m) return;
      const sd = seeds[i];
      const land = (sd.vy + Math.sqrt(sd.vy * sd.vy - 2 * GRAVITY * Math.max(0.01, origin.y - 0.01))) / -GRAVITY;
      const tt = Math.min(tb, land);
      m.position.set(origin.x + sd.vx * tt * 0.5, Math.max(0.01, origin.y + sd.vy * tt + 0.5 * GRAVITY * tt * tt), origin.z + sd.vz * tt * 0.5);
      if (tb < land) m.rotation.set(tb * sd.spin + i, tb * sd.spin * 0.7, i);
      const fade = 1 - smooth(1.2, 2.1, tb);
      m.scale.setScalar(sd.size * fade);
      m.visible = !fromToss && fade > 0.01;
    });
  });

  return (
    <group>
      {seeds.map((sd, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} castShadow>
          {sd.juice ? <sphereGeometry args={[1, 10, 8]} /> : <dodecahedronGeometry args={[1, 0]} />}
          <meshStandardMaterial
            color={sd.juice ? "#fff1b8" : i % 2 ? "#d9322b" : "#fff4d6"}
            roughness={0.7}
            transparent={sd.juice}
            opacity={sd.juice ? 0.85 : 1}
          />
        </mesh>
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
  } else if (kind === "leaf") {
    ctx.rotate(-0.6);
    const g = ctx.createLinearGradient(-40, 0, 40, 0);
    g.addColorStop(0, "#ffb347");
    g.addColorStop(1, "#e2622b");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.quadraticCurveTo(0, -30, 42, 0);
    ctx.quadraticCurveTo(0, 30, -42, 0);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,240,210,0.7)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.lineTo(38, 0);
    ctx.stroke();
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
        radius: 0.55 + ((i * 13) % 10) / 70,
        yBase: 1.4 + ((i * 29) % 10) / 22,
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

function FeedingFoxRig({ worldScale, idleModelPath, placement }) {
  const fox = useFoxRig(foxAsset.url, idleModelPath, LOCAL_REFERENCE_HEIGHT);
  const apple = useBittenApple();

  const bodyRef = useRef(null);
  const matteRef = useRef(null);
  const appleRef = useRef(null);
  const biteOrigin = useRef(new THREE.Vector3());

  useEffect(() => {
    if (placement && matteRef.current) makeMatte(matteRef.current);
  }, [placement]);

  const tmp = useMemo(
    () => ({
      mouth: new THREE.Vector3(),
      hold: new THREE.Vector3(),
      bite: new THREE.Vector3(),
      core: new THREE.Vector3(),
      grip: new THREE.Vector3(),
      v: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      toss0: new THREE.Vector3(),
      toss1: new THREE.Vector3(0.75, 0.02, -0.75),
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = snackState(t);
    const breathe = Math.sin(t * 1.6) * 0.015;

    if (bodyRef.current) {
      const sq = s.chewing * 0.03 + s.chomp * 0.04;
      const crouch = s.toss ? pulse(0.4, 0.5, s.u) + pulse(0.64, 0.72, s.u) * 0.6 : 0;
      bodyRef.current.scale.set(1 + sq + breathe * 0.5 + crouch * 0.05 - s.hop * 0.04, 1 - sq * 1.2 + breathe - crouch * 0.07 + s.hop * 0.07, 1 + sq + breathe * 0.5 + crouch * 0.05 - s.hop * 0.04);
      bodyRef.current.position.y = -sq * 0.3 + s.hop * 0.13;
      bodyRef.current.rotation.z = Math.sin(t * 1.3) * 0.02 + Math.sin(t * 7) * 0.05 * s.happy;
    }

    const head = fox.head;
    const lunge = s.reach * 0.025 + s.chomp * 0.02;
    head.position.copy(fox.headBase);
    head.position.z += lunge;
    const lookAtCore = s.toss ? smooth(0, 0.12, s.u) * (1 - smooth(0.15, 0.3, s.u)) : 0;
    const followToss = s.toss ? pulse(0.15, 0.5, s.u) : 0;
    head.rotation.set(s.reach * 0.05 + s.chomp * 0.1 - s.tug * 0.08 + s.chewing * 0.03 + lookAtCore * 0.15, followToss * 0.5, Math.sin(t * 1.1) * 0.03 + Math.sin(t * 6) * 0.05 * s.happy);
    const puff = s.chewing * 0.035;
    head.scale.set(1 + puff, 1 - puff * 0.4, 1 + puff * 0.4);
    head.updateMatrix();

    fox.mouth.visible = s.open > 0.02;
    fox.mouth.scale.set(0.025 + s.open * 0.03, 0.002 + s.open * 0.04, 0.012);
    fox.eyes.forEach((e) => e.scale.set(1, 1 - s.chomp * 0.4 - s.chewing * 0.12, 1));

    const twitchL = Math.pow(Math.max(0, Math.sin(t * 0.9)), 22);
    const twitchR = Math.pow(Math.max(0, Math.sin(t * 0.9 + 2.3)), 22);
    fox.earLeft.rotation.z = s.chewing * 0.05 + s.chomp * 0.12 + twitchL * 0.3 + Math.sin(t * 6) * 0.08 * s.happy;
    fox.earRight.rotation.z = -(s.chewing * 0.05 + s.chomp * 0.12 + twitchR * 0.3) - Math.sin(t * 6 + 1) * 0.08 * s.happy;
    fox.tail.rotation.y = Math.sin(t * (3 + s.happy * 5)) * (0.18 + s.happy * 0.25 + s.chewing * 0.06);
    fox.tail.rotation.x = -0.05 - s.hop * 0.25;

    tmp.mouth.copy(fox.mouthOffset).applyMatrix4(head.matrix);
    tmp.bite.copy(tmp.mouth).add(tmp.v.set(0, -0.03, APPLE_R * 0.75));
    tmp.hold.copy(tmp.mouth).add(tmp.v.set(0, -0.32, APPLE_R + 0.14));
    const near = s.toss ? 0 : s.reach * (1 - 0.3 * s.tug);
    tmp.core.lerpVectors(tmp.hold, tmp.bite, near);
    tmp.core.y += s.chewing * 0.01 + (s.toss ? lookAtCore * 0.08 : 0);

    if (s.toss && s.flight > 0 && s.u < 0.6) {
      tmp.toss0.copy(tmp.hold);
      tmp.core.lerpVectors(tmp.toss0, tmp.toss1, s.flight);
      tmp.core.y += Math.sin(s.flight * Math.PI) * 0.75;
    }

    if (appleRef.current) {
      const a = appleRef.current;
      a.visible = s.appleVisible;
      a.position.copy(tmp.core);
      const spin = s.toss ? s.flight * 9 : 0;
      a.rotation.set(Math.sin(t * 1.7) * 0.05 + spin, -(s.turn / BITES) * Math.PI * 2 + Math.sin(t * 1.3) * 0.05, spin * 0.6);
      a.scale.setScalar(Math.max(0.001, s.grow * (s.toss && s.flight > 0 && s.u < 0.6 ? 1 - s.flight * 0.3 : 1)));
      apple.setBites(s.bitesDone);
      biteOrigin.current.copy(tmp.bite);
    }

    const holding = s.toss ? 1 - pulse(0.1, 0.5, s.u) : 1;
    const arms = [
      [fox.armLeft, fox.shoulderLeft, fox.restLeft, -1],
      [fox.armRight, fox.shoulderRight, fox.restRight, 1],
    ];
    arms.forEach(([arm, shoulder, rest, side]) => {
      tmp.grip.copy(tmp.core).add(tmp.v.set(side * (APPLE_R + 0.07), -0.03, -0.02));
      if (s.toss && s.u < 0.6) tmp.grip.set(side * 0.55, 1.05, 0.25);
      tmp.v.copy(tmp.grip).sub(shoulder).normalize();
      tmp.q.setFromUnitVectors(rest, tmp.v);
      arm.quaternion.identity().slerp(tmp.q, 0.92 * THREE.MathUtils.clamp(holding + (s.toss ? 0.5 : 0), 0, 1));
      arm.rotation.z += side * Math.sin(t * 10) * 0.12 * s.happy;
    });
  });

  const content = (
    <group ref={bodyRef}>
      <primitive object={fox.rig} />
      <group ref={appleRef}>
        <primitive object={apple.group} />
      </group>
      <BiteCrumbs originRef={biteOrigin} />
      <FloatSymbols />
    </group>
  );

  if (placement) {
    const { homePosition, offset, scale, yaw = 0, lean = 0 } = placement;
    const { center, minY, k } = fox.norm;
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
  (typeof window !== "undefined" && window.__idlePlacement?.fox?.modelPath) || IDLE_MODEL_FALLBACK;

export default function FeedingFox({ homePosition = [0, 0], scale = 1, referenceHeight = 1, placement, idleModelPath: idlePathProp }) {
  const idleModelPath = useMemo(() => idlePathProp || idleModelPathFromHabitat(), [idlePathProp]);
  const worldScale = (referenceHeight * scale) / LOCAL_REFERENCE_HEIGHT;
  if (placement) {
    return (
      <Suspense fallback={null}>
        <FeedingFoxRig placement={placement} idleModelPath={idleModelPath} />
      </Suspense>
    );
  }
  return (
    <group position={[homePosition[0], 0, homePosition[1]]}>
      <Suspense fallback={null}>
        <FeedingFoxRig worldScale={worldScale} idleModelPath={idleModelPath} />
      </Suspense>
    </group>
  );
}

useGLTF.preload(foxAsset.url);