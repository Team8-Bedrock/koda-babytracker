import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PandaMood, smooth, pulse, aimArm, headPoint, getTexture } from "./pandaRig";

const MODEL = "/models/characters/panda/hungry.glb";
const CYCLE = 3.8;
const BELLY = new THREE.Vector3(0, 0.56, 0.38);

function hungerState(t) {
  const u = (t % CYCLE) / CYCLE;
  return {
    u,
    rumble: smooth(0.25, 0.3, u) * (1 - smooth(0.5, 0.56, u)),
    dream: smooth(0.55, 0.65, u) * (1 - smooth(0.92, 1, u)),
    drool: pulse(0.6, 0.98, u),
  };
}

function ThoughtBubble() {
  const big = useRef(null);
  const dots = useRef([]);
  const thought = getTexture("thought");
  const dot = getTexture("dot");
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = hungerState(t);
    dots.current.forEach((d, i) => {
      if (!d) return;
      const on = smooth(0.55 + i * 0.03, 0.6 + i * 0.03, s.u) * (1 - smooth(0.92, 1, s.u));
      d.visible = on > 0.01;
      d.position.set(0.3 + i * 0.08, 1.45 + i * 0.08, 0.1);
      d.scale.setScalar((0.04 + i * 0.025) * on);
      d.material.opacity = on;
    });
    if (big.current) {
      const on = smooth(0.62, 0.68, s.u) * (1 - smooth(0.92, 1, s.u));
      big.current.visible = on > 0.01;
      big.current.position.set(0.58, 1.72 + Math.sin(t * 2) * 0.02, 0.1);
      big.current.scale.setScalar(0.36 * (0.6 + on * 0.4));
      big.current.material.opacity = on;
      big.current.material.rotation = Math.sin(t * 1.5) * 0.05;
    }
  });
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <sprite key={i} ref={(el) => (dots.current[i] = el)}>
          <spriteMaterial map={dot} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      <sprite ref={big}>
        <spriteMaterial map={thought} transparent opacity={0} depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  );
}

function RumbleLines() {
  const refs = useRef([]);
  const texture = getTexture("rumble");
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = hungerState(t);
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      const side = i ? 1 : -1;
      sp.visible = s.rumble > 0.02;
      sp.position.set(side * (0.42 + Math.sin(t * 30 + i) * 0.015), 0.58, 0.3);
      sp.material.opacity = s.rumble;
      sp.material.rotation = side * 0.2;
      sp.scale.setScalar(0.17 * s.rumble);
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

function Drool({ rig }) {
  const ref = useRef(null);
  const mouth = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    if (!ref.current) return;
    const s = hungerState(state.clock.elapsedTime);
    headPoint(rig, rig.mouthOffset, mouth);
    ref.current.visible = s.drool > 0.05;
    ref.current.position.set(mouth.x + 0.05, mouth.y - 0.02 - s.drool * 0.06, mouth.z + 0.02);
    ref.current.scale.set(0.016, 0.02 + s.drool * 0.04, 0.016);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[1, 12, 10]} />
      <meshStandardMaterial color="#d8f0ff" transparent opacity={0.8} roughness={0.2} />
    </mesh>
  );
}

export function HungryRig({ rig }) {
  const bodyRef = useRef(null);
  const tmp = useMemo(() => ({ target: new THREE.Vector3() }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = hungerState(t);
    const shake = Math.sin(t * 45) * s.rumble;

    if (bodyRef.current) {
      bodyRef.current.scale.set(1 + shake * 0.02 + s.rumble * 0.02, 1 - s.rumble * 0.03, 1 + shake * 0.02 + s.rumble * 0.02);
      bodyRef.current.rotation.z = Math.sin(t * 1.3) * 0.05 + shake * 0.02;
      bodyRef.current.rotation.x = Math.cos(t * 1.3) * 0.025;
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(0.05 + Math.cos(t * 2.2) * 0.07 - s.dream * 0.12, Math.sin(t * 0.9) * 0.08, Math.sin(t * 2.2) * 0.09);

    [rig.eyeLeft, rig.eyeRight].forEach((e, side) =>
      e.inner.forEach((g) => {
        g.rotation.z = (side ? -1 : 1) * t * 4.5;
      }),
    );
    rig.earLeft.rotation.z = 0.2 + Math.sin(t * 2.2) * 0.06;
    rig.earRight.rotation.z = -0.2 - Math.sin(t * 2.2 + 0.5) * 0.06;

    rig.mouth.visible = true;
    rig.mouth.scale.set(0.024 + s.dream * 0.008, 0.008 + s.dream * 0.016, 0.01);

    const rub = s.rumble > 0.02 ? 1 : 0.65;
    tmp.target.copy(BELLY).add(new THREE.Vector3(-0.14 + Math.sin(t * 6) * 0.05 * rub, Math.cos(t * 6) * 0.04 * rub, 0));
    aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, tmp.target, 0.9);
    tmp.target.copy(BELLY).add(new THREE.Vector3(0.14 - Math.sin(t * 6 + 1) * 0.05 * rub, Math.cos(t * 6 + 1) * 0.04 * rub, 0));
    aimArm(rig.armRight, rig.shoulderRight, rig.restRight, tmp.target, 0.9);
    rig.bow.rotation.z = Math.sin(t * 2.2) * 0.06;
  });

  return (
    <group ref={bodyRef}>
      <primitive object={rig.rig} />
      <ThoughtBubble />
      <RumbleLines />
      <Drool rig={rig} />
    </group>
  );
}

export default function HungryPanda(props) {
  return <PandaMood {...props} modelUrl={MODEL} Rig={HungryRig} />;
}