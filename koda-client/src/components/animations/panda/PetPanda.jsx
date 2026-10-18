import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { smooth, aimArm, headPoint, getTexture, PandaMood, PANDA_IDLE_MODEL } from "./pandaRig";

const FADE_IN = 0.3;
const FADE_OUT = 0.6;
const HEARTS = 6;
const ANGRY_MODEL = "/models/characters/panda/angry.glb";
const CRYING_MODEL = "/models/characters/panda/crying.glb";

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
            ctx.fillStyle = "#2d2a2e";
            ctx.strokeStyle = "#151316";
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
            ctx.fillStyle = "#5e5459";
            ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
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
    const target = useMemo(() => new THREE.Vector3(), []);
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

        rig.mouth.visible = happy > 0.05;
        rig.mouth.scale.set(0.035 * happy + 0.001, 0.016 * happy + 0.001, 0.012);

        headPoint(rig, rig.mouthOffset, target);
        target.y -= 0.12;
        target.z += 0.25;
        target.x -= 0.1;
        aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, target, happy * 0.75);
        target.x += 0.2;
        aimArm(rig.armRight, rig.shoulderRight, rig.restRight, target, happy * 0.75);
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
            sp.position.set(cheek.x + (i ? 0.06 : -0.06), cheek.y - 0.02, cheek.z + 0.08);
            sp.scale.set(0.2, 0.13, 1);
            sp.material.opacity = happy * 0.9;
        });

        heartRefs.current.forEach((sp, i) => {
            if (!sp) return;
            const life = ((t / 2 + i / HEARTS) % 1 + 1) % 1;
            const side = i % 2 ? 1 : -1;
            sp.position.set(side * (0.45 + Math.sin(t * 2 + i) * 0.06), 1.2 + life * 0.6, 0.2);
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
            markRef.current.position.set(top.x + (sx >= 0 ? -0.3 : 0.3), top.y + 0.12, top.z + 0.15);
            markRef.current.scale.setScalar((0.22 + beat * 0.06) * away);
            markRef.current.material.opacity = away;
        }
        puffRefs.current.forEach((sp, i) => {
            if (!sp) return;
            const life = ((t / 0.9 + i / 4) % 1 + 1) % 1;
            const side = i % 2 ? 1 : -1;
            sp.position.set(top.x + side * (0.38 + life * 0.18), top.y - 0.05 + life * 0.25, top.z);
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

const TEARS = 4;
const SOOTHE_HEARTS = 3;

let squintTexture = null;
let contentTexture = null;

function getSquintTexture() {
    if (!squintTexture) {
        squintTexture = canvasTexture((ctx) => {
            ctx.strokeStyle = "#2b1a12";
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
            ctx.strokeStyle = "#2b1a12";
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

export function ComfortRig({ rig, pet, onDone, hand: handTexture }) {
    const bodyRef = useRef(null);
    const handRef = useRef(null);
    const blushRefs = useRef([]);
    const tearRefs = useRef([]);
    const heartRefs = useRef([]);
    const squintRefs = useRef([]);
    const contentRefs = useRef([]);
    const started = useRef(null);
    const finished = useRef(false);
    const stroke = useRef(0);
    const top = useMemo(() => new THREE.Vector3(), []);
    const cheek = useMemo(() => new THREE.Vector3(), []);
    const eye = useMemo(() => new THREE.Vector3(), []);
    const squint = getSquintTexture();
    const content = getContentTexture();
    const target = useMemo(() => new THREE.Vector3(), []);
    const hand = handTexture || getHandTexture();
    const blush = getBlushTexture();
    const tear = getTexture("tear");
    const heart = getTexture("heart");

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
        const auto = Math.sin(since * 3);
        const goal = p.x === null || p.x === undefined ? auto : THREE.MathUtils.clamp(p.x, -1, 1);
        stroke.current += (goal - stroke.current) * Math.min(1, delta * 9);
        const sx = stroke.current;
        const press = (1 - Math.abs(sx) * 0.6) * amount;
        const soothe = smooth(0.3, 2.6, since) * amount;
        const sad = amount * (1 - soothe * 0.65);
        const sniff = Math.max(0, Math.sin(t * 5.5)) ** 6 * sad;

        if (bodyRef.current) {
            bodyRef.current.rotation.set(0.05 * amount, 0, -sx * 0.04 * amount + Math.sin(t * 1.2) * 0.012);
            bodyRef.current.position.y = -0.01 * amount + sniff * 0.012;
            bodyRef.current.scale.set(1 + press * 0.02, 1 - press * 0.025 + sniff * 0.02, 1 + press * 0.02);
        }

        rig.head.position.copy(rig.headBase);
        rig.head.rotation.set(0.14 * sad - 0.16 * soothe + press * 0.05 - sniff * 0.04, sx * 0.06 * amount, -sx * 0.22 * amount + Math.sin(t * 1.3) * 0.03 * amount);
        rig.head.scale.set(1 + press * 0.03, 1 - press * 0.05, 1 + press * 0.03);
        [rig.eyeLeft, rig.eyeRight].forEach((e, i) => {
            e.inner.forEach((g) => g.scale.set(1 + amount * 0.1, 1 - amount * 0.94, 1));
            e.patch.rotation.z = (i ? 0.25 : -0.25) * sad;
            headPoint(rig, i ? rig.eyeOffsetRight : rig.eyeOffsetLeft, eye);
            const sq = squintRefs.current[i];
            if (sq) {
                sq.position.set(eye.x, eye.y + sniff * 0.008, eye.z + 0.06);
                sq.scale.setScalar(0.1);
                sq.material.rotation = (i ? Math.PI + 0.12 : -0.12);
                sq.material.opacity = amount * (1 - smooth(0.35, 0.75, soothe / Math.max(amount, 0.001)));
            }
            const ct = contentRefs.current[i];
            if (ct) {
                ct.position.set(eye.x, eye.y - 0.005, eye.z + 0.06);
                ct.scale.setScalar(0.1 + soothe * 0.01);
                ct.material.rotation = i ? -0.1 : 0.1;
                ct.material.opacity = amount * smooth(0.35, 0.75, soothe / Math.max(amount, 0.001));
            }
        });
        rig.earLeft.rotation.z = -0.08 * sad + 0.04 * soothe + Math.sin(t * 2.2) * 0.01 * amount;
        rig.earRight.rotation.z = 0.08 * sad - 0.04 * soothe - Math.sin(t * 2.2 + 1) * 0.01 * amount;
        rig.earLeft.rotation.x = rig.earRight.rotation.x = 0.08 * sad;

        rig.mouth.visible = amount > 0.05;
        rig.mouth.scale.set((0.022 + soothe * 0.01) * amount + 0.001, (0.007 + Math.abs(Math.sin(t * 9)) * 0.003 * sad + sniff * 0.004) * amount + 0.001, 0.01);

        headPoint(rig, rig.mouthOffset, target);
        target.y -= 0.32;
        target.z += 0.22;
        const tremble = Math.sin(t * 14) * 0.008 * sad;
        target.x -= 0.05;
        target.y += tremble;
        aimArm(rig.armLeft, rig.shoulderLeft, rig.restLeft, target, amount * 0.85);
        target.x += 0.1;
        aimArm(rig.armRight, rig.shoulderRight, rig.restRight, target, amount * 0.85);
        rig.legLeft.rotation.x = Math.sin(t * 2) * 0.04 * sad;
        rig.legRight.rotation.x = -Math.sin(t * 2) * 0.04 * sad;
        rig.bow.rotation.z = Math.sin(t * 1.5) * 0.03;

        headPoint(rig, rig.headTopOffset, top);
        if (handRef.current) {
            const lift = (1 - amount) * 0.5;
            handRef.current.position.set(top.x + sx * 0.2, top.y + 0.26 - press * 0.08 + lift, top.z + 0.2);
            handRef.current.material.opacity = amount;
            handRef.current.material.rotation = -sx * 0.18 + Math.PI;
            handRef.current.scale.setScalar(0.6);
        }

        [rig.eyeBagOffsetLeft, rig.eyeBagOffsetRight].forEach((offset, i) => {
            const sp = blushRefs.current[i];
            if (!sp) return;
            headPoint(rig, offset, cheek);
            sp.position.set(cheek.x + (i ? 0.06 : -0.06), cheek.y - 0.02, cheek.z + 0.08);
            sp.scale.set(0.2, 0.13, 1);
            sp.material.opacity = soothe * 0.85;
        });

        tearRefs.current.forEach((sp, i) => {
            if (!sp) return;
            const side = i % 2;
            headPoint(rig, side ? rig.eyeOffsetRight : rig.eyeOffsetLeft, eye);
            const life = ((t * 0.7 + Math.floor(i / 2) * 0.5 + side * 0.25) % 1 + 1) % 1;
            sp.position.set(eye.x + (side ? 0.03 : -0.03), eye.y - 0.03 - life * 0.2, eye.z + 0.07);
            sp.scale.setScalar(0.05 * (1 - life * 0.3));
            sp.material.opacity = Math.sin(life * Math.PI) * sad * (1 - soothe * 0.7);
        });

        const warm = smooth(0.5, 0.9, soothe);
        heartRefs.current.forEach((sp, i) => {
            if (!sp) return;
            const life = ((t / 2.4 + i / SOOTHE_HEARTS) % 1 + 1) % 1;
            const side = i % 2 ? 1 : -1;
            sp.position.set(side * (0.3 + Math.sin(t * 1.6 + i) * 0.05), 1.15 + life * 0.45, 0.2);
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

export default function PetPanda({ pet, onDone, refuse = false, comfort = false, ...props }) {
    if (refuse) {
        return <PandaMood {...props} modelUrl={ANGRY_MODEL} Rig={RefuseRig} rigProps={{ pet, onDone }} />;
    }
    if (comfort) {
        return <PandaMood {...props} modelUrl={CRYING_MODEL} Rig={ComfortRig} rigProps={{ pet, onDone }} />;
    }
    return <PandaMood {...props} modelUrl={PANDA_IDLE_MODEL} Rig={PetRig} rigProps={{ pet, onDone }} />;
}