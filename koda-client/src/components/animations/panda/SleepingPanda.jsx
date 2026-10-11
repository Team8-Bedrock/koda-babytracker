import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PandaMood, smooth, headPoint, getTexture } from "./pandaRig";

const MODEL = "/models/characters/panda/sleeping.glb";
const BREATH = 4.2;
const Z_COUNT = 4;
const STARS = 5;

function sleepState(t) {
  const b = Math.floor(t / BREATH);
  const u = (t % BREATH) / BREATH;
  const inhale = 0.5 - 0.5 * Math.cos(u * Math.PI * 2);
  const popBreath = b % 3 === 2;
  return { u, inhale, popBreath, pop: popBreath && u > 0.5 ? smooth(0.5, 0.56, u) : 0 };
}

function useNightcap() {
  return useMemo(() => {
    const group = new THREE.Group();
    const capMat = new THREE.MeshStandardMaterial({ color: "#8fa8e8", roughness: 0.9 });
    const trimMat = new THREE.MeshStandardMaterial({ color: "#fdfaf2", roughness: 1 });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.33, 0.5, 24, 4, true), capMat);
    cone.position.set(0, 0.24, 0);
    cone.castShadow = true;
    const tip = new THREE.Group();
    tip.position.set(0, 0.47, 0);
    const droop = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 14), capMat);
    droop.position.set(0.07, -0.02, 0);
    droop.rotation.z = -1.1;
    const pompom = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 12), trimMat);
    pompom.position.set(0.17, -0.07, 0);
    tip.add(droop, pompom);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.065, 10, 28), trimMat);
    band.rotation.x = Math.PI / 2;
    group.add(cone, tip, band);
    group.rotation.set(-0.2, 0, -0.38);
    return { group, tip };
  }, []);
}

function NoseBubble({ rig }) {
  const ref = useRef(null);
  const splash = useRef([]);
  const sparkle = getTexture("sparkle");
  const nose = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = sleepState(t);
    headPoint(rig, rig.noseOffset, nose);
    const grow = s.popBreath ? Math.min(1, s.u / 0.5) * 1.4 : s.inhale;
    const r = 0.025 + grow * 0.085;
    if (ref.current) {
      ref.current.visible = !(s.popBreath && s.u > 0.5);
      ref.current.position.set(nose.x + 0.035, nose.y - 0.015 - r * 0.25, nose.z + r * 0.95 + 0.01);
      ref.current.scale.setScalar(r);
    }
    splash.current.forEach((sp, i) => {
      if (!sp) return;
      const life = THREE.MathUtils.clamp((s.u - 0.5) / 0.12, 0, 1);
      const a = (i / 5) * Math.PI * 2 + 0.4;
      sp.visible = s.popBreath && s.u > 0.5 && life < 1;
      sp.position.set(nose.x + 0.035 + Math.cos(a) * life * 0.18, nose.y + Math.sin(a) * life * 0.18, nose.z + 0.14);
      sp.material.opacity = 1 - life;
      sp.scale.setScalar(0.05);
    });
  });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshStandardMaterial color="#8fcaf5" transparent opacity={0.7} roughness={0.05} />
      </mesh>
      {[0, 1, 2, 3, 4].map((i) => (
        <sprite key={i} ref={(el) => (splash.current[i] = el)}>
          <spriteMaterial map={sparkle} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

function Zzz() {
  const refs = useRef([]);
  const texture = getTexture("z");
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      const life = ((t / 2.6 + i / Z_COUNT) % 1 + 1) % 1;
      sp.position.set(0.36 + life * 0.42 + Math.sin(t * 1.5 + i) * 0.04, 1.3 + life * 0.5, 0.15);
      sp.material.opacity = Math.sin(life * Math.PI);
      sp.material.rotation = -0.3 + Math.sin(t + i) * 0.15;
      sp.scale.setScalar(0.11 + life * 0.16);
    });
  });
  return (
    <group>
      {Array.from({ length: Z_COUNT }, (_, i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)}>
          <spriteMaterial map={texture} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

function NightSky() {
  const moon = useRef(null);
  const stars = useRef([]);
  const moonTex = getTexture("moon");
  const starTex = getTexture("star");
  const spots = useMemo(
    () => Array.from({ length: STARS }, (_, i) => [(-0.6 + i * 0.3) * (i % 2 ? 1 : 0.9), 1.5 + ((i * 37) % 10) / 45, -0.15]),
    [],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (moon.current) {
      moon.current.position.set(-0.55, 1.62 + Math.sin(t * 0.8) * 0.03, -0.05);
      moon.current.material.rotation = -0.3 + Math.sin(t * 0.5) * 0.08;
      moon.current.scale.setScalar(0.24);
    }
    stars.current.forEach((sp, i) => {
      if (!sp) return;
      const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7);
      sp.position.set(...spots[i]);
      sp.material.opacity = 0.35 + tw * 0.6;
      sp.scale.setScalar(0.05 + tw * 0.03);
    });
  });
  return (
    <group>
      <sprite ref={moon}>
        <spriteMaterial map={moonTex} transparent depthWrite={false} toneMapped={false} />
      </sprite>
      {spots.map((_, i) => (
        <sprite key={i} ref={(el) => (stars.current[i] = el)}>
          <spriteMaterial map={starTex} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

export function SleepingRig({ rig }) {
  const bodyRef = useRef(null);
  const capRef = useRef(null);
  const cap = useNightcap();
  const top = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = sleepState(t);
    const twitch = Math.pow(Math.max(0, Math.sin(t * 0.7)), 30);

    if (bodyRef.current) {
      bodyRef.current.scale.set(1 + s.inhale * 0.05, 1 + s.inhale * 0.035 - 0.02, 1 + s.inhale * 0.055);
      bodyRef.current.rotation.z = Math.sin(t * 0.5) * 0.05;
      bodyRef.current.rotation.x = 0.04;
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(0.32 + s.inhale * 0.08 - s.pop * 0.1, Math.sin(t * 0.4) * 0.05, 0.16 + Math.sin(t * 0.5) * 0.06);

    rig.earLeft.rotation.z = 0.22 + twitch * 0.3;
    rig.earRight.rotation.z = -0.22;
    rig.mouth.visible = true;
    rig.mouth.scale.set(0.018, 0.008 + s.inhale * 0.009, 0.01);

    rig.armLeft.rotation.z = -0.08 - s.inhale * 0.05;
    rig.armRight.rotation.z = 0.08 + s.inhale * 0.05;
    rig.bow.rotation.z = Math.sin(t * 0.5) * 0.05;

    if (capRef.current) {
      rig.head.updateMatrix();
      top.copy(rig.headTopOffset).applyMatrix4(rig.head.matrix);
      capRef.current.position.copy(top);
      capRef.current.quaternion.copy(rig.head.quaternion);
      cap.tip.rotation.z = Math.sin(t * 0.9) * 0.15 - s.inhale * 0.1;
    }
  });

  return (
    <group ref={bodyRef}>
      <primitive object={rig.rig} />
      <group ref={capRef}>
        <primitive object={cap.group} />
      </group>
      <NoseBubble rig={rig} />
      <Zzz />
      <NightSky />
    </group>
  );
}

export default function SleepingPanda(props) {
  return <PandaMood {...props} modelUrl={MODEL} Rig={SleepingRig} />;
}