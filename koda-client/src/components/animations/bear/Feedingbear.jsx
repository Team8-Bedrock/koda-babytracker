import { useRef, useMemo, Suspense } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Center, Environment, Lightformer, OrbitControls } from "@react-three/drei";
const bearAssetUrl = "/models/characters/bear/feeding.glb";

function Bear() {
    const { scene } = useGLTF(bearAssetUrl);
    const body = useRef(null);
    const head = useRef(null);

    const rig = useMemo(() => {
        const root = scene;
        const headPivot = new THREE.Group();
        const box = new THREE.Box3();
        const center = new THREE.Vector3();
        const parts = [];
        root.updateWorldMatrix(true, true);
        root.traverse((o) => {
            if (!o.isMesh) return;
            box.setFromObject(o);
            box.getCenter(center);
            const size = new THREE.Vector3();
            box.getSize(size);
            if (center.y > 0.02) parts.push({ mesh: o, center: center.clone(), size: size.clone() });
        });
        const neck = new THREE.Vector3();
        parts.forEach((p) => neck.add(p.center));
        if (parts.length) neck.divideScalar(parts.length);
        headPivot.position.set(neck.x, neck.y - 0.28, neck.z - 0.05);
        root.add(headPivot);
        parts.forEach((p) => headPivot.attach(p.mesh));
        const eyes = parts
            .filter((p) => p.size.y < 0.25 && p.size.x < 0.25 && p.center.y > 0.15 && p.center.z > 0.2)
            .slice(0, 2);
        eyes.forEach((e) => {
            e.mesh.scale.y *= 0.18;
            e.mesh.position.y += 0.03;
        });

        return { headPivot };
    }, [scene]);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const b = Math.sin(t * 0.7);
        if (body.current) {

            body.current.scale.set(1 + b * 0.018, 1 + b * 0.012, 1 + b * 0.022);
            body.current.rotation.z = Math.sin(t * 0.35) * 0.012;
        }
        if (rig.headPivot) {

            rig.headPivot.rotation.x = 0.62 + b * 0.05;
            rig.headPivot.rotation.z = -0.16 + Math.sin(t * 0.31) * 0.05;
            rig.headPivot.rotation.y = Math.sin(t * 0.22) * 0.04;
        }
    });

    return (
        <group ref={head} position={[0, -0.9, 0]} rotation={[0, -0.5, 0]}>
            <group ref={body}>
                <Center bottom>
                    <primitive object={scene} />
                </Center>
            </group>
        </group>
    );
}

export default function SleepyBear() {
    return (
        <Canvas
            shadows
            camera={{ position: [0.4, 1.5, 4.6], fov: 40 }}
            gl={{ alpha: true, antialias: true }}
            style={{ width: "100%", height: "100%", background: "transparent" }}
        >
            <ambientLight intensity={0.75} />
            <directionalLight position={[4, 7, 5]} intensity={1.5} castShadow />
            <directionalLight position={[-5, 2, -4]} intensity={0.45} color="#ffd39c" />
            <Suspense fallback={null}>
                <Bear />
                <Environment>
                    <Lightformer intensity={1.5} position={[0, 5, 0]} scale={[10, 10, 1]} />
                    <Lightformer
                        intensity={0.8}
                        color="#ffe6bb"
                        position={[-5, 1, -1]}
                        rotation-y={Math.PI / 2}
                        scale={[20, 1, 1]}
                    />
                </Environment>
            </Suspense>
            <OrbitControls
                enablePan={false}
                target={[0, -0.4, 0]}
                minPolarAngle={Math.PI / 5}
                maxPolarAngle={Math.PI / 2.1}
                minDistance={3}
                maxDistance={9}
            />
        </Canvas>
    );
}

useGLTF.preload(bearAssetUrl);