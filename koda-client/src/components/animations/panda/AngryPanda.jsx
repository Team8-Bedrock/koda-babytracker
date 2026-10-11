import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PandaMood, smooth, pulse, aimArm, getTexture } from "./pandaRig";

const MODEL = "/models/characters/panda/angry.glb";
const CYCLE = 3.2;
const STOMP_AT = 0.58;
const PUFFS = 6;

function angerState(t) {
  const u = (t % CYCLE) / CYCLE;
  return {
    u,
    tap: u < 0.48 ? Math.max(0, Math.sin(t * 13)) : 0,
    lift: pulse(0.48, STOMP_AT, u),
    slam: pulse(STOMP_AT - 0.01, STOMP_AT + 0.08, u),
    hmph: smooth(STOMP_AT, STOMP_AT + 0.06, u) * (1 - smooth(0.88, 0.98, u)),
    shake: u > STOMP_AT && u < STOMP_AT + 0.14 ? Math.sin(t * 70) * (1 - (u - STOMP_AT) / 0.14) : 0,
    steam: u > STOMP_AT ? (u - STOMP_AT) / (1 - STOMP_AT) : -1,
  };
}

function Steam() {
  const refs = useRef([]);
  const texture = getTexture("puff");
  const seeds = useMemo(() => Array.from({ length: PUFFS }, (_, i) => ({ side: i % 2 ? 1 : -1, delay: Math.floor(i / 2) * 0.12 })), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = angerState(t);
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      const sd = seeds[i];
      const life = THREE.MathUtils.clamp((s.steam - sd.delay) / 0.5, 0, 1);
      sp.visible = s.steam >= sd.delay && life < 1;
      sp.position.set(sd.side * (0.36 + life * 0.25), 1.36 + life * 0.3, 0.02);
      sp.material.opacity = Math.sin(life * Math.PI) * 0.9;
      sp.scale.setScalar(0.08 + life * 0.16);
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

function AngerMark() {
  const ref = useRef(null);
  const texture = getTexture("anger");
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const s = angerState(t);
    const beat = 0.5 + 0.5 * Math.sin(t * 9);
    ref.current.scale.setScalar(0.17 + beat * 0.04 + s.slam * 0.08);
    ref.current.position.set(0.36, 1.5 + Math.sin(t * 2) * 0.02, 0.15);
    ref.current.material.rotation = Math.sin(t * 3) * 0.1;
  });
  return (
    <sprite ref={ref}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function DustRing() {
  const ref = useRef(null);
  useFrame((state) => {
    if (!ref.current) return;
    const s = angerState(state.clock.elapsedTime);
    const life = THREE.MathUtils.clamp((s.u - STOMP_AT) / 0.18, 0, 1);
    ref.current.visible = s.u > STOMP_AT && life < 1;
    ref.current.scale.setScalar(0.12 + life * 0.45);
    ref.current.material.opacity = (1 - life) * 0.55;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[-0.14, 0.012, 0.05]}>
      <ringGeometry args={[0.55, 0.9, 28]} />
      <meshBasicMaterial color="#efe6d4" transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function AngryRig({ rig }) {
  const bodyRef = useRef(null);
  const targets = useMemo(() => ({ left: new THREE.Vector3(), right: new THREE.Vector3() }), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = angerState(t);
    const huff = Math.sin(t * 3.2) * 0.5 + 0.5;

    if (bodyRef.current) {
      bodyRef.current.scale.set(1 + huff * 0.02 + s.slam * 0.05, 1 - huff * 0.02 - s.slam * 0.07, 1 + huff * 0.02 + s.slam * 0.05);
      bodyRef.current.position.y = -s.slam * 0.03 + s.lift * 0.03;
      bodyRef.current.rotation.z = s.shake * 0.04 + Math.sin(t * 2.1) * 0.01;
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(-s.hmph * 0.18 + s.lift * 0.05, -s.hmph * 0.55 + Math.sin(t * 1.7) * 0.03, s.hmph * 0.08 + s.shake * 0.05);
    const puff = 0.03 + huff * 0.02 + s.hmph * 0.03;
    rig.head.scale.set(1 + puff, 1 - puff * 0.3, 1 + puff * 0.4);

    [rig.eyeLeft, rig.eyeRight].forEach((e) => e.inner.forEach((g) => g.scale.set(1, 0.85 - s.slam * 0.2, 1)));
    rig.earLeft.rotation.z = -0.12 - s.slam * 0.15;
    rig.earRight.rotation.z = 0.12 + s.slam * 0.15;
    rig.earLeft.rotation.x = rig.earRight.rotation.x = 0.15;

    rig.mouth.visible = true;
    rig.mouth.scale.set(0.028 + s.hmph * 0.01, 0.006 + huff * 0.004, 0.01);

    targets.left.set(0.2, 0.62, 0.42);
    targets.right.set(-0.2, 0.68, 0.45);
    aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, targets.left, 0.95);
    aimArm(rig.armRight, rig.shoulderRight, rig.restRight, targets.right, 0.95);
    rig.armLeft.rotation.z += Math.sin(t * 3.2) * 0.03;
    rig.armRight.rotation.z -= Math.sin(t * 3.2) * 0.03;

    rig.legRight.rotation.x = -s.tap * 0.25;
    rig.legLeft.rotation.x = -s.lift * 0.6;
    rig.bow.rotation.z = s.shake * 0.2;
  });

  return (
    <group ref={bodyRef}>
      <primitive object={rig.rig} />
      <Steam />
      <AngerMark />
      <DustRing />
    </group>
  );
}

export default function AngryPanda(props) {
  return <PandaMood {...props} modelUrl={MODEL} Rig={AngryRig} />;
}