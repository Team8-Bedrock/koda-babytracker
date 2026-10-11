import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PandaMood, PANDA_IDLE_MODEL, smooth, getTexture } from "./pandaRig";

const CYCLE = 4.5;

function curiousState(t) {
  const u = (t % CYCLE) / CYCLE;
  const lookLeft = smooth(0.08, 0.2, u) * (1 - smooth(0.3, 0.4, u));
  const lookRight = smooth(0.4, 0.52, u) * (1 - smooth(0.62, 0.72, u));
  return { u, look: lookRight - lookLeft, tilt: smooth(0.72, 0.8, u) * (1 - smooth(0.92, 1, u)) };
}

function Question() {
  const ref = useRef(null);
  const texture = getTexture("question");
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const s = curiousState(t);
    ref.current.position.set(0.58 + s.look * 0.06, 1.42 + Math.abs(Math.sin(t * 2.4)) * 0.07, 0.15);
    ref.current.material.rotation = Math.sin(t * 1.8) * 0.18 + s.tilt * 0.2;
    ref.current.scale.setScalar(0.32 + Math.sin(t * 4.8) * 0.015 + s.tilt * 0.05);
  });
  return (
    <sprite ref={ref}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function TapRing() {
  const refs = useRef([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((m, i) => {
      if (!m) return;
      const life = ((t / 1.6 + i * 0.5) % 1 + 1) % 1;
      m.scale.setScalar(0.45 + life * 0.55);
      m.material.opacity = (1 - life) * 0.9;
    });
  });
  return (
    <group position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {[0, 1].map((i) => (
        <mesh key={i} ref={(el) => (refs.current[i] = el)}>
          <ringGeometry args={[0.62, 0.72, 40]} />
          <meshBasicMaterial color="#ffd36b" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export function OtherRig({ rig }) {
  const bodyRef = useRef(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = curiousState(t);
    const hop = Math.max(0, Math.sin(t * 2.4)) * 0.02;

    if (bodyRef.current) {
      bodyRef.current.position.y = hop;
      bodyRef.current.rotation.y = s.look * 0.25;
      bodyRef.current.rotation.z = Math.sin(t * 0.8) * 0.02;
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(-0.05 - s.tilt * 0.05, s.look * 0.45, s.tilt * 0.32 + Math.sin(t * 0.9) * 0.03);
    [rig.eyeLeft, rig.eyeRight].forEach((e) =>
      e.inner.forEach((g) => {
        g.scale.set(1, 1 + s.tilt * 0.15, 1);
        g.position.x = (g.userData.baseX ??= g.position.x) + s.look * 0.012;
      }),
    );
    rig.earLeft.rotation.z = s.tilt * 0.3;
    rig.earRight.rotation.z = -0.05 + s.tilt * 0.1;

    rig.mouth.visible = true;
    rig.mouth.scale.set(0.012 + s.tilt * 0.004, 0.01 + s.tilt * 0.006, 0.008);

    rig.armRight.rotation.z = 0.05;
    rig.armLeft.rotation.z = -0.05 - s.tilt * 0.3;
    rig.armLeft.rotation.x = -s.tilt * 0.5;
    rig.bow.rotation.z = Math.sin(t * 0.8) * 0.04;
  });

  return (
    <group ref={bodyRef}>
      <primitive object={rig.rig} />
      <Question />
      <TapRing />
    </group>
  );
}

export default function OtherPanda(props) {
  return <PandaMood {...props} modelUrl={PANDA_IDLE_MODEL} Rig={OtherRig} />;
}