import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PandaMood, smooth, pulse, aimArm, headPoint, getTexture } from "./pandaRig";

const MODEL = "/models/characters/panda/crying.glb";
const CYCLE = 4;
const TEARS = 16;
const GRAVITY = -2.6;

function cryState(t) {
  const u = (t % CYCLE) / CYCLE;
  return {
    u,
    sniff: pulse(0.12, 0.2, u) + pulse(0.28, 0.36, u),
    wipe: smooth(0.42, 0.5, u) * (1 - smooth(0.62, 0.7, u)),
    wail: smooth(0.7, 0.76, u) * (1 - smooth(0.92, 0.99, u)),
  };
}

function Tears({ rig }) {
  const refs = useRef([]);
  const texture = getTexture("tear");
  const eye = useMemo(() => ({ l: new THREE.Vector3(), r: new THREE.Vector3() }), []);
  const seeds = useMemo(() => Array.from({ length: TEARS }, (_, i) => ({ side: i % 2 ? 1 : -1, phase: (Math.floor(i / 2) / (TEARS / 2)) * 0.6 })), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = cryState(t);
    headPoint(rig, rig.eyeOffsetLeft, eye.l);
    headPoint(rig, rig.eyeOffsetRight, eye.r);
    const power = 0.35 + s.wail * 1.1 - s.wipe * 0.3;
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      const sd = seeds[i];
      const age = ((t + sd.phase) % 0.6) / 0.6;
      const tt = age * 0.6;
      const from = sd.side < 0 ? eye.l : eye.r;
      const vx = sd.side * (0.18 + power * 0.38);
      const vy = 0.15 + power * 0.45;
      const y = from.y + vy * tt + 0.5 * GRAVITY * tt * tt;
      sp.visible = y > 0.02 && power > 0.1;
      sp.position.set(from.x + vx * tt, Math.max(0.02, y), from.z + 0.05 + tt * 0.2);
      sp.material.opacity = 0.95 - age * 0.3;
      sp.scale.setScalar(0.05 + power * 0.025);
      sp.material.rotation = -sd.side * (0.3 + age);
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

function Puddle() {
  const ref = useRef(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const grow = Math.min(1, t / 12);
    ref.current.scale.set(0.35 + grow * 0.45 + Math.sin(t * 2) * 0.01, 0.25 + grow * 0.3, 1);
    ref.current.material.opacity = 0.35 + grow * 0.2;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0.25]}>
      <circleGeometry args={[1, 32]} />
      <meshStandardMaterial color="#9fd6f5" transparent opacity={0.4} roughness={0.2} depthWrite={false} />
    </mesh>
  );
}

export function CryingRig({ rig }) {
  const bodyRef = useRef(null);
  const tmp = useMemo(() => ({ eye: new THREE.Vector3(), target: new THREE.Vector3() }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = cryState(t);
    const sob = Math.sin(t * 9) * (0.3 + s.wail * 0.7);

    if (bodyRef.current) {
      bodyRef.current.scale.set(1 + s.sniff * 0.03, 1 - s.sniff * 0.04 + sob * 0.01, 1 + s.sniff * 0.03);
      bodyRef.current.position.y = s.sniff * 0.02;
      bodyRef.current.rotation.z = Math.sin(t * 1.4) * 0.03 + sob * 0.01;
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(0.12 - s.wail * 0.3 + s.sniff * 0.06 - s.wipe * 0.05, Math.sin(t * 1.1) * 0.05, Math.sin(t * 1.4) * 0.05 + s.wipe * Math.sin(t * 10) * 0.03);

    [rig.eyeLeft, rig.eyeRight].forEach((e) => e.inner.forEach((g) => g.scale.set(1, 0.8 + sob * 0.08, 1)));
    rig.earLeft.rotation.z = 0.35 + s.sniff * 0.08;
    rig.earRight.rotation.z = -0.35 - s.sniff * 0.08;

    rig.mouth.visible = true;
    rig.mouth.scale.set(0.025 + s.wail * 0.02, 0.01 + s.wail * 0.035 + Math.max(0, sob) * 0.006, 0.012);

    headPoint(rig, rig.eyeOffsetRight, tmp.eye);
    tmp.target.copy(tmp.eye).add(new THREE.Vector3(Math.sin(t * 10) * 0.04, -0.04, 0.12));
    aimArm(rig.armRight, rig.shoulderRight, rig.restRight, tmp.target, s.wipe * 0.95);
    headPoint(rig, rig.eyeOffsetLeft, tmp.eye);
    tmp.target.copy(tmp.eye).add(new THREE.Vector3(-Math.sin(t * 10 + 1) * 0.04, -0.04, 0.12));
    aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, tmp.target, s.wipe * 0.95);
    if (s.wipe < 0.01) {
      rig.armLeft.rotation.z = -0.1 - s.wail * 0.35;
      rig.armRight.rotation.z = 0.1 + s.wail * 0.35;
    }
    rig.bow.rotation.z = Math.sin(t * 1.4) * 0.05;
  });

  return (
    <group ref={bodyRef}>
      <primitive object={rig.rig} />
      <Tears rig={rig} />
      <Puddle />
    </group>
  );
}

export default function CryingPanda(props) {
  return <PandaMood {...props} modelUrl={MODEL} Rig={CryingRig} />;
}