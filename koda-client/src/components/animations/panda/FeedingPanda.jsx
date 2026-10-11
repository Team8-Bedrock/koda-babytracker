import { Suspense, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LOCAL_REFERENCE_HEIGHT = 1.6;
const pandaAsset = { url: "/models/characters/panda/feeding.glb" };
const koalaAsset = { url: "/models/characters/koala/koala.glb" };

const PARTS = {
  head: [1, 31, 34],
  eyes: [32, 33],
  nose: [22],
  earLeft: [24, 28],
  earRight: [26, 30],
  armLeft: [3, 5],
  armRight: [7, 9],
  bow: [36, 38],
};

const NECK = new THREE.Vector3(0, 0.86, 0);
const MOUTH = new THREE.Vector3(0, 0.985, 0.279);
const BITE_POINT = new THREE.Vector3(0.03, 0.985, 0.3);
const NOSE = new THREE.Vector3(0, 1.065, 0.31);
const EAR_LEFT = new THREE.Vector3(-0.24, 1.24, -0.12);
const EAR_RIGHT = new THREE.Vector3(0.25, 1.25, -0.08);
const SHOULDER_LEFT = new THREE.Vector3(-0.2, 0.86, -0.02);
const SHOULDER_RIGHT = new THREE.Vector3(0.17, 0.86, -0.02);
const ARM_REST_LEFT = new THREE.Vector3(-0.11, -0.12, 0.085).normalize();
const ARM_REST_RIGHT = new THREE.Vector3(0.1, -0.12, 0.085).normalize();
const BOW = new THREE.Vector3(0.02, 0.9, 0.25);
const FLOOR = 0.015;

const STICK_DIR = new THREE.Vector3(0.35, -0.75, 0.55).normalize();
const STICK_QUAT = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), STICK_DIR);
const STICK_LENGTH = LOCAL_REFERENCE_HEIGHT * 0.28;
const PAW_SPREAD = 0.045;

const BITE_TIME = 2.6;
const BITES_PER_STICK = 6;
const CHOMP_AT = 0.22;
const CHEW_START = 0.4;
const CHEWS = 4;

const smooth = (a, b, x) => {
  const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};
const easeOutBack = (k) => {
  const c = 2.2;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
};
const remainingBefore = (n) => (n >= BITES_PER_STICK ? 0 : 1 - n * 0.14);

function mealState(t) {
  const k = Math.floor(t / BITE_TIME);
  const u = (t % BITE_TIME) / BITE_TIME;
  const n = k % BITES_PER_STICK;
  const lastBite = n === BITES_PER_STICK - 1;

  const reach = smooth(0, CHOMP_AT, u) * (1 - smooth(CHOMP_AT + 0.03, CHEW_START, u));
  const chomp = u > CHOMP_AT - 0.03 && u < CHOMP_AT + 0.08 ? Math.sin(((u - CHOMP_AT + 0.03) / 0.11) * Math.PI) : 0;
  const tug = u > CHOMP_AT + 0.04 && u < CHEW_START ? Math.sin(((u - CHOMP_AT - 0.04) / (CHEW_START - CHOMP_AT - 0.04)) * Math.PI) : 0;
  const chewU = (u - CHEW_START) / (1 - CHEW_START);
  const chewing = u > CHEW_START ? 0.5 - 0.5 * Math.cos(chewU * Math.PI * 2 * CHEWS) : 0;
  const mouthFull = smooth(CHOMP_AT, CHOMP_AT + 0.05, u) * (1 - smooth(0.85, 1, u));

  let len = THREE.MathUtils.lerp(remainingBefore(n), remainingBefore(n + 1), smooth(CHOMP_AT - 0.01, CHOMP_AT + 0.03, u));
  const grow = n === 0 ? easeOutBack(smooth(0, 0.14, u)) : 1;
  len *= grow;

  const open = Math.max(smooth(0.05, CHOMP_AT - 0.02, u) * (1 - smooth(CHOMP_AT - 0.02, CHOMP_AT + 0.01, u)), chewing * 0.4);

  return { u, n, lastBite, reach, chomp, tug, chewing, mouthFull, len, grow, open, chompTime: k * BITE_TIME + CHOMP_AT * BITE_TIME };
}

function usePaws() {
  const koala = useGLTF(koalaAsset.url);
  return useMemo(() => {
    return [koala.scene.children[1], koala.scene.children[2]].filter(Boolean).map((paw) => {
      const p = paw.clone(true);
      p.traverse((child) => {
        if (!child.isMesh) return;
        const m = child.material.clone();
        m.color.setRGB(0.005, 0.005, 0.005);
        m.roughness = 0.48;
        child.material = m;
      });
      return p;
    });
  }, [koala]);
}

function usePandaRig(url, targetHeight) {
  const gltf = useGLTF(url);
  return useMemo(() => {
    const src = gltf.scene;
    const root = src.clone(true);

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
    const norm = { center: center.clone(), minY: box.min.y, k };

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

    const head = pivot(rig, NECK);
    take(head, PARTS.head);
    const headBase = head.position.clone();

    const eyes = PARTS.eyes
      .map((id) => {
        const c = centerOf(id);
        if (!c) return null;
        const p = pivot(head, c);
        p.attach(byNode.get(id));
        return p;
      })
      .filter(Boolean);

    const nose = pivot(head, NOSE);
    take(nose, PARTS.nose);
    const noseBaseY = nose.position.y;

    const earLeft = pivot(head, EAR_LEFT);
    take(earLeft, PARTS.earLeft);
    const earRight = pivot(head, EAR_RIGHT);
    take(earRight, PARTS.earRight);

    const mouth = pivot(head, MOUTH);
    const mouthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 14),
      new THREE.MeshStandardMaterial({ color: "#4a1d24", roughness: 0.6 }),
    );
    mouth.add(mouthMesh);

    const armLeft = pivot(rig, SHOULDER_LEFT);
    take(armLeft, PARTS.armLeft);
    const armRight = pivot(rig, SHOULDER_RIGHT);
    take(armRight, PARTS.armRight);

    const bow = pivot(rig, BOW);
    take(bow, PARTS.bow);

    return { rig, scaled, norm, head, headBase, eyes, nose, earLeft, earRight, mouth: mouthMesh, noseBaseY, armLeft, armRight, bow };
  }, [gltf, targetHeight]);
}

function makeBubbleTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, 256, 256);
  const g = ctx.createRadialGradient(128, 128, 40, 128, 128, 120);
  g.addColorStop(0, "rgba(0,0,0,0.08)");
  g.addColorStop(0.85, "rgba(25,25,30,0.22)");
  g.addColorStop(1, "rgba(10,10,10,0.7)");
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

function Bubbles({ chewing }) {
  const texture = useMemo(() => makeBubbleTexture(), []);
  const refs = useRef([]);
  const seeds = useMemo(() => [0, 0.9, 1.8, 2.7], []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((sprite, i) => {
      if (!sprite) return;
      const life = ((t + seeds[i]) % 4.2) / 4.2;
      const fade = chewing ? Math.sin(life * Math.PI) : 0;
      sprite.position.y = 0.02 + life * 0.4;
      sprite.position.x = Math.sin((t + seeds[i]) * 1.4 + i) * 0.18;
      sprite.position.z = Math.cos((t + seeds[i]) * 1.0 + i) * 0.08;
      sprite.material.opacity = THREE.MathUtils.lerp(sprite.material.opacity, fade * 0.8, 0.15);
      const s = (0.06 + life * 0.07) * (1 + (i % 2) * 0.35);
      sprite.scale.setScalar(s);
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
  ctx.clearRect(0, 0, 128, 128);
  ctx.translate(64, 64);

  if (kind === "leaf") {
    ctx.rotate(-0.55);
    const g = ctx.createLinearGradient(-42, -16, 42, 16);
    g.addColorStop(0, "#8fdd63");
    g.addColorStop(1, "#3d9a4e");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, 42, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-38, 0);
    ctx.lineTo(38, 0);
    ctx.stroke();
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

function FloatSymbols({ chewing }) {
  const textures = useMemo(() => ["leaf", "sparkle", "heart"].map(makeSymbolTexture), []);
  const refs = useRef([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: SYMBOL_COUNT }, (_, i) => ({
        angle0: (i / SYMBOL_COUNT) * Math.PI * 2,
        radius: 0.4 + ((i * 13) % 10) / 70,
        yBase: 1.28 + ((i * 29) % 10) / 22,
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
    refs.current.forEach((s, i) => {
      if (!s) return;
      const seed = seeds[i];
      const life = ((t * seed.speed + seed.phase) % 3.4) / 3.4;
      const fade = chewing ? Math.sin(life * Math.PI) : 0;
      const a = seed.angle0 + t * 0.25;
      s.position.set(
        Math.cos(a) * seed.radius,
        seed.yBase + Math.sin(life * Math.PI * 2) * seed.bob + life * 0.1,
        Math.sin(a) * seed.radius * 0.55,
      );
      s.material.opacity = THREE.MathUtils.lerp(s.material.opacity, fade * 0.9, 0.12);
      s.material.rotation = Math.sin(t * 1.2 + i) * 0.25;
      s.scale.setScalar(seed.size * (0.8 + fade * 0.4));
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

const BURST_COUNT = 10;
const GRAVITY = -3.2;

function BiteBurst() {
  const refs = useRef([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: BURST_COUNT }, (_, i) => {
        const a = (i / BURST_COUNT) * Math.PI * 1.6 - 0.3;
        return {
          chunk: i < 4,
          vx: Math.cos(a) * (0.25 + ((i * 37) % 10) / 30),
          vy: 0.35 + ((i * 53) % 10) / 16,
          vz: 0.25 + ((i * 29) % 10) / 22,
          size: i < 4 ? 0.016 + ((i * 7) % 3) / 300 : 0.008 + ((i * 17) % 10) / 900,
          spin: 4 + ((i * 11) % 5) * 1.5,
        };
      }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const meal = mealState(t);
    let tb = t - meal.chompTime;
    if (tb < 0) tb += BITE_TIME;
    const lastWasStub = (Math.floor((t - tb) / BITE_TIME) % BITES_PER_STICK) === BITES_PER_STICK - 1;

    refs.current.forEach((m, i) => {
      if (!m) return;
      const s = seeds[i];
      const y0 = BITE_POINT.y;
      const land = (s.vy + Math.sqrt(s.vy * s.vy - 2 * GRAVITY * (y0 - FLOOR))) / -GRAVITY;
      const tt = Math.min(tb, land);
      m.position.set(
        BITE_POINT.x + s.vx * tt * 0.6,
        Math.max(FLOOR, y0 + s.vy * tt + 0.5 * GRAVITY * tt * tt),
        BITE_POINT.z + s.vz * tt * 0.6,
      );
      if (tb < land) m.rotation.set(tb * s.spin + i, tb * s.spin * 0.7, i);
      const shrink = 1 - smooth(1.4, 2.3, tb);
      m.scale.setScalar(s.size * shrink);
      m.visible = shrink > 0.01 && !(lastWasStub && s.chunk);
    });
  });

  return (
    <group>
      {seeds.map((s, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)} castShadow>
          {s.chunk ? <cylinderGeometry args={[1, 1, 1.6, 8]} /> : <dodecahedronGeometry args={[1, 0]} />}
          <meshStandardMaterial color={s.chunk ? "#3c9a45" : i % 3 === 0 ? "#cfe38a" : "#7a9a52"} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function useBambooStick(targetHeight) {
  return useMemo(() => {
    const group = new THREE.Group();
    const segments = 4;
    const segmentHeight = targetHeight / segments;
    const radius = targetHeight * 0.085;
    const barkMat = new THREE.MeshStandardMaterial({ color: "#2f8f3a", roughness: 0.45 });
    const nodeMat = new THREE.MeshStandardMaterial({ color: "#b8e46a", roughness: 0.6 });

    for (let i = 0; i < segments; i++) {
      const cyl = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, segmentHeight * 0.86, 10),
        barkMat,
      );
      cyl.position.y = i * segmentHeight + segmentHeight * 0.43;
      cyl.castShadow = true;
      cyl.receiveShadow = true;
      group.add(cyl);

      if (i > 0) {
        const node = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.08, radius * 0.22, 6, 12), nodeMat);
        node.rotation.x = Math.PI / 2;
        node.position.y = i * segmentHeight;
        node.castShadow = true;
        group.add(node);
      }
    }

    const leafMat = new THREE.MeshStandardMaterial({ color: "#7fd34e", roughness: 0.6, side: THREE.DoubleSide });
    for (let i = 0; i < 2; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.6, targetHeight * 0.32, 4), leafMat);
      leaf.position.y = targetHeight * (0.08 + i * 0.06);
      leaf.rotation.z = i === 0 ? 0.9 : -0.7;
      leaf.rotation.x = 0.3;
      leaf.scale.set(0.4, 1, 0.12);
      group.add(leaf);
    }

    group.position.y = -targetHeight;
    const outer = new THREE.Group();
    outer.add(group);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.92, radius * 0.92, radius * 0.25, 10),
      new THREE.MeshStandardMaterial({ color: "#e9f5b8", roughness: 0.7 }),
    );
    cap.position.y = -radius * 0.1;

    return { stick: outer, cap, radius };
  }, [targetHeight]);
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

function FeedingPandaRig({ worldScale, placement }) {
  const matteRef = useRef(null);
  useEffect(() => {
    if (placement && matteRef.current) makeMatte(matteRef.current);
  }, [placement]);
  const panda = usePandaRig(pandaAsset.url, LOCAL_REFERENCE_HEIGHT);
  const paws = usePaws();
  const pawGroups = useMemo(() => {
    const root = panda.scaled.children[0];
    const scale = panda.scaled.scale.x;
    return paws.map((p) => {
      const holder = new THREE.Group();
      const inner = new THREE.Group();
      inner.add(p.clone(true));
      inner.position.copy(root.position);
      const box = new THREE.Box3().setFromObject(inner);
      const c = new THREE.Vector3();
      box.getCenter(c);
      inner.position.sub(c);
      holder.add(inner);
      holder.scale.setScalar(scale * 0.72);
      return holder;
    });
  }, [panda, paws]);
  const leftPawRef = useRef(null);
  const rightPawRef = useRef(null);
  const bamboo = useBambooStick(STICK_LENGTH);

  const pandaRef = useRef(null);
  const bambooRef = useRef(null);
  const stickRef = useRef(null);
  const capRef = useRef(null);
  const symbolsRef = useRef(null);
  const chewing = true;

  const tmp = useMemo(
    () => ({
      q: new THREE.Quaternion(),
      q2: new THREE.Quaternion(),
      e: new THREE.Euler(),
      v: new THREE.Vector3(),
      mouth: new THREE.Vector3(),
      paw: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const m = mealState(t);
    const breathe = Math.sin(t * 1.6) * 0.015;
    const fullCheeks = m.lastBite ? 1.8 : 1;

    if (pandaRef.current) {
      const sq = m.chewing * 0.035 + m.chomp * 0.05;
      pandaRef.current.scale.set(1 + sq + breathe * 0.5, 1 - sq * 1.2 + breathe, 1 + sq + breathe * 0.5);
      pandaRef.current.position.y = -sq * 0.4;
      pandaRef.current.rotation.z = Math.sin(t * 1.3) * 0.02 + m.tug * 0.03;
    }

    const head = panda.head;
    head.rotation.x = m.reach * 0.06 + m.chomp * 0.1 - m.tug * 0.07 + m.chewing * 0.03;
    head.rotation.z = Math.sin(t * 1.1) * 0.03 - m.tug * 0.05;
    head.rotation.y = -m.reach * 0.06;
    const lunge = m.reach * 0.02 + m.chomp * 0.015;
    head.position.copy(panda.headBase);
    head.position.z += lunge;
    const puff = (m.chewing * 0.04 + m.mouthFull * 0.015) * fullCheeks;
    head.scale.set(1 + puff, 1 - puff * 0.5, 1 + puff * 0.5);

    const open = m.open;
    panda.mouth.scale.set(0.034 + open * 0.008, 0.005 + open * 0.026, 0.016);
    panda.nose.position.y = panda.noseBaseY - m.chewing * 0.012 + open * 0.006;
    panda.eyes.forEach((eye) => eye.scale.set(1, 1 - m.chomp * 0.45 - m.chewing * 0.12, 1));

    const flop = m.chewing * 0.07 + m.chomp * 0.18;
    panda.earLeft.rotation.z = flop + Math.sin(t * 2.1) * 0.02;
    panda.earRight.rotation.z = -flop - Math.sin(t * 2.1 + 1) * 0.02;
    panda.bow.rotation.z = Math.sin(t * 3 + 0.5) * 0.04 + m.chomp * 0.08;

    tmp.mouth.copy(BITE_POINT).sub(NECK).applyEuler(head.rotation).add(NECK).add(tmp.v.set(0, 0, lunge));

    const away = 0.085 * (1 - m.reach) + m.tug * 0.03 - m.chomp * 0.008;
    if (bambooRef.current) {
      bambooRef.current.position.copy(tmp.mouth).addScaledVector(STICK_DIR, away);
      tmp.q2.setFromAxisAngle(tmp.v.set(1, 0, 0), m.tug * 0.12 + m.chewing * 0.03);
      bambooRef.current.quaternion.copy(tmp.q2).multiply(STICK_QUAT);
    }
    if (stickRef.current) {
      stickRef.current.visible = m.len > 0.01;
      stickRef.current.scale.set(Math.min(1, m.grow + 0.001), Math.max(m.len, 0.001), Math.min(1, m.grow + 0.001));
    }
    if (capRef.current) capRef.current.visible = m.len > 0.01 && !(m.n === 0 && m.u < CHOMP_AT);

    const lenWorld = m.len * STICK_LENGTH;
    const grips = [Math.max(0.1, lenWorld * 0.5), Math.max(0.14, lenWorld * 0.82)];
    const pawRefs = [leftPawRef, rightPawRef];
    pawRefs.forEach((ref, i) => {
      if (!ref.current) return;
      const side = i === 0 ? -1 : 1;
      ref.current.position.set(side * PAW_SPREAD, -grips[i], 0.02 + Math.sin(t * 7 + i) * 0.003);
    });

    const arms = [
      [panda.armLeft, SHOULDER_LEFT, ARM_REST_LEFT, -1, 0],
      [panda.armRight, SHOULDER_RIGHT, ARM_REST_RIGHT, 1, 1],
    ];
    arms.forEach(([arm, shoulder, rest, side, i]) => {
      tmp.paw.set(side * PAW_SPREAD, -grips[i], 0).applyQuaternion(bambooRef.current ? bambooRef.current.quaternion : STICK_QUAT);
      if (bambooRef.current) tmp.paw.add(bambooRef.current.position);
      tmp.v.copy(tmp.paw).sub(shoulder).normalize();
      tmp.q.setFromUnitVectors(rest, tmp.v);
      arm.quaternion.identity().slerp(tmp.q, 0.75);
    });

    if (symbolsRef.current) {
      symbolsRef.current.position.y = 1.25 + Math.sin(t * 1.4) * 0.03;
    }
  });

  const content = (
    <>
      <group ref={pandaRef}>
        <primitive object={panda.rig} />
        <group ref={symbolsRef}>
          <Bubbles chewing={chewing} />
        </group>
        <FloatSymbols chewing={chewing} />
        <group ref={bambooRef}>
          <group ref={stickRef}>
            <primitive object={bamboo.stick} />
          </group>
          <group ref={capRef}>
            <primitive object={bamboo.cap} />
          </group>
          <group ref={leftPawRef}><primitive object={pawGroups[0]} /></group>
          {pawGroups[1] && <group ref={rightPawRef}><primitive object={pawGroups[1]} /></group>}
        </group>
      </group>
      <BiteBurst />
    </>
  );

  if (placement) {
    const { homePosition, offset, scale, yaw = 0, lean = 0 } = placement;
    const { center, minY, k } = panda.norm;
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

export default function FeedingPanda({ homePosition = [0, 0], scale = 1, referenceHeight = 1, placement }) {
  const worldScale = (referenceHeight * scale) / LOCAL_REFERENCE_HEIGHT;
  if (placement) {
    return (
      <Suspense fallback={null}>
        <FeedingPandaRig placement={placement} />
      </Suspense>
    );
  }
  return (
    <group position={[homePosition[0], 0, homePosition[1]]}>
      <Suspense fallback={null}>
        <FeedingPandaRig worldScale={worldScale} />
      </Suspense>
    </group>
  );
}

useGLTF.preload(pandaAsset.url);
useGLTF.preload(koalaAsset.url);
