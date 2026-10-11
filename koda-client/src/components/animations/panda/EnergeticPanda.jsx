import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PandaMood, PANDA_IDLE_MODEL, smooth, pulse, aimArm, getTexture } from "./pandaRig";

const CYCLE = 3.6;
const JACKS_END = 0.55;
const SPIN_END = 0.78;

function energyState(t) {
  const u = (t % CYCLE) / CYCLE;
  const jackPhase = u < JACKS_END ? Math.sin((u / JACKS_END) * Math.PI * 8) : 0;
  return {
    u,
    jack: u < JACKS_END ? Math.abs(jackPhase) : 0,
    spin: smooth(JACKS_END, SPIN_END, u),
    leap: pulse(SPIN_END, 0.96, u),
    landing: pulse(0.94, 1, u),
  };
}

function Zing() {
  const refs = useRef([]);
  const bolt = getTexture("bolt");
  const star = getTexture("star");
  const speed = getTexture("speed");
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = energyState(t);
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      if (i < 2) {
        const side = i ? 1 : -1;
        sp.position.set(side * 0.62, 1.3 + Math.sin(t * 8 + i) * 0.05 + s.leap * 0.2, 0.15);
        sp.material.rotation = side * 0.3 + Math.sin(t * 10) * 0.1;
        sp.scale.setScalar(0.22 + s.jack * 0.04 + s.leap * 0.06);
        sp.material.opacity = 0.95;
      } else if (i < 6) {
        const a = t * 6 + i * 1.6;
        sp.position.set(Math.cos(a) * 0.6, 0.9 + Math.sin(a * 0.7) * 0.4, Math.sin(a) * 0.3);
        sp.scale.setScalar(0.1 + 0.03 * Math.sin(t * 9 + i));
        sp.material.opacity = 0.9;
      } else {
        const side = i === 6 ? 1 : -1;
        sp.visible = s.spin > 0.02 && s.spin < 0.98;
        sp.position.set(side * 0.5, 0.75 + (i - 6) * 0.2, 0.05);
        sp.material.rotation = side > 0 ? 0 : Math.PI;
        sp.scale.setScalar(0.3);
        sp.material.opacity = Math.sin(s.spin * Math.PI);
      }
    });
  });
  return (
    <group>
      {Array.from({ length: 8 }, (_, i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)}>
          <spriteMaterial map={i < 2 ? bolt : i < 6 ? star : speed} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

export function EnergeticRig({ rig }) {
  const bodyRef = useRef(null);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = energyState(t);
    const vibrate = Math.sin(t * 40) * 0.006;

    if (bodyRef.current) {
      bodyRef.current.position.set(vibrate, s.jack * 0.1 + s.leap * 0.32, 0);
      const squash = s.landing * 0.08 + (1 - s.jack) * (s.u < JACKS_END ? 0.03 : 0);
      bodyRef.current.scale.set(1 + squash, 1 - squash * 1.2 + s.leap * 0.05, 1 + squash);
      bodyRef.current.rotation.y = s.spin * Math.PI * 2;
      bodyRef.current.rotation.z = Math.sin(t * 7) * 0.03;
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(-0.1 - s.leap * 0.15, Math.sin(t * 5) * 0.08, Math.sin(t * 6) * 0.06);
    [rig.eyeLeft, rig.eyeRight].forEach((e) => e.inner.forEach((g) => g.scale.set(1.1, 1.15, 1)));
    rig.earLeft.rotation.z = -0.1 + s.jack * 0.25 + s.leap * 0.3;
    rig.earRight.rotation.z = 0.1 - s.jack * 0.25 - s.leap * 0.3;

    rig.mouth.visible = true;
    rig.mouth.scale.set(0.03 + s.leap * 0.01, 0.014 + s.jack * 0.012 + s.leap * 0.02, 0.012);

    const up = s.u < JACKS_END ? s.jack : Math.max(s.leap, 0.4);
    target.set(-0.5, 0.5 + up * 1.35, 0.1);
    aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, target, 0.95);
    target.set(0.5, 0.5 + up * 1.35, 0.1);
    aimArm(rig.armRight, rig.shoulderRight, rig.restRight, target, 0.95);

    rig.legLeft.rotation.z = -s.jack * 0.3;
    rig.legRight.rotation.z = s.jack * 0.3;
    rig.legLeft.rotation.x = -s.leap * 0.4;
    rig.legRight.rotation.x = -s.leap * 0.25;
    rig.bow.rotation.z = Math.sin(t * 12) * 0.12;
  });

  return (
    <group ref={bodyRef}>
      <primitive object={rig.rig} />
      <Zing />
    </group>
  );
}

export default function EnergeticPanda(props) {
  return <PandaMood {...props} modelUrl={PANDA_IDLE_MODEL} Rig={EnergeticRig} />;
}