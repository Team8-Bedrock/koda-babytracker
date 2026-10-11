import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PandaMood, smooth, pulse, aimArm, getTexture } from "./pandaRig";

const MODEL = "/models/characters/panda/sleepy.glb";
const CYCLE = 5;
const JOLT_AT = 0.55;

function sleepyState(t) {
  const u = (t % CYCLE) / CYCLE;
  const nod = u < JOLT_AT ? smooth(0.05, JOLT_AT, u) : 1 - smooth(JOLT_AT, JOLT_AT + 0.03, u);
  return {
    u,
    nod,
    jolt: pulse(JOLT_AT, JOLT_AT + 0.06, u),
    yawn: smooth(0.62, 0.7, u) * (1 - smooth(0.82, 0.9, u)),
    drift: u < JOLT_AT ? u / JOLT_AT : -1,
  };
}

function DriftZ() {
  const refs = useRef([]);
  const texture = getTexture("z");
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = sleepyState(t);
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      const life = THREE.MathUtils.clamp((s.drift - 0.35 - i * 0.2) / 0.45, 0, 1);
      sp.visible = s.drift > 0 && life > 0 && life < 1;
      sp.position.set(0.3 + life * 0.25 + i * 0.05, 1.45 + life * 0.35, 0.1);
      sp.material.opacity = Math.sin(life * Math.PI) * 0.85;
      sp.material.rotation = -0.3 + Math.sin(t * 2 + i) * 0.2;
      sp.scale.setScalar(0.07 + life * 0.06 + i * 0.02);
    });
  });
  return (
    <group>
      {[0, 1].map((i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)}>
          <spriteMaterial map={texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

export function SleepyRig({ rig }) {
  const bodyRef = useRef(null);
  const tmp = useMemo(() => ({ target: new THREE.Vector3() }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = sleepyState(t);
    const sway = Math.sin(t * 0.9) * (0.4 + s.nod * 0.6);

    if (bodyRef.current) {
      bodyRef.current.scale.set(1 - s.yawn * 0.03 + s.jolt * 0.02, 1 + s.yawn * 0.06 - s.nod * 0.02 + s.jolt * 0.03, 1 - s.yawn * 0.03);
      bodyRef.current.position.y = s.jolt * 0.04;
      bodyRef.current.rotation.z = sway * 0.05;
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(s.nod * 0.42 - s.jolt * 0.15 - s.yawn * 0.25, Math.sin(t * 0.6) * 0.05, sway * 0.08 + s.nod * 0.1);

    const lids = Math.max(0.15, 1 - s.nod * 0.85) + s.jolt * 0.5;
    [rig.eyeLeft, rig.eyeRight].forEach((e) => e.inner.forEach((g) => g.scale.set(1, s.yawn > 0.3 ? 0.25 : lids, 1)));
    rig.earLeft.rotation.z = 0.15 + s.nod * 0.3 - s.jolt * 0.3;
    rig.earRight.rotation.z = -0.15 - s.nod * 0.3 + s.jolt * 0.3;

    rig.mouth.visible = s.yawn > 0.02;
    rig.mouth.scale.set(0.025 + s.yawn * 0.02, 0.004 + s.yawn * 0.05, 0.012);

    tmp.target.set(-0.22, 1.75, 0.05);
    aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, tmp.target, s.yawn * 0.95);
    tmp.target.set(0.22, 1.75, 0.05);
    aimArm(rig.armRight, rig.shoulderRight, rig.restRight, tmp.target, s.yawn * 0.95);
    if (s.yawn < 0.02) {
      rig.armLeft.rotation.z = -0.05 * s.nod;
      rig.armRight.rotation.z = 0.05 * s.nod;
    }
    rig.bow.rotation.z = sway * 0.06;
  });

  return (
    <group ref={bodyRef}>
      <primitive object={rig.rig} />
      <DriftZ />
    </group>
  );
}

export default function SleepyPanda(props) {
  return <PandaMood {...props} modelUrl={MODEL} Rig={SleepyRig} />;
}