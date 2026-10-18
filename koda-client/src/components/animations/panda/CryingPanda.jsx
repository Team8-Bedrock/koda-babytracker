import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { aimArm, headPoint, getTexture, PandaMood } from "./pandaRig";

const CRYING_MODEL = "/models/characters/panda/crying.glb";
const STREAM_DROPS = 4;
const DROP_LIFE = 1.1;
const GRAVITY = -3;
const WAH_COUNT = 1;

const localTextures = new Map();

function localTexture(key, draw, width = 128, height = 128) {
  if (localTextures.has(key)) return localTextures.get(key);
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  ctx.translate(width / 2, height / 2);
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  localTextures.set(key, tex);
  return tex;
}

function getSquintTexture() {
  return localTexture("squint", (ctx) => {
    ctx.strokeStyle = "#2b1a12";
    ctx.lineWidth = 15;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-34, -30);
    ctx.lineTo(24, 0);
    ctx.lineTo(-34, 30);
    ctx.stroke();
  });
}

function getWahTexture() {
  return localTexture(
    "wah",
    (ctx) => {
      ctx.font = "900 92px 'Baloo 2', 'Nunito', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 18;
      ctx.strokeStyle = "#ffffff";
      ctx.strokeText("WAAH!", 0, 6);
      ctx.fillStyle = "#5fa8e6";
      ctx.fillText("WAAH!", 0, 6);
    },
    320,
    140,
  );
}

function getPuddleTexture() {
  return localTexture("puddle", (ctx) => {
    const g = ctx.createRadialGradient(-10, -8, 4, 0, 0, 62);
    g.addColorStop(0, "rgba(220,244,255,0.95)");
    g.addColorStop(0.7, "rgba(140,205,245,0.85)");
    g.addColorStop(1, "rgba(120,190,240,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    [[0, 0, 50], [-30, 10, 26], [28, 14, 24], [10, -22, 22]].forEach(([x, y, r]) => {
      ctx.moveTo(x + r, y);
      ctx.arc(x, y, r, 0, Math.PI * 2);
    });
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.beginPath();
    ctx.ellipse(-16, -14, 12, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function CryingRig({ rig }) {
  const bodyRef = useRef(null);
  const squintRefs = useRef([]);
  const dropRefs = useRef([]);
  const puddleRefs = useRef([]);
  const wahRefs = useRef([]);
  const started = useRef(null);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const top = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const squint = getSquintTexture();
  const tear = getTexture("tear");
  const wah = getWahTexture();
  const puddle = getPuddleTexture();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (started.current === null) started.current = t;
    const since = t - started.current;
    const wail = 0.5 + 0.5 * Math.sin(t * 1.8);
    const hicPhase = t % 3.4;
    const hic = hicPhase < 0.2 ? Math.sin((hicPhase / 0.2) * Math.PI) * 0.6 : 0;
    const stomp = Math.abs(Math.sin(t * 4));
    const rubbing = t % 6 < 3.2;

    if (bodyRef.current) {
      bodyRef.current.position.y = stomp * 0.015 + hic * 0.02;
      bodyRef.current.rotation.set(0, Math.sin(t * 1.2) * 0.05, Math.sin(t * 2.2) * 0.035);
      bodyRef.current.scale.set(1 + (1 - stomp) * 0.015, 1 - (1 - stomp) * 0.02 + hic * 0.02, 1 + (1 - stomp) * 0.015);
    }

    rig.head.position.copy(rig.headBase);
    rig.head.position.y += hic * 0.015;
    rig.head.rotation.set(-0.16 - wail * 0.06 + hic * 0.06, Math.sin(t * 1.2) * 0.05, Math.sin(t * 2.2) * 0.07);
    const puffUp = wail * 0.02 + hic * 0.02;
    rig.head.scale.set(1 + puffUp, 1 - puffUp * 0.5, 1 + puffUp);

    [rig.eyeLeft, rig.eyeRight].forEach((e, i) => {
      e.inner.forEach((g) => g.scale.set(1.2, 0.06, 1));
      e.patch.rotation.z = (i ? 0.3 : -0.3) + Math.sin(t * 14) * 0.015;
    });

    rig.earLeft.rotation.z = -0.1 + Math.sin(t * 6) * 0.015 * wail;
    rig.earRight.rotation.z = 0.1 - Math.sin(t * 6 + 1) * 0.015 * wail;
    rig.earLeft.rotation.x = rig.earRight.rotation.x = 0.1;

    rig.nose.scale.setScalar(1 + Math.max(0, Math.sin(t * 5)) * 0.06);

    rig.mouth.visible = true;
    const wobble = Math.sin(t * 16) * 0.002;
    rig.mouth.scale.set(0.038 + wail * 0.01 + wobble, 0.026 + wail * 0.018 + hic * 0.006 - wobble, 0.02);

    if (rubbing) {
      const rub = t * 6;
      [rig.eyeOffsetLeft, rig.eyeOffsetRight].forEach((offset, i) => {
        headPoint(rig, offset, target);
        target.x += Math.cos(rub + i * Math.PI) * 0.02;
        target.y += Math.sin(rub + i * Math.PI) * 0.02 - 0.02;
        target.z += 0.12;
        aimArm(i ? rig.armRight : rig.armLeft, i ? rig.shoulderRight : rig.shoulderLeft, i ? rig.restRight : rig.restLeft, target, 0.8);
      });
    } else {
      const flapL = Math.sin(t * 5);
      const flapR = Math.sin(t * 5 + Math.PI);
      headPoint(rig, rig.headTopOffset, top);
      target.set(top.x - 0.5, top.y - 0.25 + flapL * 0.18, top.z + 0.15);
      aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, target, 0.6);
      target.set(top.x + 0.5, top.y - 0.25 + flapR * 0.18, top.z + 0.15);
      aimArm(rig.armRight, rig.shoulderRight, rig.restRight, target, 0.6);
    }

    rig.legLeft.rotation.x = -Math.max(0, Math.sin(t * 4)) * 0.15;
    rig.legRight.rotation.x = -Math.max(0, Math.sin(t * 4 + Math.PI)) * 0.15;
    rig.bow.rotation.z = Math.sin(t * 5) * 0.04;

    [rig.eyeOffsetLeft, rig.eyeOffsetRight].forEach((offset, i) => {
      headPoint(rig, offset, eye);
      const sq = squintRefs.current[i];
      if (sq) {
        sq.position.set(eye.x, eye.y, eye.z + 0.06);
        sq.scale.setScalar(0.1 + hic * 0.01);
        sq.material.rotation = (i ? Math.PI : 0) + (i ? 0.12 : -0.12);
        sq.material.opacity = 1;
      }
      const side = i ? 1 : -1;
      for (let d = 0; d < STREAM_DROPS; d++) {
        const sp = dropRefs.current[i * STREAM_DROPS + d];
        if (!sp) continue;
        const age = ((t + (d / STREAM_DROPS) * DROP_LIFE + i * 0.13) % DROP_LIFE + DROP_LIFE) % DROP_LIFE;
        const vx = side * (0.3 + wail * 0.12);
        const vy = 0.35 + wail * 0.12;
        const y = eye.y + vy * age + 0.5 * GRAVITY * age * age;
        sp.visible = y > 0.02;
        sp.position.set(eye.x + side * 0.03 + vx * age, Math.max(0.02, y), eye.z + 0.05 + 0.1 * age);
        sp.scale.setScalar(0.055 * (1 - age * 0.25));
        sp.material.rotation = side * (0.5 + age * 1.6);
        sp.material.opacity = Math.min(0.85, age * 8);
      }
      const pool = puddleRefs.current[i];
      if (pool) {
        const grow = Math.min(1, since / 5);
        const ripple = 1 + Math.sin(t * 4 + i) * 0.03;
        pool.position.set(eye.x + side * 0.38, 0.006, 0.18);
        pool.scale.set(0.16 + grow * 0.16 * ripple, 0.11 + grow * 0.1 * ripple, 1);
        pool.material.opacity = 0.25 + grow * 0.35;
      }
    });

    headPoint(rig, rig.headTopOffset, top);
    wahRefs.current.forEach((sp, i) => {
      if (!sp) return;
      const cycle = 3.6;
      const age = t % cycle;
      const life = Math.min(1, age / 1.6);
      const side = Math.floor(t / cycle) % 2 ? 1 : -1;
      const pop = Math.min(1, life * 5);
      sp.position.set(top.x + side * (0.42 + life * 0.08), top.y + 0.12 + life * 0.15, top.z + 0.1);
      sp.scale.set(0.3 * pop, 0.13 * pop, 1);
      sp.material.rotation = side * -0.15 + Math.sin(t * 8) * 0.03;
      sp.material.opacity = age > 1.6 ? 0 : life < 0.7 ? 0.95 : ((1 - life) / 0.3) * 0.95;
    });
  });

  return (
    <group>
      <group ref={bodyRef}>
        <primitive object={rig.rig} />
        {[0, 1].map((i) => (
          <sprite key={`s${i}`} ref={(el) => (squintRefs.current[i] = el)} renderOrder={6}>
            <spriteMaterial map={squint} transparent opacity={0} depthWrite={false} toneMapped={false} />
          </sprite>
        ))}
        {Array.from({ length: STREAM_DROPS * 2 }, (_, i) => (
          <sprite key={`d${i}`} ref={(el) => (dropRefs.current[i] = el)} renderOrder={5}>
            <spriteMaterial map={tear} transparent opacity={0} depthWrite={false} toneMapped={false} />
          </sprite>
        ))}
        {Array.from({ length: WAH_COUNT }, (_, i) => (
          <sprite key={`w${i}`} ref={(el) => (wahRefs.current[i] = el)} renderOrder={7}>
            <spriteMaterial map={wah} transparent opacity={0} depthWrite={false} toneMapped={false} />
          </sprite>
        ))}
      </group>
      {[0, 1].map((i) => (
        <mesh key={`p${i}`} ref={(el) => (puddleRefs.current[i] = el)} rotation={[-Math.PI / 2, 0, i ? 0.4 : -0.4]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={puddle} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export default function CryingPanda(props) {
  return <PandaMood {...props} modelUrl={CRYING_MODEL} Rig={CryingRig} />;
}