import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const MODEL_URL = "/models/characters/panda/crying.glb";
const LOCAL_REFERENCE_HEIGHT = 2.6;

function useNormalizedScene(url, targetHeight = 2.6) {
    const { scene } = useGLTF(url);
    return useMemo(() => {
        const root = scene.clone(true);
        const box = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const scale = targetHeight / (size.y || 1);
        root.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
        root.scale.setScalar(scale);
        root.traverse((o) => {
            if (o.isMesh) {
                o.castShadow = true;
                o.receiveShadow = true;
            }
        });
        return { root, size: size.clone().multiplyScalar(scale) };
    }, [scene, targetHeight]);
}
const TEAR_COUNT = 14;
const TEAR_MAT = new THREE.MeshPhysicalMaterial({
    color: "#bfe6ff",
    transparent: true,
    opacity: 0.85,
    roughness: 0.05,
    metalness: 0,
    transmission: 0.6,
    thickness: 0.3,
    ior: 1.33,
});

function Tears({ eyes }) {
    const meshRef = useRef(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const drops = useMemo(
        () =>
            Array.from({ length: TEAR_COUNT }, (_, i) => ({
                side: i % 2 === 0 ? -1 : 1,
                t: (i / TEAR_COUNT) * 0.9 + Math.random() * 0.2,
                life: 0.7 + Math.random() * 0.35,
                drift: (Math.random() - 0.5) * 0.25,
                spin: Math.random() * Math.PI * 2,
                size: 0.65 + Math.random() * 0.7,
                speed: 0.9 + Math.random() * 0.6,
            })),
        [],
    );

    useFrame((_, rawDelta) => {
        const dt = Math.min(rawDelta, 0.05);
        const mesh = meshRef.current;
        if (!mesh) return;

        drops.forEach((d, i) => {
            d.t += dt * d.speed;
            if (d.t > d.life) {
                d.t = 0;
                d.life = 0.7 + Math.random() * 0.35;
                d.drift = (Math.random() - 0.5) * 0.25;
                d.size = 0.65 + Math.random() * 0.7;
                d.speed = 0.9 + Math.random() * 0.6;
            }
            const p = Math.max(d.t, 0) / d.life;
            const origin = eyes[d.side < 0 ? 0 : 1];

            const outward = 0.18 + p * 1.4 + p * p * 0.9;
            const x = origin[0] + d.side * outward + d.drift * p;
            const y = origin[1] + 0.05 + p * 0.25 - 4.2 * p * p;
            const z = origin[2] + 0.05 - p * 0.35;

            const grow = Math.min(p / 0.08, 1);
            const s = d.size * 0.038 * grow * (p > 0.92 ? (1 - p) * 12.5 : 1);
            dummy.position.set(x, y, z);
            dummy.scale.set(s * 0.7, s * (1 + p * 2.4), s * 0.7);
            dummy.rotation.set(0, d.spin + p * 4, 0);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, TEAR_COUNT]} material={TEAR_MAT}>
            <sphereGeometry args={[1, 16, 16]} />
        </instancedMesh>
    );
}

function Hand({ side, size }) {
    const ref = useRef(null);

    useFrame((state) => {
        const g = ref.current;
        if (!g) return;
        const t = state.clock.elapsedTime;
        const speed = 13;
        const p = (t * speed) % (Math.PI * 2);
        const down = p < Math.PI;
        const u = down ? p / Math.PI : (p - Math.PI) / Math.PI;
        const yFactor = down ? Math.cos(Math.PI * u) : -Math.cos(Math.PI * u);
        const curve = Math.sin(Math.PI * u);

        const baseX = side * (size.x * 0.38 + 0.10);
        const baseY = -size.y * 0.22;
        g.position.set(
            baseX + side * curve * 0.32,
            baseY + yFactor * 0.32,
            size.z * 0.12 + curve * 0.08,
        );
        g.rotation.z = side * (0.55 + curve * 0.45);
        g.rotation.x = curve * 0.35;
        g.scale.setScalar(1);
    });

    return (
        <group ref={ref}>
            <mesh castShadow>
                <sphereGeometry args={[0.16, 32, 32]} />
                <meshStandardMaterial color="#111111" roughness={0.45} metalness={0.02} />
            </mesh>
        </group>
    );
}

function CryingPandaRig() {
    const { root, size } = useNormalizedScene(MODEL_URL, LOCAL_REFERENCE_HEIGHT);
    const bodyRef = useRef(null);
    const eyes = useMemo(() => {
        const y = size.y * 0.5 - size.y * 0.515;
        const x = size.y * 0.077;
        const z = size.z * 0.5;
        return [
            [-x, y, z],
            [x, y, z],
        ];
    }, [size]);

    useFrame((state) => {
        const g = bodyRef.current;
        if (!g) return;
        const t = state.clock.elapsedTime;
        const bounceSpeed = 10;
        const bounce = Math.abs(Math.sin(t * bounceSpeed));
        const hop = Math.pow(bounce, 2.5) * 0.28;
        g.position.y = hop;
        g.rotation.z = 0;
        g.rotation.x = 0;
        g.scale.setScalar(1);
    });

    return (
        <group ref={bodyRef}>
            <primitive object={root} />
            <Hand side={-1} size={size} />
            <Hand side={1} size={size} />
            <Tears eyes={eyes} />
        </group>
    );
}
export default function CryingPanda({ homePosition = [0, 0], scale = 1, referenceHeight = 1 }) {
    const worldScale = (referenceHeight * scale) / LOCAL_REFERENCE_HEIGHT;
    return (
        <group position={[homePosition[0], 0, homePosition[1]]}>
            <group scale={worldScale}>
                <Suspense fallback={null}>
                    <CryingPandaRig />
                </Suspense>
            </group>
        </group>
    );
}

useGLTF.preload(MODEL_URL);