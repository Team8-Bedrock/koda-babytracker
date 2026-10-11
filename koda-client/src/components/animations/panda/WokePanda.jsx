import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PandaMood, PANDA_IDLE_MODEL, smooth, pulse, aimArm, headPoint, getTexture } from "./pandaRig";
import SleepyPanda from "./SleepyPanda";

const SLEEPY_MODEL = "/models/characters/panda/sleepy.glb";
const MODEL_BY_QUALITY = { good: PANDA_IDLE_MODEL, fair: PANDA_IDLE_MODEL, poor: SLEEPY_MODEL, groggy: SLEEPY_MODEL };
const CYCLE = 5;

function wokeState(t) {
  const u = (t % CYCLE) / CYCLE;
  return {
    u,
    stretch: smooth(0.04, 0.16, u) * (1 - smooth(0.3, 0.4, u)),
    hop: pulse(0.42, 0.54, u) + pulse(0.58, 0.7, u),
    rub: smooth(0.08, 0.14, u) * (1 - smooth(0.34, 0.4, u)),
    yawn: smooth(0.46, 0.53, u) * (1 - smooth(0.66, 0.74, u)),
    shake: pulse(0.8, 0.94, u),
  };
}

function Weather({ quality }) {
  const main = useRef(null);
  const extra = useRef(null);
  const sparkles = useRef([]);
  const sun = getTexture("sun");
  const batteries = [0, 1, 2].map((n) => getTexture(`battery${n}`));
  const rain = getTexture("raincloud");
  const sparkle = getTexture("sparkle");
  const heart = getTexture("heart");
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = wokeState(t);
    if (main.current) {
      if (quality === "groggy") {
        main.current.position.set(Math.sin(t * 0.8) * 0.08, 1.85 + Math.sin(t * 1.3) * 0.02, 0.05);
        main.current.scale.set(0.42, 0.42, 1);
      } else if (quality === "fair") {
        main.current.visible = false;
      } else {
        main.current.position.set(-0.45, 1.85 + Math.sin(t * 0.9) * 0.03, -0.05);
        main.current.scale.setScalar(0.3);
        main.current.material.rotation = t * 0.3;
      }
    }
    if (extra.current) {
      extra.current.visible = quality === "fair";
      const level = s.u < 0.3 ? 1 : s.u < 0.6 ? 2 : Math.floor(t * 3) % 2 ? 2 : 1;
      extra.current.material.map = batteries[level];
      extra.current.position.set(-0.62, 1.45 + Math.sin(t * 1.4) * 0.03, 0.15);
      extra.current.scale.set(0.32, 0.32, 1);
      extra.current.material.rotation = Math.sin(t * 1.1) * 0.08;
    }
    sparkles.current.forEach((sp, i) => {
      if (!sp) return;
      const on = quality === "good";
      const life = ((t * 0.45 + i / 6) % 1 + 1) % 1;
      const a = (i / 6) * Math.PI * 2 + t * 0.3;
      sp.visible = on;
      sp.position.set(Math.cos(a) * 0.55, 1.2 + life * 0.6 + s.hop * 0.05, Math.sin(a) * 0.3);
      sp.material.opacity = Math.sin(life * Math.PI);
      sp.scale.setScalar(0.07 + (i % 2) * 0.02);
    });
  });
  return (
    <group>
      <sprite ref={main}>
        <spriteMaterial map={quality === "groggy" ? rain : sun} transparent depthWrite={false} toneMapped={false} />
      </sprite>
      <sprite ref={extra}>
        <spriteMaterial map={batteries[1]} transparent depthWrite={false} toneMapped={false} />
      </sprite>
      {Array.from({ length: 6 }, (_, i) => (
        <sprite key={i} ref={(el) => (sparkles.current[i] = el)}>
          <spriteMaterial map={i % 2 ? heart : sparkle} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

function useEyeBags(rig, enabled) {
  const bags = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ color: "#7b6a8f", roughness: 1, transparent: true, opacity: 0.85 });
    return [rig.eyeBagOffsetLeft, rig.eyeBagOffsetRight].map((offset) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), mat);
      m.position.copy(offset);
      m.scale.set(0.085, 0.022, 0.02);
      return m;
    });
  }, [rig]);
  useEffect(() => {
    if (!enabled) return undefined;
    bags.forEach((b) => rig.head.add(b));
    return () => bags.forEach((b) => rig.head.remove(b));
  }, [bags, enabled, rig]);
}

export function WokeRig({ rig, quality }) {
  const bodyRef = useRef(null);
  const tmp = useMemo(() => ({ target: new THREE.Vector3(), eye: new THREE.Vector3() }), []);
  useEyeBags(rig, quality === "groggy");

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = wokeState(t);
    const good = quality === "good";
    const poor = quality === "groggy";
    const sway = Math.sin(t * (poor ? 0.8 : 1.3));

    if (bodyRef.current) {
      const hop = good ? s.hop : 0;
      const tall = (good ? s.stretch : 0) * 0.06 + (quality === "fair" ? s.yawn * 0.04 : 0) + (poor ? s.yawn * 0.02 : 0);
      const slump = poor ? 0.04 : 0;
      bodyRef.current.scale.set(1 - tall * 0.4 + slump * 0.5, 1 + tall - slump, 1 - tall * 0.4 + slump * 0.5);
      bodyRef.current.position.y = hop * 0.13;
      bodyRef.current.rotation.z = sway * (poor ? 0.05 : 0.025) + (good ? Math.sin(t * 6) * 0.04 * s.hop : 0);
    }

    rig.head.position.copy(rig.headBase);
    if (good) {
      rig.head.rotation.set(-s.stretch * 0.2 - s.hop * 0.05, Math.sin(t * 1.1) * 0.08, sway * 0.06);
    } else if (poor) {
      rig.head.rotation.set(0.28 - s.yawn * 0.3 + Math.sin(t * 0.8) * 0.04, Math.sin(t * 0.6) * 0.05, 0.12 + sway * 0.06);
    } else {
      rig.head.rotation.set(0.08 - s.yawn * 0.25 + s.rub * 0.06, Math.sin(t * 0.9) * 0.06 + Math.sin(t * 24) * 0.22 * s.shake, sway * 0.05 + s.rub * 0.08);
    }

    const squint = good ? 1 : poor ? 0.75 - s.yawn * 0.5 : 0.62 + s.shake * 0.35 - s.yawn * 0.4 - s.rub * 0.3;
    [rig.eyeLeft, rig.eyeRight].forEach((e) => e.inner.forEach((g) => g.scale.set(1, Math.max(0.2, squint), 1)));
    const droop = poor ? 0.32 : good ? -0.05 + s.hop * 0.15 : 0.12;
    const flop = quality === "fair" ? Math.sin(t * 24) * 0.25 * s.shake : 0;
    rig.earLeft.rotation.z = droop + Math.sin(t * 2) * 0.03 + flop + (quality === "fair" ? 0.18 : 0);
    rig.earRight.rotation.z = -droop - Math.sin(t * 2 + 1) * 0.03 + flop;

    const mouthOpen = good ? 0.2 + s.hop * 0.3 : s.yawn;
    rig.mouth.visible = good || s.yawn > 0.02;
    rig.mouth.scale.set(0.022 + mouthOpen * 0.022, 0.005 + mouthOpen * (good ? 0.012 : 0.05), 0.012);

    if (good) {
      tmp.target.set(-0.28, 1.85, 0.05);
      aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, tmp.target, s.stretch + s.hop * 0.6);
      tmp.target.set(0.28, 1.85, 0.05);
      aimArm(rig.armRight, rig.shoulderRight, rig.restRight, tmp.target, s.stretch + s.hop * 0.6);
    } else {
      headPoint(rig, rig.eyeOffsetRight, tmp.eye);
      tmp.target.copy(tmp.eye).add(new THREE.Vector3(Math.sin(t * 9) * 0.04, -0.04, 0.12));
      const rub = quality === "fair" ? s.rub : 0;
      aimArm(rig.armRight, rig.shoulderRight, rig.restRight, tmp.target, rub * 0.95);
      tmp.target.set(0.3, 1.7, 0.1);
      if (rub < 0.02) aimArm(rig.armRight, rig.shoulderRight, rig.restRight, tmp.target, s.yawn * (poor ? 0.4 : 0.8));
      tmp.target.set(-0.3, 1.7, 0.1);
      aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, tmp.target, s.yawn * (poor ? 0.4 : 0.8));
    }
    rig.bow.rotation.z = sway * 0.05;
  });

  return (
    <group ref={bodyRef}>
      <primitive object={rig.rig} />
      <Weather quality={quality} />
    </group>
  );
}

export default function WokePanda({ quality = "good", variant, ...props }) {
  const q = MODEL_BY_QUALITY[variant || quality] ? variant || quality : "good";
  if (q === "poor") return <SleepyPanda {...props} />;
  return <PandaMood {...props} modelUrl={MODEL_BY_QUALITY[q]} Rig={WokeRig} rigProps={{ quality: q }} />;
}