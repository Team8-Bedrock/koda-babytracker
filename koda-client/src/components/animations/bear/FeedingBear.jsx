import { Suspense, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const LOCAL_REFERENCE_HEIGHT = 1.6;
const bearAsset = { url: "/models/characters/bear/feeding.glb" };

const PARTS = {
  bottle: [3, 5, 6, 7, 9],
  paws: [1, 11],
  head: [44, 46, 48, 58, 60],
  earLeft: [50, 54],
  earRight: [52, 56],
  cape: [26],
};

const NIPPLE = new THREE.Vector3(0.055, 0.855, 0.195);
const NECK = new THREE.Vector3(0, 0.84, -0.05);
const EAR_LEFT = new THREE.Vector3(-0.24, 1.2, -0.1);
const EAR_RIGHT = new THREE.Vector3(0.26, 1.22, -0.08);
const CAPE_TOP = new THREE.Vector3(0, 0.87, -0.2);
const MOUTH_CORNER = [-0.12, 0.84, 0.26];

const BOTTLE_DIR = new THREE.Vector3(0.32, -0.2, 0.17).normalize();
const BOTTLE_TILT_AXIS = new THREE.Vector3().crossVectors(BOTTLE_DIR, new THREE.Vector3(0, 1, 0)).normalize();

const SUCK_SPEED = 6;
const CYCLE = 16;
const DRINK = 12.5;
const TILT_MAX = 0.32;
const MATTE_ROUGHNESS = 0.92;

const smooth = (a, b, x) => {
  const k = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};

function useBearRig(url, targetHeight) {
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
    const matteCache = new Map();
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      const toMatte = (m) => {
        if (!matteCache.has(m)) {
          const mm = m.clone();
          mm.roughness = MATTE_ROUGHNESS;
          mm.metalness = 0;
          if ("envMapIntensity" in mm) mm.envMapIntensity = 0.5;
          if ("clearcoat" in mm) mm.clearcoat = 0;
          if ("specularIntensity" in mm) mm.specularIntensity = 0.3;
          matteCache.set(m, mm);
        }
        return matteCache.get(m);
      };
      o.material = Array.isArray(o.material) ? o.material.map(toMatte) : toMatte(o.material);
    });
    const scaled = new THREE.Group();
    scaled.add(root);
    scaled.scale.setScalar(targetHeight / (size.y || 1));

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

    const head = pivot(rig, NECK);
    take(head, PARTS.head);

    const earLeft = pivot(head, EAR_LEFT);
    take(earLeft, PARTS.earLeft);
    const earRight = pivot(head, EAR_RIGHT);
    take(earRight, PARTS.earRight);

    const bottle = pivot(head, NIPPLE);
    take(bottle, PARTS.bottle);
    const bottleBase = bottle.position.clone();

    const paws = PARTS.paws
      .map((id) => {
        const o = byNode.get(id);
        if (!o) return null;
        const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());
        const p = pivot(bottle, c);
        p.attach(o);
        return p;
      })
      .filter(Boolean);

    const cape = pivot(rig, CAPE_TOP);
    take(cape, PARTS.cape);

    const norm = { center: center.clone(), minY: box.min.y, k: targetHeight / (size.y || 1) };
    return { rig, norm, head, earLeft, earRight, bottle, bottleBase, paws, cape };
  }, [gltf, targetHeight]);
}

function makeMilkBubbleTexture() {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(128, 128, 30, 128, 128, 120);
  g.addColorStop(0, "rgba(255,255,255,0.25)");
  g.addColorStop(0.8, "rgba(240,248,255,0.45)");
  g.addColorStop(1, "rgba(190,215,235,0.85)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.ellipse(92, 82, 22, 13, -0.6, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function MilkBubbles({ activity }) {
  const texture = useMemo(() => makeMilkBubbleTexture(), []);
  const refs = useRef([]);
  const seeds = useMemo(() => [0, 0.8, 1.6, 2.4, 3.2], []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const on = activity.current.drink;
    refs.current.forEach((sprite, i) => {
      if (!sprite) return;
      const life = ((t + seeds[i]) % 4) / 4;
      const fade = Math.sin(life * Math.PI) * on;
      sprite.position.set(
        MOUTH_CORNER[0] - life * 0.22 + Math.sin((t + seeds[i]) * 1.6 + i) * 0.04,
        MOUTH_CORNER[1] + 0.06 + life * 0.45,
        MOUTH_CORNER[2] + 0.04 + Math.cos((t + seeds[i]) * 1.1 + i) * 0.04,
      );
      sprite.material.opacity = THREE.MathUtils.lerp(sprite.material.opacity, fade * 0.85, 0.15);
      sprite.scale.setScalar((0.035 + life * 0.05) * (1 + (i % 2) * 0.35));
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

  if (kind === "drop") {
    const g = ctx.createLinearGradient(-30, -40, 30, 40);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#cfe6f7");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, -44);
    ctx.bezierCurveTo(10, -24, 32, -2, 32, 16);
    ctx.arc(0, 16, 32, 0, Math.PI);
    ctx.bezierCurveTo(-32, -2, -10, -24, 0, -44);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(150,190,220,0.8)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.ellipse(-12, 14, 6, 11, -0.4, 0, Math.PI * 2);
    ctx.fill();
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

function FloatSymbols({ activity }) {
  const textures = useMemo(() => ["drop", "sparkle", "heart"].map(makeSymbolTexture), []);
  const refs = useRef([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: SYMBOL_COUNT }, (_, i) => ({
        angle0: (i / SYMBOL_COUNT) * Math.PI * 2,
        radius: 0.42 + ((i * 13) % 10) / 70,
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
    const { drink, happy } = activity.current;
    refs.current.forEach((s, i) => {
      if (!s) return;
      const seed = seeds[i];
      const life = ((t * seed.speed + seed.phase) % 3.4) / 3.4;
      const boost = seed.kind === 2 ? happy * 0.4 : 0;
      const fade = Math.sin(life * Math.PI) * Math.max(drink, happy);
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

const DRIP_COUNT = 2;

function MilkDrips({ activity }) {
  const refs = useRef([]);
  const seeds = useMemo(
    () =>
      Array.from({ length: DRIP_COUNT }, (_, i) => ({
        offset: i * 0.5,
        period: 3.4 + i * 0.9,
        driftX: (i - 0.5) * 0.03,
      })),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const on = activity.current.drink;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const seed = seeds[i];
      const life = ((t / seed.period + seed.offset) % 1 + 1) % 1;
      let x = MOUTH_CORNER[0];
      let y = MOUTH_CORNER[1];
      const z = MOUTH_CORNER[2];
      let sx = 0.014;
      let sy = 0.014;
      let opacity = 1;

      if (life < 0.2) {
        const k = life / 0.2;
        sx = sy = 0.004 + k * 0.01;
        y -= k * 0.015;
      } else if (life < 0.45) {
        const k = (life - 0.2) / 0.25;
        y = MOUTH_CORNER[1] - 0.015 - k * k * (MOUTH_CORNER[1] - 0.03);
        x += seed.driftX * k;
        sy = 0.018;
        sx = 0.012;
      } else if (life < 0.8) {
        const k = (life - 0.45) / 0.35;
        y = 0.006;
        x += seed.driftX;
        sx = 0.02 + k * 0.012;
        sy = 0.004;
        opacity = 1 - k;
      } else {
        opacity = 0;
      }

      m.visible = on > 0.05 && opacity > 0.01;
      m.position.set(x, y, z);
      m.scale.set(sx, sy, sx);
      m.material.opacity = opacity * on;
    });
  });

  return (
    <group>
      {seeds.map((_, i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <sphereGeometry args={[1, 12, 10]} />
          <meshStandardMaterial color="#fbfbf6" roughness={0.85} transparent />
        </mesh>
      ))}
    </group>
  );
}

function FeedingBearRig({ worldScale, placement }) {
  const bear = useBearRig(bearAsset.url, LOCAL_REFERENCE_HEIGHT);
  const bodyRef = useRef(null);
  const symbolsRef = useRef(null);
  const activity = useRef({ drink: 1, happy: 0 });
  const tmpQ = useMemo(() => new THREE.Quaternion(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const ct = t % CYCLE;

    const drink = smooth(0, 0.8, ct) * (1 - smooth(DRINK - 0.6, DRINK, ct));
    const happy = smooth(DRINK - 0.3, DRINK + 0.5, ct) * (1 - smooth(CYCLE - 1.2, CYCLE, ct));
    activity.current.drink = drink;
    activity.current.happy = happy;

    let suck = Math.sin(t * SUCK_SPEED) * 0.5 + 0.5;
    suck = suck * suck * (3 - 2 * suck);
    const sk = suck * drink;

    const progress = ct < DRINK ? smooth(0, DRINK, ct) : 1 - smooth(DRINK, CYCLE, ct);
    const tilt = progress * TILT_MAX;

    const breathe = Math.sin(t * 1.6) * 0.015;
    const wiggle = Math.sin(t * 5.2) * happy;
    const hop = ct > DRINK && ct < DRINK + 0.55 ? Math.sin(((ct - DRINK) / 0.55) * Math.PI) : 0;

    if (bodyRef.current) {
      bodyRef.current.scale.set(
        1 + sk * 0.04 + breathe * 0.5 - hop * 0.03,
        1 - sk * 0.05 + breathe + hop * 0.05,
        1 + sk * 0.04 + breathe * 0.5 - hop * 0.03,
      );
      bodyRef.current.position.y = -sk * 0.025 + hop * 0.05;
      bodyRef.current.rotation.z = Math.sin(t * SUCK_SPEED * 0.5) * 0.02 * drink + wiggle * 0.07;
    }

    bear.head.rotation.x = sk * 0.045 - progress * 0.07;
    bear.head.rotation.z = Math.sin(t * 1.1) * 0.025 + wiggle * 0.05;

    const twitchL = Math.pow(Math.max(0, Math.sin(t * 0.83)), 24);
    const twitchR = Math.pow(Math.max(0, Math.sin(t * 0.83 + 2.1)), 24);
    bear.earLeft.rotation.z = sk * 0.06 + twitchL * 0.28 + wiggle * 0.12;
    bear.earRight.rotation.z = -(sk * 0.06 + twitchR * 0.28) + wiggle * 0.12;

    const push = sk * 0.02 - happy * 0.025;
    bear.bottle.position.copy(bear.bottleBase).addScaledVector(BOTTLE_DIR, -push);
    tmpQ.setFromAxisAngle(BOTTLE_TILT_AXIS, tilt - sk * 0.035 + wiggle * 0.04);
    bear.bottle.quaternion.copy(tmpQ);

    bear.paws.forEach((p, i) => {
      const squeeze = Math.sin(t * SUCK_SPEED - i * 0.9) * 0.5 + 0.5;
      p.scale.setScalar(1 + squeeze * 0.06 * drink + Math.abs(wiggle) * 0.03);
    });

    bear.cape.rotation.x = 0.03 + sk * 0.03 + Math.sin(t * 1.6) * 0.02 + hop * 0.08;
    bear.cape.rotation.z = -Math.sin(t * 5.2 - 0.6) * happy * 0.08;

    if (symbolsRef.current) {
      symbolsRef.current.position.y = Math.sin(t * 1.4) * 0.03;
    }
  });

  const content = (
    <>
      <group ref={bodyRef}>
        <primitive object={bear.rig} />
        <MilkBubbles activity={activity} />
        <group ref={symbolsRef}>
          <FloatSymbols activity={activity} />
        </group>
      </group>
      <MilkDrips activity={activity} />
    </>
  );

  if (placement) {
    const { homePosition, offset, scale, yaw = 0, lean = 0 } = placement;
    const { center, minY, k } = bear.norm;
    const feetY = offset[1] + scale * minY;
    return (
      <group position={[homePosition[0], feetY, homePosition[1]]} rotation={[-lean, yaw, 0]}>
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

export default function FeedingBear({ homePosition = [0, 0], scale = 1, referenceHeight = 1, placement }) {
  const worldScale = (referenceHeight * scale) / LOCAL_REFERENCE_HEIGHT;
  if (placement) {
    return (
      <Suspense fallback={null}>
        <FeedingBearRig placement={placement} />
      </Suspense>
    );
  }
  return (
    <group position={[homePosition[0], 0, homePosition[1]]}>
      <Suspense fallback={null}>
        <FeedingBearRig worldScale={worldScale} />
      </Suspense>
    </group>
  );
}

useGLTF.preload(bearAsset.url);
