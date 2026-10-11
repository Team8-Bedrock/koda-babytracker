import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PandaMood, PANDA_IDLE_MODEL, smooth, pulse, aimArm, getTexture } from "./pandaRig";

const CYCLE = 3.2;
const HOLD = new THREE.Vector3(0, 0.78, 0.36);
const HIGH = new THREE.Vector3(0.02, 1.6, 0.32);
const FLOOR = new THREE.Vector3(0, 0.1, 0.5);
const BALL_RADIUS = 0.15;

function playState(t) {
  const u = (t % CYCLE) / CYCLE;
  const toss = u >= 0.12 && u < 0.52 ? (u - 0.12) / 0.4 : -1;
  const bounce = u >= 0.62 && u < 0.92 ? (u - 0.62) / 0.3 : -1;
  return {
    u,
    toss,
    bounce,
    reachUp: smooth(0.04, 0.14, u) * (1 - smooth(0.16, 0.24, u)) + smooth(0.4, 0.5, u) * (1 - smooth(0.54, 0.62, u)),
    hop: pulse(0.52, 0.62, u),
    look: toss >= 0 ? Math.sin(toss * Math.PI) : bounce >= 0 ? -Math.sin(bounce * Math.PI) * 0.6 : 0,
  };
}

function ballPosition(s, out) {
  if (s.toss >= 0) {
    out.lerpVectors(HOLD, HIGH, Math.sin(s.toss * Math.PI));
  } else if (s.bounce >= 0) {
    out.lerpVectors(HOLD, FLOOR, Math.sin(s.bounce * Math.PI));
  } else {
    out.copy(HOLD);
  }
  return out;
}

function Ball() {
  const ref = useRef(null);
  const shadow = useRef(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const texture = getTexture("ball");
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const s = playState(t);
    ballPosition(s, tmp);
    const onFloor = s.bounce >= 0 ? Math.max(0, Math.sin(s.bounce * Math.PI) - 0.9) * 10 : 0;
    ref.current.position.copy(tmp);
    ref.current.position.y += s.hop * 0.08;
    ref.current.scale.set(1 + onFloor * 0.25, 1 - onFloor * 0.3, 1 + onFloor * 0.25);
    ref.current.rotation.x = t * 5;
    ref.current.rotation.z = t * 1.5;
    if (shadow.current) {
      const h = Math.min(1, tmp.y / 2);
      shadow.current.position.set(tmp.x, 0.015, tmp.z);
      shadow.current.scale.setScalar(0.9 - h * 0.5);
      shadow.current.material.opacity = 0.3 - h * 0.18;
    }
  });
  return (
    <group>
      <mesh ref={ref} castShadow>
        <sphereGeometry args={[BALL_RADIUS, 28, 20]} />
        <meshStandardMaterial map={texture} roughness={0.55} />
      </mesh>
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[BALL_RADIUS * 1.1, 24]} />
        <meshBasicMaterial color="#3a2a1a" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Fun() {
  const refs = useRef([]);
  const star = getTexture("star");
  const sparkle = getTexture("sparkle");
  const note = getTexture("note");
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = playState(t);
    refs.current.forEach((sp, i) => {
      if (!sp) return;
      if (i < 4) {
        const burst = pulse(0.48, 0.7, s.u);
        const a = (i / 4) * Math.PI * 2 + 0.4;
        sp.position.set(HIGH.x + Math.cos(a) * (0.12 + burst * 0.25), 1.4 + Math.sin(a) * (0.1 + burst * 0.2), 0.3);
        sp.scale.setScalar(0.06 + burst * 0.08);
        sp.material.opacity = burst;
      } else {
        const side = i === 4 ? -1 : 1;
        const life = ((t / 2.2 + (i - 4) * 0.5) % 1 + 1) % 1;
        sp.position.set(side * (0.6 + life * 0.15), 1.05 + life * 0.6, 0.15);
        sp.scale.setScalar(0.14);
        sp.material.rotation = Math.sin(t * 3 + i) * 0.3;
        sp.material.opacity = Math.sin(life * Math.PI);
      }
    });
  });
  return (
    <group>
      {Array.from({ length: 6 }, (_, i) => (
        <sprite key={i} ref={(el) => (refs.current[i] = el)}>
          <spriteMaterial map={i < 4 ? (i % 2 ? star : sparkle) : note} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

export function PlaytimeRig({ rig }) {
  const bodyRef = useRef(null);
  const ball = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = playState(t);
    ballPosition(s, ball);

    if (bodyRef.current) {
      bodyRef.current.position.y = s.hop * 0.08 + Math.abs(Math.sin(t * 4)) * 0.012;
      const squash = s.hop > 0 ? 0 : pulse(0.6, 0.66, s.u) * 0.05;
      bodyRef.current.scale.set(1 + squash, 1 - squash, 1 + squash);
      bodyRef.current.rotation.z = Math.sin(t * 2) * 0.03;
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(-0.05 - s.look * 0.38, Math.sin(t * 1.3) * 0.05, Math.sin(t * 2) * 0.05);
    [rig.eyeLeft, rig.eyeRight].forEach((e) => e.inner.forEach((g) => g.scale.set(1.05, 1.08 + s.hop * 0.08, 1)));
    rig.earLeft.rotation.z = 0.04 + s.hop * 0.25;
    rig.earRight.rotation.z = -0.04 - s.hop * 0.25;

    rig.mouth.visible = true;
    rig.mouth.scale.set(0.028, 0.012 + Math.max(s.hop, s.look * 0.5) * 0.014, 0.012);

    const holding = s.toss < 0 && s.bounce < 0;
    const amount = holding ? 0.9 : 0.55 + s.reachUp * 0.4;
    const aim = holding || s.reachUp > 0.2 ? ball : HOLD;
    target.copy(aim);
    target.x -= 0.16;
    aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, target, amount);
    target.copy(aim);
    target.x += 0.16;
    aimArm(rig.armRight, rig.shoulderRight, rig.restRight, target, amount);

    rig.legLeft.rotation.x = -s.hop * 0.3;
    rig.legRight.rotation.x = -s.hop * 0.2;
    rig.bow.rotation.z = Math.sin(t * 4) * 0.08;
  });

  return (
    <group>
      <group ref={bodyRef}>
        <primitive object={rig.rig} />
      </group>
      <Ball />
      <Fun />
    </group>
  );
}

export default function PlaytimePanda(props) {
  return <PandaMood {...props} modelUrl={PANDA_IDLE_MODEL} Rig={PlaytimeRig} />;
}