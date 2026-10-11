import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PandaMood, PANDA_IDLE_MODEL, smooth, getTexture } from "./pandaRig";

const CYCLE = 9;
const EAR_SPOT = new THREE.Vector3(0.36, 1.48, 0.08);

function useButterfly() {
  return useMemo(() => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.008, 0.04, 4, 8),
      new THREE.MeshStandardMaterial({ color: "#6d5a7a", roughness: 0.8 }),
    );
    body.rotation.x = Math.PI / 2;
    group.add(body);
    const wingMat = new THREE.MeshStandardMaterial({ color: "#ffc0dc", roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const wings = [-1, 1].map((side) => {
      const hinge = new THREE.Group();
      const wing = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), wingMat);
      wing.position.set(side * 0.045, 0, 0);
      wing.rotation.x = -Math.PI / 2;
      wing.scale.set(1, 1.3, 1);
      hinge.add(wing);
      hinge.userData.side = side;
      group.add(hinge);
      return hinge;
    });
    return { group, wings };
  }, []);
}

function Butterfly() {
  const ref = useRef(null);
  const fly = useButterfly();
  const pos = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const u = (t % CYCLE) / CYCLE;
    const arrive = smooth(0.05, 0.35, u);
    const leave = smooth(0.82, 1, u);
    const a = t * 1.4;
    pos.set(0.9 + Math.sin(a) * 0.2, 1.9 + Math.sin(a * 1.7) * 0.12, 0.3);
    pos.lerp(EAR_SPOT, arrive);
    pos.lerp(new THREE.Vector3(-1.1, 2.2, 0.2), leave);
    ref.current.position.copy(pos);
    const perched = arrive > 0.98 && leave < 0.02;
    const flap = perched ? 0.25 + Math.sin(t * 2) * 0.25 : 0.2 + Math.sin(t * 28) * 0.7;
    fly.wings.forEach((w) => {
      w.rotation.z = w.userData.side * flap;
    });
    ref.current.rotation.set(1.05, perched ? -0.3 : Math.sin(a) * 0.5, 0);
    ref.current.scale.setScalar(2.4);
  });
  return (
    <group ref={ref}>
      <primitive object={fly.group} />
    </group>
  );
}

function SoftDots() {
  const refs = useRef([]);
  const dot = getTexture("dot");
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      const on = 0.5 + 0.5 * Math.sin(t * 1.6 - i * 0.7);
      sp.position.set(-0.62 + i * 0.12, 1.25 + on * 0.03, 0.2);
      sp.material.opacity = 0.25 + on * 0.6;
      sp.scale.setScalar(0.07);
    });
  });
  return (
    <group>
      {[0, 1, 2].map((i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)}>
          <spriteMaterial map={dot} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

export function QuietRig({ rig }) {
  const bodyRef = useRef(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const breathe = 0.5 - 0.5 * Math.cos(t * 1.1);
    const u = (t % CYCLE) / CYCLE;
    const noticing = smooth(0.25, 0.38, u) * (1 - smooth(0.8, 0.9, u));

    if (bodyRef.current) {
      bodyRef.current.scale.set(1 + breathe * 0.02, 1 + breathe * 0.015, 1 + breathe * 0.02);
      bodyRef.current.rotation.z = Math.sin(t * 0.5) * 0.025;
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(0.06 + breathe * 0.02, noticing * 0.18 + Math.sin(t * 0.35) * 0.04, -noticing * 0.12 + Math.sin(t * 0.5) * 0.03);
    [rig.eyeLeft, rig.eyeRight].forEach((e) => e.inner.forEach((g) => g.scale.set(1, 0.72, 1)));
    rig.earLeft.rotation.z = 0.06;
    rig.earRight.rotation.z = -0.06 - noticing * 0.08;

    rig.mouth.visible = true;
    rig.mouth.scale.set(0.014, 0.004, 0.008);

    rig.armLeft.rotation.z = -0.04;
    rig.armRight.rotation.z = 0.04;
    rig.bow.rotation.z = Math.sin(t * 0.5) * 0.03;
  });

  return (
    <group ref={bodyRef}>
      <primitive object={rig.rig} />
      <Butterfly />
      <SoftDots />
    </group>
  );
}

export default function QuietPanda(props) {
  return <PandaMood {...props} modelUrl={PANDA_IDLE_MODEL} Rig={QuietRig} />;
}