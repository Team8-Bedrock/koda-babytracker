import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const CACHE_PREFIX = "koda-head:v2:";
const SHOT_SIZE = 256;
const HEAD_SHARE = { koala: 0.62, panda: 0.6, bear: 0.58, bunny: 0.6, frog: 0.56, fox: 0.47 };
const HEAD_TURN = { fox: -0.25, koala: -0.2, panda: -0.2, bear: -0.2, bunny: -0.2, frog: -0.2 };

export const animalOf = (child) => String(child?.avatar || child?.character || child?.animal || "").toLowerCase();
export const modelPathFor = (animal) => `/models/characters/${animal}/${animal}.glb`;

const memory = new Map();
const pending = new Map();
let renderer = null;
let releaseTimer = null;
let queue = Promise.resolve();

function readCache(animal) {
    if (memory.has(animal)) return memory.get(animal);
    try {
        const hit = localStorage.getItem(CACHE_PREFIX + animal);
        if (hit) memory.set(animal, hit);
        return hit || null;
    } catch {
        return null;
    }
}

function writeCache(animal, url) {
    memory.set(animal, url);
    try {
        localStorage.setItem(CACHE_PREFIX + animal, url);
    } catch {
        memory.set(animal, url);
    }
}

function getRenderer() {
    clearTimeout(releaseTimer);
    if (!renderer) {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
        renderer.setPixelRatio(1);
        renderer.setSize(SHOT_SIZE, SHOT_SIZE, false);
        renderer.setClearColor(0x000000, 0);
        renderer.localClippingEnabled = true;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
    }
    return renderer;
}

function releaseSoon() {
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => {
        if (!renderer) return;
        renderer.dispose();
        renderer.forceContextLoss?.();
        renderer = null;
    }, 3000);
}

function loadModel(url) {
    return new Promise((resolve, reject) => new GLTFLoader().load(url, resolve, undefined, reject));
}

function matte(root) {
    root.traverse((o) => {
        if (!o.isMesh) return;
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
            if (!m) return;
            if ("roughness" in m) m.roughness = 1;
            if ("metalness" in m) m.metalness = 0;
            if ("clearcoat" in m) m.clearcoat = 0;
        });
    });
}

async function shoot(animal) {
    const gltf = await loadModel(modelPathFor(animal));
    const scene = new THREE.Scene();
    const model = gltf.scene;
    matte(model);
    const pivot = new THREE.Group();
    pivot.add(model);
    pivot.rotation.y = HEAD_TURN[animal] ?? -0.2;
    scene.add(pivot);
    pivot.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(pivot);
    const size = box.getSize(new THREE.Vector3());
    const share = HEAD_SHARE[animal] ?? 0.56;
    const topLine = box.max.y - size.y * share;
    const parts = [];
    pivot.traverse((o) => {
        if (!o.isMesh) return;
        const b = new THREE.Box3().setFromObject(o);
        const s3 = b.getSize(new THREE.Vector3());
        parts.push({ mesh: o, box: b, center: b.getCenter(new THREE.Vector3()), volume: s3.x * s3.y * s3.z });
    });
    const skull = parts.filter((p) => p.center.y >= topLine).sort((a, b) => b.volume - a.volume)[0];
    const skullBox = skull ? skull.box : new THREE.Box3(new THREE.Vector3(box.min.x, topLine, box.min.z), box.max.clone());
    const merged = !skull || skullBox.getSize(new THREE.Vector3()).y > size.y * 0.75;
    const sk = skullBox.getSize(new THREE.Vector3());
    const reach = new THREE.Box3(
        new THREE.Vector3(skullBox.min.x - sk.x * 0.35, skullBox.min.y + sk.y * 0.08, skullBox.min.z - sk.z * 0.35),
        new THREE.Vector3(skullBox.max.x + sk.x * 0.35, skullBox.max.y + sk.y * 1.6, skullBox.max.z + sk.z * 0.35)
    );
    const cutY = merged ? topLine : skullBox.min.y + sk.y * 0.02;
    const frame = new THREE.Box3();
    parts.forEach((p) => {
        const keep = merged || p === skull || reach.containsPoint(p.center);
        p.mesh.visible = keep;
        if (!keep) return;
        const clipped = p.box.clone();
        clipped.min.y = Math.max(clipped.min.y, cutY);
        if (clipped.max.y > clipped.min.y) frame.union(clipped);
    });
    const clip = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -cutY)];
    parts.forEach((p) => {
        (Array.isArray(p.mesh.material) ? p.mesh.material : [p.mesh.material]).forEach((m) => {
            if (!m) return;
            m.clippingPlanes = clip;
            m.clipShadows = true;
            m.side = THREE.DoubleSide;
        });
    });
    if (frame.isEmpty()) frame.copy(skullBox);
    const center = frame.getCenter(new THREE.Vector3());
    const fsize = frame.getSize(new THREE.Vector3());
    const radius = Math.max(fsize.x, fsize.y) * 0.5 * 1.08;

    const camera = new THREE.PerspectiveCamera(24, 1, 0.001, 1000);
    const dist = radius / Math.tan(THREE.MathUtils.degToRad(12));
    camera.position.set(center.x, center.y + radius * 0.08, center.z + dist);
    camera.lookAt(center.x, center.y, center.z);
    camera.near = dist / 50;
    camera.far = dist * 10;
    camera.updateProjectionMatrix();

    scene.add(new THREE.AmbientLight(0xfff4e2, 0.95));
    const key = new THREE.DirectionalLight(0xfff0d6, 2.1);
    key.position.set(center.x + dist * 0.4, center.y + dist * 0.6, center.z + dist);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xcfe0ff, 0.55);
    fill.position.set(center.x - dist, center.y + dist * 0.2, center.z + dist * 0.4);
    scene.add(fill);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a7a62, 0.5));

    const r = getRenderer();
    r.render(scene, camera);
    const url = r.domElement.toDataURL("image/png");

    scene.traverse((o) => {
        if (!o.isMesh) return;
        o.geometry?.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
            Object.values(m || {}).forEach((v) => v?.isTexture && v.dispose());
            m?.dispose?.();
        });
    });
    releaseSoon();
    return url;
}

export function headShotSync(animal) {
    return animal ? readCache(animal) : null;
}

export function headShot(animal) {
    if (!animal) return Promise.resolve(null);
    const hit = readCache(animal);
    if (hit) return Promise.resolve(hit);
    if (pending.has(animal)) return pending.get(animal);
    const job = (queue = queue.then(() => shoot(animal)).then(
        (url) => {
            writeCache(animal, url);
            pending.delete(animal);
            return url;
        },
        () => {
            pending.delete(animal);
            return null;
        }
    ));
    pending.set(animal, job);
    return job;
}

export function useHeadShot(animal) {
    const [url, setUrl] = useState(() => headShotSync(animal));
    useEffect(() => {
        let alive = true;
        const hit = headShotSync(animal);
        setUrl(hit);
        if (!hit) headShot(animal).then((u) => alive && setUrl(u));
        return () => {
            alive = false;
        };
    }, [animal]);
    return url;
}

export default function CharacterHead({ child, animal: animalProp, size = 26, style }) {
    const animal = animalProp || animalOf(child);
    const url = useHeadShot(animal);
    return (
        <span
            aria-hidden="true"
            style={{
                width: size,
                height: size,
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 999,
                overflow: "hidden",
                ...style,
            }}
        >
            {url ? (
                <img src={url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", animation: "kchPop 0.25s ease-out both" }} />
            ) : (
                <span style={{ width: "46%", height: "46%", borderRadius: 999, background: "currentColor", opacity: 0.12 }} />
            )}
            <style>{"@keyframes kchPop{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:none}}"}</style>
        </span>
    );
}