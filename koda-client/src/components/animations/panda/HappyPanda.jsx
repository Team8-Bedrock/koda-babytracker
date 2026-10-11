import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PandaMood, aimArm, getTexture } from "./pandaRig";

const MODEL = "/models/characters/panda/feeding.glb";
const BEAT = 0.55;
const FLOATERS = 8;

function Floaters() {
  const refs = useRef([]);
  const heart = getTexture("heart");
  const note = getTexture("note");
  const sparkle = getTexture("sparkle");
  const seeds = useMemo(
    () => Array.from({ length: FLOATERS }, (_, i) => ({ side: i % 2 ? 1 : -1, phase: i / FLOATERS, kind: i % 3 })),
    [],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      const sd = seeds[i];
      const life = ((t / 2.4 + sd.phase) % 1 + 1) % 1;
      sp.position.set(sd.side * (0.55 + life * 0.2) + Math.sin(t * 3 + i) * 0.05, 0.8 + life * 0.75, 0.15);
      sp.material.opacity = Math.sin(life * Math.PI);
      sp.material.rotation = Math.sin(t * 2 + i) * 0.3;
      sp.scale.setScalar(0.15 + (sd.kind === 0 ? 0.04 : 0.01) + life * 0.04);
    });
  });
  return (
    <group>
      {seeds.map((sd, i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)}>
          <spriteMaterial map={sd.kind === 0 ? heart : sd.kind === 1 ? note : sparkle} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

export function HappyRig({ rig }) {
  const bodyRef = useRef(null);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const beat = t / BEAT;
    const step = Math.sin(beat * Math.PI);
    const bounce = Math.abs(step);
    const side = Math.sin(beat * Math.PI * 0.5);

    if (bodyRef.current) {
      bodyRef.current.position.set(side * 0.06, bounce * 0.09, 0);
      bodyRef.current.scale.set(1 + (1 - bounce) * 0.04, 1 - (1 - bounce) * 0.05 + bounce * 0.02, 1 + (1 - bounce) * 0.04);
      bodyRef.current.rotation.z = -side * 0.1;
      bodyRef.current.rotation.y = side * 0.15;
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(-0.08 + bounce * 0.04, side * 0.12, side * 0.16);
    rig.earLeft.rotation.z = 0.05 + bounce * 0.2;
    rig.earRight.rotation.z = -0.05 - bounce * 0.2;

    rig.mouth.visible = true;
    rig.mouth.scale.set(0.03, 0.012 + bounce * 0.012, 0.012);

    const wave = Math.sin(beat * Math.PI * 2);
    target.set(-0.6 - wave * 0.1, 1.75 + wave * 0.15, 0.25);
    aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, target, 0.9);
    target.set(0.6 - wave * 0.1, 1.75 - wave * 0.15, 0.25);
    aimArm(rig.armRight, rig.shoulderRight, rig.restRight, target, 0.9);

    rig.legLeft.rotation.x = -Math.max(0, step) * 0.35;
    rig.legRight.rotation.x = -Math.max(0, -step) * 0.35;
    rig.bow.rotation.z = side * 0.15;
  });

  return (
    <group ref={bodyRef}>
      <primitive object={rig.rig} />
      <Floaters />
    </group>
  );
}

export default function HappyPanda(props) {
  return <PandaMood {...props} modelUrl={MODEL} Rig={HappyRig} />;
}