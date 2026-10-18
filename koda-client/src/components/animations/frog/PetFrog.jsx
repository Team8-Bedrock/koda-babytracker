import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { smooth, aimArm, headPoint, getTexture } from "../panda/pandaRig";
import { FrogMood, FROG_IDLE_MODEL, FROG_MODELS } from "./frogRig";
import { ComfortRig } from "../panda/PetPanda";

const FADE_IN = 0.3;
const FADE_OUT = 0.6;
const HEARTS = 6;

function canvasTexture(draw) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.translate(64, 64);
  draw(ctx);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

let handTexture = null;
let blushTexture = null;

function getHandTexture() {
  if (!handTexture) {
    handTexture = canvasTexture((ctx) => {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      const fingers = [
        [-34, -30, -0.5],
        [-12, -42, -0.15],
        [12, -42, 0.15],
        [34, -30, 0.5],
      ];
      ctx.fillStyle = "#b9e88a";
      ctx.strokeStyle = "#6fae45";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-34, -30);
      ctx.quadraticCurveTo(-23, -14, -12, -42);
      ctx.quadraticCurveTo(0, -18, 12, -42);
      ctx.quadraticCurveTo(23, -14, 34, -30);
      ctx.quadraticCurveTo(40, 4, 28, 22);
      ctx.quadraticCurveTo(0, 40, -28, 22);
      ctx.quadraticCurveTo(-40, 4, -34, -30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      fingers.forEach(([x, y, a]) => {
        ctx.save();
        ctx.translate(x * 0.55, y * 0.35 + 6.3);
        ctx.rotate(a);
        ctx.beginPath();
        ctx.roundRect(-7, -34, 14, 38, 7);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });
      ctx.beginPath();
      ctx.ellipse(0, 10, 30, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e4f9c4";
      ctx.strokeStyle = "rgba(90, 150, 60, 0.6)";
      ctx.lineWidth = 3;
      fingers.forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.ellipse(0, 12, 17, 12, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(228, 249, 196, 0.85)";
      ctx.fill();
    });
  }
  return handTexture;
}

function getBlushTexture() {
  if (!blushTexture) {
    blushTexture = canvasTexture((ctx) => {
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 60);
      g.addColorStop(0, "rgba(255,120,140,0.85)");
      g.addColorStop(0.6, "rgba(255,140,160,0.45)");
      g.addColorStop(1, "rgba(255,160,180,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, 60, 40, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  return blushTexture;
}

function petAmount(pet, now, startedAt) {
  const intro = smooth(0, FADE_IN, now - startedAt);
  const outro = 1 - smooth(0, FADE_OUT, now - pet.until);
  return Math.min(intro, outro);
}

export function PetRig({ rig, pet, onDone }) {
  const bodyRef = useRef(null);
  const handRef = useRef(null);
  const blushRefs = useRef([]);
  const heartRefs = useRef([]);
  const started = useRef(null);
  const finished = useRef(false);
  const stroke = useRef(0);
  const top = useMemo(() => new THREE.Vector3(), []);
  const cheek = useMemo(() => new THREE.Vector3(), []);
  const hand = getHandTexture();
  const blush = getBlushTexture();
  const heart = getTexture("heart");
  const sparkle = getTexture("sparkle");

  useFrame((state, delta) => {
    const now = performance.now() / 1000;
    const t = state.clock.elapsedTime;
    if (started.current === null) started.current = now;
    const p = pet.current || { until: now, x: null };
    const amount = petAmount(p, now, started.current);
    if (now > p.until + FADE_OUT && !finished.current) {
      finished.current = true;
      onDone?.();
    }

    const auto = Math.sin((now - started.current) * 4.2);
    const goal = p.x === null || p.x === undefined ? auto : THREE.MathUtils.clamp(p.x, -1, 1);
    stroke.current += (goal - stroke.current) * Math.min(1, delta * 12);
    const sx = stroke.current;
    const press = (1 - Math.abs(sx) * 0.6) * amount;
    const happy = amount;

    if (bodyRef.current) {
      bodyRef.current.rotation.z = -sx * 0.05 * amount + Math.sin(t * 1.4) * 0.015;
      bodyRef.current.position.y = Math.abs(Math.sin(t * 3)) * 0.015 * happy;
      bodyRef.current.scale.set(1 + press * 0.015, 1 - press * 0.02, 1 + press * 0.015);
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(-0.12 * happy + press * 0.05, sx * 0.08 * amount, -sx * 0.16 * amount);
    rig.head.scale.set(1 + press * 0.03, 1 - press * 0.05, 1 + press * 0.03);
    [rig.eyeLeft, rig.eyeRight].forEach((e) => e.inner.forEach((g) => g.scale.set(1 + happy * 0.1, 1 - happy * 0.68, 1)));
    rig.earLeft.rotation.z = happy * 0.06 - press * 0.03 + Math.sin(t * 9) * 0.012 * happy;
    rig.earRight.rotation.z = -happy * 0.06 + press * 0.03 - Math.sin(t * 9 + 1) * 0.012 * happy;

    if (rig.mouthLine) rig.mouthLine.visible = false;
    rig.mouth.visible = happy > 0.05;
    rig.mouth.scale.set(0.035 * happy + 0.001, 0.016 * happy + 0.001, 0.012);

    [
      [rig.armLeft, -1],
      [rig.armRight, 1],
    ].forEach(([arm, side]) => {
      const flutter = Math.sin(t * 11 + (side < 0 ? 0 : Math.PI)) * 0.1;
      arm.quaternion.identity();
      arm.rotation.set((-0.12 + flutter * 0.5) * happy, 0, side * (0.22 + flutter + press * 0.06) * happy);
    });
    rig.legLeft.rotation.x = -Math.max(0, Math.sin(t * 6)) * 0.12 * happy;
    rig.legRight.rotation.x = -Math.max(0, Math.sin(t * 6 + Math.PI)) * 0.12 * happy;
    rig.bow.rotation.z = Math.sin(t * 2) * 0.05;

    headPoint(rig, rig.headTopOffset, top);
    if (handRef.current) {
      const lift = (1 - amount) * 0.5;
      handRef.current.position.set(top.x + sx * 0.24, top.y + 0.26 - press * 0.07 + lift, top.z + 0.2);
      handRef.current.material.opacity = amount;
      handRef.current.material.rotation = -sx * 0.22 + Math.PI;
      handRef.current.scale.setScalar(0.6);
    }

    [rig.eyeBagOffsetLeft, rig.eyeBagOffsetRight].forEach((offset, i) => {
      const sp = blushRefs.current[i];
      if (!sp) return;
      headPoint(rig, offset, cheek);
      sp.position.set(cheek.x + (i ? 0.03 : -0.03), cheek.y, cheek.z + 0.04);
      sp.scale.set(0.26, 0.16, 1);
      sp.material.opacity = happy * 0.9;
    });

    heartRefs.current.forEach((sp, i) => {
      if (!sp) return;
      const life = ((t / 2 + i / HEARTS) % 1 + 1) % 1;
      const side = i % 2 ? 1 : -1;
      sp.position.set(side * (0.68 + Math.sin(t * 2 + i) * 0.06), top.y - 0.2 + life * 0.6, 0.2);
      sp.scale.setScalar(i % 3 === 2 ? 0.08 : 0.12 + life * 0.04);
      sp.material.rotation = Math.sin(t * 3 + i) * 0.3;
      sp.material.opacity = Math.sin(life * Math.PI) * happy;
    });
  });

  return (
    <group ref={bodyRef}>
      <primitive object={rig.rig} />
      <sprite ref={handRef} renderOrder={5}>
        <spriteMaterial map={hand} transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} />
      </sprite>
      {[0, 1].map((i) => (
        <sprite key={`b${i}`} ref={(el) => (blushRefs.current[i] = el)}>
          <spriteMaterial map={blush} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      {Array.from({ length: HEARTS }, (_, i) => (
        <sprite key={`h${i}`} ref={(el) => (heartRefs.current[i] = el)}>
          <spriteMaterial map={i % 3 === 2 ? sparkle : heart} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

export function RefuseRig({ rig, pet, onDone }) {
  const bodyRef = useRef(null);
  const handRef = useRef(null);
  const markRef = useRef(null);
  const puffRefs = useRef([]);
  const started = useRef(null);
  const finished = useRef(false);
  const stroke = useRef(0);
  const top = useMemo(() => new THREE.Vector3(), []);
  const left = useMemo(() => new THREE.Vector3(0.2, 0.62, 0.42), []);
  const right = useMemo(() => new THREE.Vector3(-0.2, 0.68, 0.45), []);
  const hand = getHandTexture();
  const anger = getTexture("anger");
  const puff = getTexture("puff");

  useFrame((state, delta) => {
    const now = performance.now() / 1000;
    const t = state.clock.elapsedTime;
    if (started.current === null) started.current = now;
    const p = pet.current || { until: now, x: null };
    const amount = petAmount(p, now, started.current);
    if (now > p.until + FADE_OUT && !finished.current) {
      finished.current = true;
      onDone?.();
    }

    const since = now - started.current;
    const goal = p.x === null || p.x === undefined ? Math.sin(since * 2.4) * 0.5 : THREE.MathUtils.clamp(p.x, -1, 1);
    stroke.current += (goal - stroke.current) * Math.min(1, delta * 10);
    const sx = stroke.current;
    const away = smooth(0, 0.35, since) * amount;
    const huff = Math.max(0, Math.sin(t * 7)) * away;
    const stomp = Math.max(0, Math.sin(t * 5.5)) ** 4 * away;

    if (bodyRef.current) {
      bodyRef.current.position.set(-(sx >= 0 ? 1 : -1) * (0.12 + Math.abs(sx) * 0.18) * away, stomp * 0.03, -0.3 * away);
      bodyRef.current.rotation.set(-0.16 * away, sx * 0.25 * away, sx * 0.08 * away + Math.sin(t * 18) * 0.012 * away);
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(-0.22 * away - huff * 0.04, (sx >= 0 ? -1 : 1) * 0.55 * away, (sx >= 0 ? 0.12 : -0.12) * away);
    rig.earLeft.rotation.z = -0.06 * away;
    rig.earRight.rotation.z = 0.06 * away;
    rig.earLeft.rotation.x = rig.earRight.rotation.x = 0.08 * away;

    if (rig.mouthLine) rig.mouthLine.visible = false;
    rig.mouth.visible = away > 0.05;
    rig.mouth.scale.set(0.026, 0.005 + huff * 0.006, 0.01);

    aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, left, 0.95 * away);
    aimArm(rig.armRight, rig.shoulderRight, rig.restRight, right, 0.95 * away);
    rig.legLeft.rotation.x = -stomp * 0.35;
    rig.legRight.rotation.x = 0;
    rig.bow.rotation.z = Math.sin(t * 10) * 0.04 * away;

    headPoint(rig, rig.headTopOffset, top);
    if (handRef.current) {
      const lift = (1 - amount) * 0.5;
      const hesitate = Math.sin(t * 9) * 0.02;
      handRef.current.position.set(sx * 0.24, top.y + 0.55 + lift + hesitate, 0.3);
      handRef.current.material.opacity = amount;
      handRef.current.material.rotation = -sx * 0.22 + Math.PI;
      handRef.current.scale.setScalar(0.6);
    }
    if (markRef.current) {
      const beat = 0.5 + 0.5 * Math.sin(t * 8);
      markRef.current.position.set(top.x + (sx >= 0 ? -0.45 : 0.45), top.y + 0.1, top.z + 0.15);
      markRef.current.scale.setScalar((0.22 + beat * 0.06) * away);
      markRef.current.material.opacity = away;
    }
    puffRefs.current.forEach((sp, i) => {
      if (!sp) return;
      const life = ((t / 0.9 + i / 4) % 1 + 1) % 1;
      const side = i % 2 ? 1 : -1;
      sp.position.set(top.x + side * (0.58 + life * 0.18), top.y - 0.12 + life * 0.25, top.z);
      sp.scale.setScalar((0.08 + life * 0.12) * away);
      sp.material.opacity = (1 - life) * 0.8 * away;
    });
  });

  return (
    <group>
      <group ref={bodyRef}>
        <primitive object={rig.rig} />
        <sprite ref={markRef}>
          <spriteMaterial map={anger} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
        {[0, 1, 2, 3].map((i) => (
          <sprite key={i} ref={(el) => (puffRefs.current[i] = el)}>
            <spriteMaterial map={puff} transparent opacity={0} depthWrite={false} toneMapped={false} />
          </sprite>
        ))}
      </group>
      <sprite ref={handRef} renderOrder={5}>
        <spriteMaterial map={hand} transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  );
}

function ComfortNoLine(props) {
  if (props.rig?.mouthLine) props.rig.mouthLine.visible = false;
  return <ComfortRig {...props} />;
}

export default function PetFrog({ pet, onDone, refuse = false, comfort = false, ...props }) {
  if (refuse) {
    return <FrogMood {...props} modelUrl={FROG_MODELS.angry} leaf="angry" Rig={RefuseRig} rigProps={{ pet, onDone }} />;
  }
  if (comfort) {
    return <FrogMood {...props} modelUrl={FROG_MODELS.crying} leaf="comfort" Rig={ComfortNoLine} rigProps={{ pet, onDone, hand: getHandTexture() }} />;
  }
  return <FrogMood {...props} modelUrl={FROG_IDLE_MODEL} leaf="pet" Rig={PetRig} rigProps={{ pet, onDone }} />;
}