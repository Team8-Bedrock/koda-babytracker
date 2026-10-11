import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { PandaMood, PANDA_IDLE_MODEL, smooth, pulse, aimArm, headPoint, getTexture } from "./pandaRig";

const CYCLE = 5.4;
const CHANGE_START = 0.38;
const CHANGE_END = 0.5;
const CLEAN = new THREE.Color("#ffffff");
const USED = { wet: new THREE.Color("#f4e6a6"), dirty: new THREE.Color("#d9c4a0"), mixed: new THREE.Color("#e3d09c") };

function normalizeType(variant) {
  const v = String(variant || "").toLowerCase();
  if (v.includes("mix") || v.includes("both")) return "mixed";
  if (v.includes("dirty") || v.includes("poop") || v.includes("soiled")) return "dirty";
  return "wet";
}

function diaperState(t) {
  const u = (t % CYCLE) / CYCLE;
  return {
    u,
    before: 1 - smooth(CHANGE_START, CHANGE_START + 0.04, u),
    poof: pulse(CHANGE_START - 0.02, CHANGE_END + 0.04, u),
    clean: smooth(CHANGE_END - 0.04, CHANGE_END + 0.04, u),
    dance: smooth(CHANGE_END, CHANGE_END + 0.08, u) * (1 - smooth(0.96, 1, u)),
  };
}

const ICON = new THREE.Vector3(0.66, 0.8, 0.2);

function DiaperIcon({ type }) {
  const ref = useRef(null);
  const texture = getTexture("diaper");
  const used = USED[type];
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    const s = diaperState(t);
    ref.current.position.set(ICON.x, ICON.y + Math.sin(t * 2.2) * 0.04 + s.dance * Math.abs(Math.sin(t * 5.5)) * 0.06, ICON.z);
    ref.current.material.color.copy(used).lerp(CLEAN, s.clean);
    ref.current.material.rotation = Math.sin(t * 1.8) * 0.12 + s.before * Math.sin(t * 7) * 0.08;
    ref.current.scale.setScalar(0.4 * (1 - s.poof * 0.35) + s.dance * 0.03);
  });
  return (
    <sprite ref={ref}>
      <spriteMaterial map={texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  );
}

function Effects({ type }) {
  const refs = useRef([]);
  const drop = getTexture("drop");
  const stink = getTexture("stink");
  const puff = getTexture("puff");
  const sparkle = getTexture("sparkle");
  const bubble = getTexture("bubble");
  const wet = type === "wet" || type === "mixed";
  const dirty = type === "dirty" || type === "mixed";
  const layout = useMemo(() => {
    const list = [];
    if (wet) for (let i = 0; i < 3; i++) list.push({ kind: "drop", i });
    if (dirty) for (let i = 0; i < 3; i++) list.push({ kind: "stink", i });
    for (let i = 0; i < 5; i++) list.push({ kind: "puff", i });
    for (let i = 0; i < 4; i++) list.push({ kind: "sparkle", i });
    for (let i = 0; i < 4; i++) list.push({ kind: "bubble", i });
    return list;
  }, [wet, dirty]);
  const maps = { drop, stink, puff, sparkle, bubble };

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = diaperState(t);
    const base = ICON;
    refs.current.forEach((sp, n) => {
      if (!sp) return;
      const { kind, i } = layout[n];
      if (kind === "drop") {
        const life = ((t / 0.9 + i / 3) % 1 + 1) % 1;
        const side = i - 1;
        sp.position.set(base.x + side * 0.1, base.y - 0.12 - life * 0.32, base.z + 0.05);
        sp.scale.setScalar(0.08);
        sp.material.opacity = s.before * Math.sin(life * Math.PI);
      } else if (kind === "stink") {
        const life = ((t / 1.6 + i / 3) % 1 + 1) % 1;
        const side = i - 1;
        sp.position.set(base.x + side * 0.14 + Math.sin(t * 3 + i) * 0.04, base.y + 0.15 + life * 0.45, base.z + 0.05);
        sp.scale.setScalar(0.15 + life * 0.05);
        sp.material.rotation = Math.sin(t * 2 + i) * 0.2;
        sp.material.opacity = s.before * Math.sin(life * Math.PI) * 0.9;
      } else if (kind === "puff") {
        const a = (i / 5) * Math.PI * 2;
        sp.position.set(base.x + Math.cos(a) * 0.14 * (0.6 + s.poof * 0.7), base.y + Math.sin(a) * 0.12, base.z + 0.08);
        sp.scale.setScalar(0.12 + s.poof * 0.24);
        sp.material.opacity = s.poof;
      } else if (kind === "sparkle") {
        const tw = 0.5 + 0.5 * Math.sin(t * 6 + i * 1.7);
        const a = (i / 4) * Math.PI * 2 + 0.5;
        sp.position.set(base.x + Math.cos(a) * 0.26, base.y + Math.sin(a) * 0.22, base.z + 0.06);
        sp.scale.setScalar(0.05 + tw * 0.06);
        sp.material.opacity = s.clean * (0.4 + tw * 0.6);
      } else {
        const life = ((t / 2.4 + i / 4) % 1 + 1) % 1;
        const side = i % 2 ? 1 : -1;
        sp.position.set(side * (0.5 + Math.sin(t * 2 + i) * 0.06) - 0.08, 0.5 + life * 1.0, 0.2);
        sp.scale.setScalar(0.08 + (i % 3) * 0.025);
        sp.material.opacity = s.clean * Math.sin(life * Math.PI) * 0.95;
      }
    });
  });

  return (
    <group>
      {layout.map(({ kind, i }, n) => (
        <sprite key={`${kind}-${i}`} ref={(el) => (refs.current[n] = el)}>
          <spriteMaterial map={maps[kind]} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

export function DiaperRig({ rig, variant }) {
  const type = normalizeType(variant);
  const bodyRef = useRef(null);
  const nose = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const s = diaperState(t);
    const squirm = s.before * Math.sin(t * 7);
    const groove = s.dance * Math.sin(t * 5.5);

    if (bodyRef.current) {
      bodyRef.current.position.set(groove * 0.05, s.dance * Math.abs(Math.sin(t * 5.5)) * 0.06, 0);
      bodyRef.current.rotation.z = squirm * 0.05 - groove * 0.08;
      bodyRef.current.rotation.y = groove * 0.18;
    }

    const holdNose = type !== "wet" ? s.before * smooth(0.04, 0.12, s.u) : 0;
    const peek = type === "wet" ? s.before : 0;

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(0.06 * peek + 0.18 * peek * smooth(0.05, 0.15, s.u) - s.dance * 0.06, holdNose * -0.35 + groove * 0.1, holdNose * 0.12 + groove * 0.12);
    [rig.eyeLeft, rig.eyeRight].forEach((e) =>
      e.inner.forEach((g) => g.scale.set(1, 1 - holdNose * 0.45 + peek * 0.12 - s.dance * 0.45, 1)),
    );
    rig.earLeft.rotation.z = 0.04 + s.dance * Math.abs(Math.sin(t * 5.5)) * 0.25 - holdNose * 0.1;
    rig.earRight.rotation.z = -0.04 - s.dance * Math.abs(Math.sin(t * 5.5)) * 0.25 + holdNose * 0.1;

    rig.mouth.visible = true;
    rig.mouth.scale.set(0.018 + s.dance * 0.012, 0.008 + peek * 0.01 + s.dance * 0.01, 0.01);

    headPoint(rig, rig.noseOffset, nose);
    target.copy(nose);
    target.z += 0.12;
    aimArm(rig.armRight, rig.shoulderRight, rig.restRight, target, holdNose * 0.95);
    target.set(-0.55, 0.95 + Math.max(0, groove) * 0.5, 0.2);
    aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, target, s.dance * 0.85);
    if (s.dance > 0.01) {
      target.set(0.55, 0.95 + Math.max(0, -groove) * 0.5, 0.2);
      aimArm(rig.armRight, rig.shoulderRight, rig.restRight, target, s.dance * 0.85);
    }

    rig.legLeft.rotation.z = -Math.max(0, squirm) * 0.12;
    rig.legRight.rotation.z = Math.max(0, -squirm) * 0.12;
    rig.legLeft.rotation.x = -Math.max(0, groove) * 0.3;
    rig.legRight.rotation.x = -Math.max(0, -groove) * 0.3;
    rig.bow.rotation.z = groove * 0.12;
  });

  return (
    <group ref={bodyRef}>
      <primitive object={rig.rig} />
      <DiaperIcon type={type} />
      <Effects type={type} />
    </group>
  );
}

export default function DiaperPanda({ variant, type, ...props }) {
  return <PandaMood {...props} modelUrl={PANDA_IDLE_MODEL} Rig={DiaperRig} rigProps={{ variant: variant || type }} />;
}