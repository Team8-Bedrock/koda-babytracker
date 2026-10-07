import { Suspense, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
const LOCAL_REFERENCE_HEIGHT = 1.8;
const HAND_Y = 0.5;
const HAND_X = 0.48;

function useNormalized(url, targetHeight) {
    const { scene } = useGLTF(url);

    return useMemo(() => {
        const root = scene.clone(true);
        root.updateMatrixWorld(true);

        const eyeSwirls = [];
        root.traverse((object) => {
            if (object.isGroup && (object.name === "Tube" || object.name === "Tube_1")) {
                eyeSwirls.push(object);
            }
        });

        eyeSwirls.slice(0, 2).forEach((swirl) => {
            swirl.visible = false;
        });
        root.updateMatrixWorld(true);

        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const scale = targetHeight / (size.y || 1);
        const group = new THREE.Group();
        root.position.set(-center.x, -box.min.y, -center.z);
        root.traverse((object) => {
            if (object.isMesh) {
                object.castShadow = true;
                object.receiveShadow = true;
            }
        });

        group.add(root);
        group.scale.setScalar(scale);
        return group;
    }, [scene, targetHeight]);
}

function SmoothSpiral({
    spiralRef,
    position,
    direction = 1,
    scale = 1,
}) {
    const curve = useMemo(() => {
        const points = [];
        const turns = 2.15;
        const segments = 72;

        for (let index = 0; index <= segments; index += 1) {
            const progress = index / segments;
            const angle = direction * progress * Math.PI * 2 * turns;
            const radius = 0.012 + progress * 0.122;
            points.push(
                new THREE.Vector3(
                    Math.cos(angle) * radius,
                    Math.sin(angle) * radius,
                    progress * 0.004,
                ),
            );
        }

        return new THREE.CatmullRomCurve3(points, false, "centripetal");
    }, [direction]);

    return (
        <group ref={spiralRef} position={position} scale={scale}>
            <mesh>
                <tubeGeometry args={[curve, 108, 0.014, 12, false]} />
                <meshStandardMaterial
                    color="#b9b1ee"
                    roughness={0.42}
                    metalness={0}
                    emissive="#9f95df"
                    emissiveIntensity={0.05}
                />
            </mesh>
            <mesh
                position={[
                    Math.cos(direction * Math.PI * 2 * 2.15) * 0.134,
                    Math.sin(direction * Math.PI * 2 * 2.15) * 0.134,
                    0.004,
                ]}
            >
                <sphereGeometry args={[0.014, 16, 16]} />
                <meshStandardMaterial color="#b9b1ee" roughness={0.42} />
            </mesh>
        </group>
    );
}

function Star({
    starRef,
    scale = 1,
    color = "#ffd96a",
}) {
    const shape = useMemo(() => {
        const result = new THREE.Shape();
        for (let i = 0; i < 10; i += 1) {
            const angle = -Math.PI / 2 + (i * Math.PI) / 5;
            const radius = i % 2 === 0 ? 0.09 : 0.046;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) result.moveTo(x, y);
            else result.lineTo(x, y);
        }
        result.closePath();
        return result;
    }, []);

    return (
        <mesh ref={starRef} scale={scale}>
            <extrudeGeometry
                args={[
                    shape,
                    {
                        depth: 0.025,
                        bevelEnabled: true,
                        bevelSize: 0.018,
                        bevelThickness: 0.012,
                        bevelSegments: 3,
                    },
                ]}
            />
            <meshStandardMaterial
                color={color}
                roughness={0.45}
                metalness={0}
                emissive={color}
                emissiveIntensity={0.08}
            />
        </mesh>
    );
}

function DizzySymbols() {
    const group = useRef(null);
    const stars = useRef([]);
    const dots = useRef([]);

    useFrame((state, rawDelta) => {
        const delta = Math.min(rawDelta, 0.05);
        const time = state.clock.elapsedTime;
        if (group.current) {
            group.current.rotation.y += delta * 1.35;
            group.current.position.y = 1.94 + Math.sin(time * 1.8) * 0.025;
        }

        stars.current.forEach((star, index) => {
            if (!star) return;
            star.rotation.z -= delta * (1.25 + index * 0.18);
            const pulse = 1 + Math.sin(time * 2.5 + index * 1.9) * 0.08;
            star.scale.setScalar(pulse * ([0.86, 0.62, 0.72][index] ?? 0.72));
        });

        dots.current.forEach((dot, index) => {
            if (!dot) return;
            const pulse = 0.8 + Math.sin(time * 3 + index * 2.4) * 0.18;
            dot.scale.setScalar(pulse);
        });
    });

    return (
        <group ref={group} position={[0, 1.94, 0]} rotation-x={-0.1}>
            <group position={[0.3, 0.01, 0]}>
                <Star
                    starRef={(element) => {
                        stars.current[0] = element;
                    }}
                    color="#ffd96a"
                />
            </group>
            <group position={[-0.24, 0.03, 0.2]}>
                <Star
                    starRef={(element) => {
                        stars.current[1] = element;
                    }}
                    color="#f49abb"
                />
            </group>
            <group position={[0.02, -0.015, -0.29]}>
                <Star
                    starRef={(element) => {
                        stars.current[2] = element;
                    }}
                    color="#8ed9d0"
                />
            </group>

            <mesh
                ref={(element) => {
                    dots.current[0] = element;
                }}
                position={[-0.38, -0.01, -0.04]}
            >
                <sphereGeometry args={[0.035, 18, 18]} />
                <meshStandardMaterial
                    color="#77cde5"
                    roughness={0.35}
                    emissive="#77cde5"
                    emissiveIntensity={0.08}
                />
            </mesh>
            <mesh
                ref={(element) => {
                    dots.current[1] = element;
                }}
                position={[0.16, 0.045, 0.27]}
            >
                <sphereGeometry args={[0.027, 18, 18]} />
                <meshStandardMaterial
                    color="#fff1c7"
                    roughness={0.35}
                    emissive="#fff1c7"
                    emissiveIntensity={0.08}
                />
            </mesh>
        </group>
    );
}

function HungryBunnyRig({ worldScale }) {
    const bunny = useNormalized("/models/characters/bunny/hungry.glb", LOCAL_REFERENCE_HEIGHT);
    const bunnyRef = useRef(null);
    const leftSpiral = useRef(null);
    const rightSpiral = useRef(null);
    const leftHand = useRef(null);
    const rightHand = useRef(null);

    useFrame((state, rawDelta) => {
        const delta = Math.min(rawDelta, 0.05);
        const time = state.clock.elapsedTime;
        if (!bunnyRef.current) return;

        bunnyRef.current.rotation.z = Math.sin(time * 2.25) * 0.055;
        bunnyRef.current.rotation.y = Math.sin(time * 1.15) * 0.1;
        bunnyRef.current.position.y = Math.sin(time * 3.1) * 0.018;
        bunnyRef.current.position.x = Math.sin(time * 1.7) * 0.018;

        if (leftSpiral.current) leftSpiral.current.rotation.z = time * 2.6;
        if (rightSpiral.current) rightSpiral.current.rotation.z = -time * 2.6;

        const handBob = Math.sin(time * 3.1) * 0.008;
        if (leftHand.current) leftHand.current.position.y = HAND_Y + handBob;
        if (rightHand.current) rightHand.current.position.y = HAND_Y + handBob;
    });

    return (
        <group scale={worldScale}>
            <group ref={bunnyRef}>
                <primitive object={bunny} />
                <SmoothSpiral
                    spiralRef={leftSpiral}
                    position={[-0.155, 1.02, 0.44]}
                    direction={1}
                    scale={0.66}
                />
                <SmoothSpiral
                    spiralRef={rightSpiral}
                    position={[0.155, 1.02, 0.44]}
                    direction={-1}
                    scale={0.66}
                />
                <mesh ref={leftHand} position={[-HAND_X, HAND_Y, 0.12]}>
                    <sphereGeometry args={[0.11, 24, 24]} />
                    <meshStandardMaterial color="#fdfbf6" roughness={0.5} />
                </mesh>
                <mesh ref={rightHand} position={[HAND_X, HAND_Y, 0.12]}>
                    <sphereGeometry args={[0.11, 24, 24]} />
                    <meshStandardMaterial color="#fdfbf6" roughness={0.5} />
                </mesh>
                <DizzySymbols />
            </group>
        </group>
    );
}
export default function HungryBunny({ homePosition = [0, 0], scale = 1, referenceHeight = 1 }) {
    const worldScale = (referenceHeight * scale) / LOCAL_REFERENCE_HEIGHT;
    return (
        <group position={[homePosition[0], 0, homePosition[1]]}>
            <Suspense fallback={null}>
                <HungryBunnyRig worldScale={worldScale} />
            </Suspense>
        </group>
    );
}

useGLTF.preload("/models/characters/bunny/hungry.glb");