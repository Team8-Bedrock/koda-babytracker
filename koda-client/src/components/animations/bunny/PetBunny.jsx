import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { smooth, aimArm, headPoint, getTexture } from "../panda/pandaRig";
import { BunnyMood, BUNNY_IDLE_MODEL, BUNNY_HEAD_SCALE as H } from "./bunnyRig";

const FADE_IN = 0.3;
const FADE_OUT = 0.6;
const HEARTS = 6;
const TEARS = 4;
const SOOTHE_HEARTS = 3;

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
let squintTexture = null;
let contentTexture = null;
let thumpTexture = null;
const eyeWidth = (rig, i) => (i ? rig.eyeWidthRight : rig.eyeWidthLeft) || 0.11 * H;

function shutEye(e, amount) {
  const k = Math.min(1, amount * 1.4);
  e.inner.forEach((g) => g.scale.set(1, 1 - k * 0.97, 1));
}


function getHandTexture() {
  if (!handTexture) {
    handTexture = canvasTexture((ctx) => {
      ctx.fillStyle = "#fffafd";
      ctx.strokeStyle = "#cdb4d8";
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      const pad = (x, y, rx, ry) => {
        ctx.beginPath();
        ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      };
      pad(-29, -23, 13, 17);
      pad(-10, -31, 13, 18);
      pad(10, -31, 13, 18);
      pad(29, -23, 13, 17);
      pad(0, 13, 36, 30);
      ctx.fillStyle = "#ffb9cc";
      ctx.strokeStyle = "rgba(196, 120, 150, 0.55)";
      ctx.lineWidth = 3;
      [-29, -10, 10, 29].forEach((x, i) => {
        ctx.beginPath();
        ctx.ellipse(x, i === 0 || i === 3 ? -23 : -31, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(-23, 8);
      ctx.quadraticCurveTo(-22, -5, -10, -4);
      ctx.quadraticCurveTo(-4, -10, 0, -3);
      ctx.quadraticCurveTo(7, -10, 12, -4);
      ctx.quadraticCurveTo(23, -3, 23, 9);
      ctx.quadraticCurveTo(22, 25, 0, 29);
      ctx.quadraticCurveTo(-22, 25, -23, 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }
  return handTexture;
}

function getBlushTexture() {
  if (!blushTexture) {
    blushTexture = canvasTexture((ctx) => {
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, 60);
      g.addColorStop(0, "rgba(255,130,165,0.85)");
      g.addColorStop(0.6, "rgba(255,150,180,0.45)");
      g.addColorStop(1, "rgba(255,170,195,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, 60, 40, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  return blushTexture;
}

function getSquintTexture() {
  if (!squintTexture) {
    squintTexture = canvasTexture((ctx) => {
      ctx.strokeStyle = "#2b1a24";
      ctx.lineWidth = 15;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(-34, -30);
      ctx.lineTo(24, 0);
      ctx.lineTo(-34, 30);
      ctx.stroke();
    });
  }
  return squintTexture;
}

function getContentTexture() {
  if (!contentTexture) {
    contentTexture = canvasTexture((ctx) => {
      ctx.strokeStyle = "#2b1a24";
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-36, -8);
      ctx.quadraticCurveTo(0, 30, 36, -8);
      ctx.stroke();
    });
  }
  return contentTexture;
}

function getThumpTexture() {
  if (!thumpTexture) {
    thumpTexture = canvasTexture((ctx) => {
      ctx.strokeStyle = "rgba(200, 160, 190, 0.9)";
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      [-1, 1].forEach((side) => {
        [0, 1, 2].forEach((k) => {
          const a = (side < 0 ? Math.PI : 0) + (k - 1) * 0.45;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 22, Math.sin(a) * 14);
          ctx.lineTo(Math.cos(a) * 48, Math.sin(a) * 30);
          ctx.stroke();
        });
      });
    });
  }
  return thumpTexture;
}

function petAmount(pet, now, startedAt) {
  const intro = smooth(0, FADE_IN, now - startedAt);
  const outro = 1 - smooth(0, FADE_OUT, now - pet.until);
  return Math.min(intro, outro);
}

function usePetClock(pet, onDone) {
  const started = useRef(null);
  const finished = useRef(false);
  return (now) => {
    if (started.current === null) started.current = now;
    const p = pet.current || { until: now, x: null };
    const amount = petAmount(p, now, started.current);
    if (now > p.until + FADE_OUT && !finished.current) {
      finished.current = true;
      onDone?.();
    }
    return { p, amount, since: now - started.current, released: now > p.until ? now - p.until : 0 };
  };
}

export function BunnyPetRig({ rig, pet, onDone }) {
  const bodyRef = useRef(null);
  const handRef = useRef(null);
  const blushRefs = useRef([]);
  const heartRefs = useRef([]);
  const stroke = useRef(0);
  const clock = usePetClock(pet, onDone);
  const top = useMemo(() => new THREE.Vector3(), []);
  const cheek = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const hand = getHandTexture();
  const blush = getBlushTexture();
  const heart = getTexture("heart");
  const sparkle = getTexture("sparkle");

  useFrame((state, delta) => {
    const now = performance.now() / 1000;
    const t = state.clock.elapsedTime;
    const { p, amount, since, released } = clock(now);
    const auto = Math.sin(since * 4.2);
    const goal = p.x === null || p.x === undefined ? auto : THREE.MathUtils.clamp(p.x, -1, 1);
    stroke.current += (goal - stroke.current) * Math.min(1, delta * 12);
    const sx = stroke.current;
    const press = (1 - Math.abs(sx) * 0.6) * amount;
    const happy = amount;
    const binky = released > 0 && released < 0.5 ? Math.sin((released / 0.5) * Math.PI) : 0;

    const giggle = Math.abs(Math.sin(t * 15)) * happy;
    if (bodyRef.current) {
      bodyRef.current.rotation.set(0, Math.sin(t * 1.4) * 0.04 * happy, -sx * 0.06 * amount + Math.sin(t * 1.4) * 0.015);
      bodyRef.current.position.y = giggle * 0.008 + binky * 0.14;
      bodyRef.current.scale.set(1 + press * 0.02, 1 - press * 0.025 + binky * 0.05, 1 + press * 0.02);
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(-0.14 * happy + press * 0.06 + giggle * 0.02, sx * 0.1 * amount, -sx * 0.2 * amount);
    rig.head.scale.set(1 + press * 0.035, 1 - press * 0.06, 1 + press * 0.035);
    const closed = smooth(0, 0.6, happy);
    [rig.eyeLeft, rig.eyeRight].forEach((e, i) => {
      e.patch.rotation.z = 0;
      shutEye(e, closed);
    });
    rig.earLeft.rotation.set(-press * 0.4, 0, -press * 1.7 - binky * 1.2 + Math.sin(t * 8) * 0.12 * happy);
    rig.earRight.rotation.set(-press * 0.4, 0, press * 1.7 + binky * 1.2 - Math.sin(t * 8 + 1) * 0.12 * happy);
    rig.nose.scale.set(1 + Math.max(0, Math.sin(t * 26)) * 0.12 * happy, 1, 1);
    rig.mouth.visible = false;

    headPoint(rig, rig.mouthOffset, target);
    target.y -= 0.3;
    target.z += 0.25;
    target.x -= 0.07;
    aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, target, happy * 0.8);
    target.x += 0.14;
    aimArm(rig.armRight, rig.shoulderRight, rig.restRight, target, happy * 0.8);
    rig.legLeft.rotation.x = -Math.max(0, Math.sin(t * 7)) * 0.16 * happy - binky * 0.3;
    rig.legRight.rotation.x = -Math.max(0, Math.sin(t * 7 + Math.PI)) * 0.16 * happy - binky * 0.3;
    rig.bow.rotation.set(0, 0, Math.sin(t * 14) * 0.2 * happy);

    headPoint(rig, rig.headTopOffset, top);
    if (handRef.current) {
      const lift = (1 - amount) * 0.5;
      handRef.current.position.set(top.x + sx * 0.24, top.y + 0.3 - press * 0.08 + lift, top.z + 0.2);
      handRef.current.material.opacity = amount;
      handRef.current.material.rotation = -sx * 0.22 + Math.PI;
      handRef.current.scale.setScalar(0.62);
    }

    [rig.eyeBagOffsetLeft, rig.eyeBagOffsetRight].forEach((offset, i) => {
      const sp = blushRefs.current[i];
      if (!sp) return;
      headPoint(rig, offset, cheek);
      sp.position.set(cheek.x + (i ? 0.025 : -0.025), cheek.y - 0.05 + giggle * 0.004, cheek.z + 0.03);
      sp.scale.set((0.2 + giggle * 0.01) * H, 0.12 * H, 1);
      sp.material.opacity = closed * 0.8;
    });

    heartRefs.current.forEach((sp, i) => {
      if (!sp) return;
      const life = ((t / 2 + i / HEARTS) % 1 + 1) % 1;
      const side = i % 2 ? 1 : -1;
      sp.position.set(side * (0.55 + Math.sin(t * 2 + i) * 0.06), 1.25 * H + life * 0.6, 0.2);
      sp.scale.setScalar(i % 3 === 2 ? 0.08 : 0.12 + life * 0.04);
      sp.material.rotation = Math.sin(t * 3 + i) * 0.3;
      sp.material.opacity = Math.sin(life * Math.PI) * Math.max(happy, binky);
    });
  });

  return (
    <group ref={bodyRef}>
      <primitive object={rig.rig} />
      <sprite ref={handRef} renderOrder={5}>
        <spriteMaterial map={hand} transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} />
      </sprite>
      {[0, 1].map((i) => (
        <sprite key={`b${i}`} ref={(el) => (blushRefs.current[i] = el)} renderOrder={4}>
          <spriteMaterial map={blush} transparent opacity={0} depthTest={false} depthWrite={false} toneMapped={false} />
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

export function BunnyRefuseRig({ rig, pet, onDone }) {
  const bodyRef = useRef(null);
  const handRef = useRef(null);
  const markRef = useRef(null);
  const thumpRef = useRef(null);
  const puffRefs = useRef([]);
  const stroke = useRef(0);
  const clock = usePetClock(pet, onDone);
  const top = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const hand = getHandTexture();
  const anger = getTexture("anger");
  const puff = getTexture("puff");
  const thump = getThumpTexture();

  useFrame((state, delta) => {
    const now = performance.now() / 1000;
    const t = state.clock.elapsedTime;
    const { p, amount, since } = clock(now);
    const goal = p.x === null || p.x === undefined ? Math.sin(since * 2.4) * 0.5 : THREE.MathUtils.clamp(p.x, -1, 1);
    stroke.current += (goal - stroke.current) * Math.min(1, delta * 10);
    const sx = stroke.current;
    const away = smooth(0, 0.35, since) * amount;
    const huff = Math.max(0, Math.sin(t * 7)) * away;
    const beat = (t % 1.1) / 1.1;
    const thumpLift = beat < 0.3 ? Math.sin((beat / 0.3) * Math.PI * 0.5) : beat < 0.38 ? 1 - (beat - 0.3) / 0.08 : 0;
    const impact = beat > 0.37 && beat < 0.55 ? 1 - (beat - 0.37) / 0.18 : 0;
    const dir = sx >= 0 ? 1 : -1;

    if (bodyRef.current) {
      bodyRef.current.position.set(-dir * (0.1 + Math.abs(sx) * 0.15) * away, impact * -0.01 * away, -0.25 * away);
      bodyRef.current.rotation.set(-0.12 * away, sx * 0.3 * away, impact * 0.02 * dir * away);
      bodyRef.current.scale.set(1 + impact * 0.03 * away, 1 - impact * 0.04 * away, 1 + impact * 0.03 * away);
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(-0.25 * away - huff * 0.04, -dir * 0.6 * away, dir * 0.14 * away);
    rig.head.scale.set(1 + huff * 0.02, 1, 1 + huff * 0.02);
    [rig.eyeLeft, rig.eyeRight].forEach((e, i) => {
      e.inner.forEach((g) => g.scale.set(1.12, 1 - 0.92 * away, 1));
      e.patch.rotation.z = (i ? 0.3 : -0.3) * away;
    });
    rig.earLeft.rotation.set(0.6 * away, 0, 0.4 * away);
    rig.earRight.rotation.set(0.6 * away, 0, -0.4 * away);
    rig.nose.scale.set(1 + huff * 0.15, 1 - huff * 0.05, 1);
    rig.mouth.visible = away > 0.05;
    rig.mouth.scale.set(0.024, 0.004 + huff * 0.005, 0.01);

    target.set(rig.shoulderRight.x - 0.05, rig.shoulderRight.y - 0.1, rig.shoulderRight.z + 0.3);
    aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, target, 0.95 * away);
    target.set(rig.shoulderLeft.x + 0.05, rig.shoulderLeft.y - 0.06, rig.shoulderLeft.z + 0.32);
    aimArm(rig.armRight, rig.shoulderRight, rig.restRight, target, 0.95 * away);
    const stomper = dir > 0 ? rig.legRight : rig.legLeft;
    const other = dir > 0 ? rig.legLeft : rig.legRight;
    stomper.rotation.set(-thumpLift * 0.55 * away, 0, 0);
    other.rotation.set(0, 0, 0);
    rig.bow.rotation.set(0, 0, Math.sin(t * 16) * 0.15 * away);

    if (thumpRef.current) {
      const foot = dir > 0 ? rig.shoulderRight : rig.shoulderLeft;
      thumpRef.current.position.set(foot.x * 0.7, 0.05, 0.25);
      thumpRef.current.scale.set((0.35 + (1 - impact) * 0.1) * impact * away + 0.0001, (0.2 + (1 - impact) * 0.06) * impact * away + 0.0001, 1);
      thumpRef.current.material.opacity = impact * away;
    }

    headPoint(rig, rig.headTopOffset, top);
    if (handRef.current) {
      const lift = (1 - amount) * 0.5;
      const hesitate = Math.sin(t * 9) * 0.02;
      handRef.current.position.set(sx * 0.24, top.y + 0.6 + lift + hesitate, 0.3);
      handRef.current.material.opacity = amount;
      handRef.current.material.rotation = -sx * 0.22 + Math.PI;
      handRef.current.scale.setScalar(0.62);
    }
    if (markRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(t * 8);
      markRef.current.position.set(top.x - dir * 0.34, top.y + 0.14, top.z + 0.15);
      markRef.current.scale.setScalar((0.22 + pulse * 0.06) * away);
      markRef.current.material.opacity = away;
    }
    puffRefs.current.forEach((sp, i) => {
      if (!sp) return;
      const life = ((t / 0.9 + i / 4) % 1 + 1) % 1;
      const side = i % 2 ? 1 : -1;
      sp.position.set(top.x + side * (0.42 + life * 0.18), top.y - 0.15 + life * 0.25, top.z);
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
        <sprite ref={thumpRef}>
          <spriteMaterial map={thump} transparent opacity={0} depthWrite={false} toneMapped={false} />
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

export function BunnyComfortRig({ rig, pet, onDone }) {
  const bodyRef = useRef(null);
  const handRef = useRef(null);
  const blushRefs = useRef([]);
  const tearRefs = useRef([]);
  const heartRefs = useRef([]);
  const squintRefs = useRef([]);
  const contentRefs = useRef([]);
  const stroke = useRef(0);
  const clock = usePetClock(pet, onDone);
  const top = useMemo(() => new THREE.Vector3(), []);
  const cheek = useMemo(() => new THREE.Vector3(), []);
  const eye = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const squint = getSquintTexture();
  const content = getContentTexture();
  const hand = getHandTexture();
  const blush = getBlushTexture();
  const tear = getTexture("tear");
  const heart = getTexture("heart");

  useFrame((state, delta) => {
    const now = performance.now() / 1000;
    const t = state.clock.elapsedTime;
    const { p, amount, since } = clock(now);
    const goal = p.x === null || p.x === undefined ? Math.sin(since * 3) : THREE.MathUtils.clamp(p.x, -1, 1);
    stroke.current += (goal - stroke.current) * Math.min(1, delta * 9);
    const sx = stroke.current;
    const press = (1 - Math.abs(sx) * 0.6) * amount;
    const soothe = smooth(0.3, 2.6, since) * amount;
    const sad = amount * (1 - soothe * 0.65);
    const sniff = Math.max(0, Math.sin(t * 5.5)) ** 6 * sad;
    const switchAt = (v) => smooth(0.35, 0.75, soothe / Math.max(amount, 0.001)) * v;

    if (bodyRef.current) {
      bodyRef.current.rotation.set(0.05 * amount, 0, -sx * 0.05 * amount + Math.sin(t * 1.2) * 0.012);
      bodyRef.current.position.y = -0.01 * amount + sniff * 0.012;
      bodyRef.current.scale.set(1 + press * 0.02, 1 - press * 0.025 + sniff * 0.02, 1 + press * 0.02);
    }

    rig.head.position.copy(rig.headBase);
    rig.head.rotation.set(0.14 * sad - 0.16 * soothe + press * 0.05 - sniff * 0.04, sx * 0.07 * amount, -sx * 0.24 * amount + Math.sin(t * 1.3) * 0.03 * amount);
    rig.head.scale.set(1 + press * 0.03, 1 - press * 0.05, 1 + press * 0.03);
    [rig.eyeLeft, rig.eyeRight].forEach((e, i) => {
      shutEye(e, amount);
      e.hideLid = amount > 0.5;
      e.patch.rotation.z = (i ? 0.25 : -0.25) * sad;
      headPoint(rig, i ? rig.eyeOffsetRight : rig.eyeOffsetLeft, eye);
      const sq = squintRefs.current[i];
      if (sq) {
        sq.position.set(eye.x, eye.y + sniff * 0.008, eye.z + 0.03);
        sq.scale.setScalar(eyeWidth(rig, i) * 1.25);
        sq.material.rotation = i ? Math.PI + 0.12 : -0.12;
        sq.material.opacity = amount - switchAt(amount);
      }
      const ct = contentRefs.current[i];
      if (ct) {
        ct.position.set(eye.x, eye.y - 0.005, eye.z + 0.03);
        ct.scale.setScalar(eyeWidth(rig, i) * (1.4 + soothe * 0.08));
        ct.material.rotation = i ? -0.1 : 0.1;
        ct.material.opacity = switchAt(amount);
      }
    });
    rig.earLeft.rotation.set(0.5 * sad - 0.2 * soothe, 0, 0.3 * sad - 0.5 * soothe + Math.sin(t * 2.2) * 0.05 * amount);
    rig.earRight.rotation.set(0.5 * sad - 0.2 * soothe, 0, -0.3 * sad + 0.5 * soothe - Math.sin(t * 2.2 + 1) * 0.05 * amount);
    rig.nose.scale.set(1 + sniff * 0.2, 1 - sniff * 0.08, 1);
    rig.mouth.visible = amount > 0.05;
    rig.mouth.scale.set((0.022 + soothe * 0.01) * amount + 0.001, (0.007 + Math.abs(Math.sin(t * 9)) * 0.003 * sad + sniff * 0.004) * amount + 0.001, 0.01);

    headPoint(rig, rig.mouthOffset, target);
    target.y -= 0.34;
    target.z += 0.24;
    const tremble = Math.sin(t * 14) * 0.008 * sad;
    target.x -= 0.05;
    target.y += tremble;
    aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, target, amount * 0.85);
    target.x += 0.1;
    aimArm(rig.armRight, rig.shoulderRight, rig.restRight, target, amount * 0.85);
    rig.legLeft.rotation.x = Math.sin(t * 2) * 0.04 * sad;
    rig.legRight.rotation.x = -Math.sin(t * 2) * 0.04 * sad;
    rig.bow.rotation.set(0, 0, Math.sin(t * 1.5) * 0.03 + Math.sin(t * 12) * 0.15 * soothe);

    headPoint(rig, rig.headTopOffset, top);
    if (handRef.current) {
      const lift = (1 - amount) * 0.5;
      handRef.current.position.set(top.x + sx * 0.2, top.y + 0.3 - press * 0.08 + lift, top.z + 0.2);
      handRef.current.material.opacity = amount;
      handRef.current.material.rotation = -sx * 0.18 + Math.PI;
      handRef.current.scale.setScalar(0.62);
    }

    [rig.eyeBagOffsetLeft, rig.eyeBagOffsetRight].forEach((offset, i) => {
      const sp = blushRefs.current[i];
      if (!sp) return;
      headPoint(rig, offset, cheek);
      sp.position.set(cheek.x + (i ? 0.06 : -0.06), cheek.y - 0.02, cheek.z + 0.08);
      sp.scale.set(0.22 * H, 0.14 * H, 1);
      sp.material.opacity = soothe * 0.85;
    });

    tearRefs.current.forEach((sp, i) => {
      if (!sp) return;
      const side = i % 2;
      headPoint(rig, side ? rig.eyeOffsetRight : rig.eyeOffsetLeft, eye);
      const life = ((t * 0.7 + Math.floor(i / 2) * 0.5 + side * 0.25) % 1 + 1) % 1;
      sp.position.set(eye.x + (side ? 0.04 : -0.04), eye.y - 0.04 - life * 0.22, eye.z + 0.07);
      sp.scale.setScalar(0.055 * (1 - life * 0.3));
      sp.material.opacity = Math.sin(life * Math.PI) * sad * (1 - soothe * 0.7);
    });

    const warm = smooth(0.5, 0.9, soothe);
    heartRefs.current.forEach((sp, i) => {
      if (!sp) return;
      const life = ((t / 2.4 + i / SOOTHE_HEARTS) % 1 + 1) % 1;
      const side = i % 2 ? 1 : -1;
      sp.position.set(side * (0.42 + Math.sin(t * 1.6 + i) * 0.05), 1.3 + life * 0.45, 0.2);
      sp.scale.setScalar(0.09 + life * 0.03);
      sp.material.rotation = Math.sin(t * 2 + i) * 0.25;
      sp.material.opacity = Math.sin(life * Math.PI) * warm * amount;
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
      {[0, 1].map((i) => (
        <sprite key={`sq${i}`} ref={(el) => (squintRefs.current[i] = el)} renderOrder={6}>
          <spriteMaterial map={squint} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      {[0, 1].map((i) => (
        <sprite key={`ct${i}`} ref={(el) => (contentRefs.current[i] = el)} renderOrder={6}>
          <spriteMaterial map={content} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      {Array.from({ length: TEARS }, (_, i) => (
        <sprite key={`t${i}`} ref={(el) => (tearRefs.current[i] = el)} renderOrder={4}>
          <spriteMaterial map={tear} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      {Array.from({ length: SOOTHE_HEARTS }, (_, i) => (
        <sprite key={`h${i}`} ref={(el) => (heartRefs.current[i] = el)}>
          <spriteMaterial map={heart} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

export default function PetBunny({ pet, onDone, refuse = false, comfort = false, ...props }) {
  if (refuse) {
    return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={BunnyRefuseRig} rigProps={{ pet, onDone }} />;
  }
  if (comfort) {
    return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={BunnyComfortRig} rigProps={{ pet, onDone }} />;
  }
  return <BunnyMood {...props} modelUrl={BUNNY_IDLE_MODEL} Rig={BunnyPetRig} rigProps={{ pet, onDone }} />;
}