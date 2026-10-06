import React, { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

function HideWhenAnimated({ children }) {
  const [hidden, setHidden] = React.useState(() => typeof window !== "undefined" && !!window.__moodAnimationActive);
  React.useEffect(() => {
    const onChange = (e) => setHidden(!!e.detail?.active);
    window.addEventListener("mood-animation", onChange);
    return () => window.removeEventListener("mood-animation", onChange);
  }, []);
  return hidden ? null : children;
}


const KOALA_HEIGHT = 0.3;
const KOALA_POSITION = [0.02, 0.72];
const KOALA_PERCH_Y = 0;
const KOALA_MODEL_PATH = "/models/characters/koala/koala.glb";
const seededRand = (seed) => {
  const value = Math.sin(seed * 999.91) * 43758.5453;
  return value - Math.floor(value);
};

const drawWrapped = (ctx, x, y, size, radius, draw) => {
  [-size, 0, size].forEach((offsetX) => {
    [-size, 0, size].forEach((offsetY) => draw(x + offsetX, y + offsetY));
  });
};

const PALETTE = {
  background: "#79c8ad",
  fog: "#a9d6b4",
  sun: "#ffe59a",
  rim: "#dff2ca",
  hemiSky: "#e6f4d5",
  hemiGround: "#415d45",
  groundBase: "#879b5c",
  soilDark: "#58392d",
  bark: "#8c7049",
  barkDark: "#4e311f",
  barkCoral: "#b85e50",
  leaf: "#4e9565",
  leafDeep: "#215c48",
  leafSilver: "#9acb82",
  stone: "#817864",
  stoneLight: "#b4aa88",
  moss: "#507d49",
  wattle: "#ebce5f",
  wattleLeaf: "#386d4b",
  litter: "#8b4e38",
  koala: "#898a82",
  koalaLight: "#b5b2a5",
  koalaDark: "#31332f",
  coral: "#df856d",
};

const TEX = 512;

function buildGroundTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = TEX;
  canvas.height = TEX;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = PALETTE.groundBase;
  ctx.fillRect(0, 0, TEX, TEX);

  for (let i = 0; i < 46; i++) {
    const seed = i * 61 + 3;
    const bx = (seed * 37) % TEX;
    const by = (seed * 53) % TEX;
    const radius = 44 + (seed % 5) * 24;
    const hue = 55 + (seed % 9) * 4;
    const light = 31 + (seed % 6) * 4;
    drawWrapped(ctx, bx, by, TEX, radius, (x, y) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, `hsla(${hue}, 40%, ${light}%, 0.5)`);
      g.addColorStop(1, `hsla(${hue}, 40%, ${light}%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const LEAF_LITTER = [PALETTE.litter, PALETTE.leafDeep, "#8b5138"];
  for (let i = 0; i < 240; i++) {
    const seed = i * 17 + 9;
    const bx = (seed * 31) % TEX;
    const by = (seed * 47) % TEX;
    ctx.fillStyle = LEAF_LITTER[i % LEAF_LITTER.length];
    ctx.globalAlpha = 0.45 + (seed % 4) * 0.08;
    drawWrapped(ctx, bx, by, TEX, 6, (x, y) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((seed % 12) * 0.26);
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.4, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
  ctx.globalAlpha = 1;

  for (let i = 0; i < 90; i++) {
    const seed = i * 89 + 13;
    const bx = (seed * 23) % TEX;
    const by = (seed * 41) % TEX;
    drawWrapped(ctx, bx, by, TEX, 8, (x, y) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((seed % 14) * 0.22);
      ctx.fillStyle = i % 3 === 0 ? "rgba(211,196,139,0.45)" : "rgba(82,67,47,0.38)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 6.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  for (let i = 0; i < 60; i++) {
    const seed = i * 31 + 21;
    const bx = (seed * 19) % TEX;
    const by = (seed * 43) % TEX;
    ctx.fillStyle = `rgba(33,92,72,${0.22 + (seed % 4) * 0.08})`;
    drawWrapped(ctx, bx, by, TEX, 4, (x, y) => {
      ctx.beginPath();
      ctx.arc(x, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const GROUND_SIZE = 9;

function Ground() {
  const tex = useMemo(() => buildGroundTexture(), []);
  useEffect(() => {
    tex.repeat.set(GROUND_SIZE / 2.4, GROUND_SIZE / 2.4);
  }, [tex]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[GROUND_SIZE, GROUND_SIZE]} />
      <meshStandardMaterial map={tex} />
    </mesh>
  );
}

function buildBarkTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 48;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = PALETTE.bark;
  ctx.fillRect(0, 0, 48, 256);
  for (let i = 0; i < 30; i++) {
    const seed = i * 13 + 5;
    ctx.fillStyle = `rgba(140,116,84,${0.18 + (seed % 4) * 0.09})`;
    const x = (seed * 17) % 48;
    ctx.fillRect(x, (seed * 29) % 256, 2 + (seed % 4), 40 + (seed % 60));
  }
  for (let i = 0; i < 16; i++) {
    const seed = i * 31 + 7;
    ctx.fillStyle = "rgba(224,212,180,0.4)";
    ctx.fillRect((seed * 11) % 48, (seed * 37) % 256, 7, 22);
  }
  for (let i = 0; i < 12; i++) {
    const seed = i * 47 + 17;
    ctx.fillStyle = "rgba(184,94,80,0.72)";
    ctx.beginPath();
    ctx.ellipse((seed * 13) % 48, (seed * 31) % 256, 5 + (seed % 4), 13 + (seed % 12), 0.35, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 8; i++) {
    const seed = i * 43 + 11;
    ctx.fillStyle = "rgba(140,175,120,0.3)";
    ctx.fillRect((seed * 7) % 48, (seed * 53) % 256, 5, 14);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function GumTree({ position, height, lean = 0, seed = 1 }) {
  const bark = useMemo(() => buildBarkTexture(), []);
  const canopy = useRef(null);
  const phase = useMemo(() => seededRand(seed) * 8, [seed]);
  useFrame(({ clock }) => {
    if (canopy.current) {
      canopy.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.45 + phase) * 0.03;
    }
  });
  const clusters = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, i) => {
        const a = (i / 9) * Math.PI * 2 + phase;
        const r = 0.2 + seededRand(seed + i * 3) * 0.34;
        return {
          position: [Math.cos(a) * r, height * (0.78 + seededRand(seed + i) * 0.26), Math.sin(a) * r],
          scale: 0.28 + seededRand(seed + i * 7) * 0.22,
          color: i % 3 === 0 ? PALETTE.leafSilver : i % 3 === 1 ? PALETTE.leaf : PALETTE.leafDeep,
        };
      }),
    [height, phase, seed],
  );
  return (
    <group position={position} rotation={[0, 0, lean]}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.06, 0.12, height, 10]} />
        <meshStandardMaterial map={bark} roughness={0.9} />
      </mesh>
      <mesh position={[0.17, height * 0.7, 0]} rotation={[0, 0, -0.7]} castShadow>
        <cylinderGeometry args={[0.026, 0.042, 0.52, 8]} />
        <meshStandardMaterial color={PALETTE.barkDark} roughness={0.9} />
      </mesh>
      <mesh position={[-0.16, height * 0.78, 0.05]} rotation={[0, 0, 0.65]} castShadow>
        <cylinderGeometry args={[0.023, 0.037, 0.46, 8]} />
        <meshStandardMaterial color={PALETTE.barkDark} roughness={0.9} />
      </mesh>
      <group ref={canopy}>
        {clusters.map((c, i) => (
          <mesh key={i} position={c.position} scale={[c.scale * 0.72, c.scale, c.scale * 0.34]} rotation={[0.12, aToRotation(i), i * 0.42]} castShadow>
            <sphereGeometry args={[1, 8, 6]} />
            <meshToonMaterial color={c.color} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function aToRotation(index) {
  return (index % 4) * 0.36;
}

const TREES = [
  { position: [-1.35, 0, -1.35], height: 2.1, lean: 0.04, seed: 3 },
  { position: [1.4, 0, -1.5], height: 2.5, lean: -0.05, seed: 11 },
  { position: [-0.15, 0, -1.95], height: 2.85, lean: 0.02, seed: 19 },
  { position: [-2.3, 0, -0.45], height: 1.85, lean: 0.06, seed: 27 },
  { position: [2.3, 0, -0.3], height: 2.0, lean: -0.04, seed: 35 },
  { position: [0.85, 0, -2.3], height: 2.3, lean: 0.03, seed: 43 },
  { position: [-1.05, 0, 1.75], height: 1.65, lean: -0.03, seed: 51 },
];

function LeafSprig({ position, rotation, scale = 1 }) {
  const ref = useRef(null);
  const phase = useMemo(() => Math.random() * 8, []);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = rotation + Math.sin(clock.getElapsedTime() + phase) * 0.06;
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.006, 0.008, 0.15, 6]} />
        <meshStandardMaterial color={PALETTE.barkDark} roughness={0.9} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh
          key={i}
          position={[i % 2 ? 0.045 : -0.045, 0.06 + i * 0.03, 0]}
          rotation={[0, 0, i % 2 ? -0.8 : 0.8]}
          scale={[1, 2.4, 1]}
          castShadow
        >
          <sphereGeometry args={[0.022, 8, 6]} />
          <meshToonMaterial color={i % 2 ? PALETTE.leaf : PALETTE.leafDeep} />
        </mesh>
      ))}
    </group>
  );
}

const SPRIGS = (() => {
  const out = [];
  for (let i = 0; i < 22; i++) {
    const seed = i * 23 + 5;
    const x = (seededRand(seed) - 0.5) * 3.6;
    const z = -0.4 + (seededRand(seed * 1.7) - 0.5) * 3.0;
    if (Math.hypot(x - KOALA_POSITION[0], z - KOALA_POSITION[1]) < 0.42) continue;
    out.push({ position: [x, 0, z], rotation: (seededRand(seed * 2.3) - 0.5) * 0.4, scale: 0.8 + seededRand(seed * 3.1) * 0.7 });
  }
  return out;
})();

function WattleBush({ position, scale = 1, seed = 1 }) {
  const puffs = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, i) => {
        const a = (i / 9) * Math.PI * 2 + seededRand(seed + i) * 2;
        const r = 0.09 + seededRand(seed + i * 3) * 0.07;
        return [Math.cos(a) * r, 0.09 + seededRand(seed + i * 5) * 0.1, Math.sin(a) * r];
      }),
    [seed],
  );
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.09, 0]} scale={[1, 0.75, 1]} castShadow receiveShadow>
        <icosahedronGeometry args={[0.14, 1]} />
        <meshStandardMaterial color={PALETTE.wattleLeaf} roughness={0.9} flatShading />
      </mesh>
      {puffs.map((p, i) => (
        <mesh key={i} position={p} castShadow>
          <sphereGeometry args={[0.02, 7, 6]} />
          <meshStandardMaterial color={PALETTE.wattle} roughness={0.6} emissive={PALETTE.wattle} emissiveIntensity={0.12} />
        </mesh>
      ))}
    </group>
  );
}

const WATTLE_BUSHES = [
  { position: [1.55, 0, 0.55], scale: 0.55, seed: 6 },
  { position: [-1.05, 0, -0.55], scale: 0.5, seed: 14 },
  { position: [0.75, 0, 1.5], scale: 0.6, seed: 22 },
];

function FallenLog({ position = [1.55, 0, -0.55], rotation = 0.5 }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.14, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
        <cylinderGeometry args={[0.14, 0.16, 1.15, 12]} />
        <meshStandardMaterial color={PALETTE.bark} roughness={0.92} />
      </mesh>
      <mesh position={[0.575, 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.03, 12]} />
        <meshStandardMaterial color={PALETTE.soilDark} roughness={1} />
      </mesh>
      <mesh position={[0, 0.24, 0.1]} rotation={[0.3, 0, 0]} castShadow>
        <sphereGeometry args={[0.06, 8, 6]} />
        <meshStandardMaterial color={PALETTE.moss} roughness={1} />
      </mesh>
      <mesh position={[-0.2, 0.24, -0.08]} rotation={[0.2, 0, 0]} castShadow>
        <sphereGeometry args={[0.045, 8, 6]} />
        <meshStandardMaterial color={PALETTE.moss} roughness={1} />
      </mesh>
    </group>
  );
}

const STONES = [
  { position: [1.1, 0.07, 0.2], scale: 0.14, rotation: 0.8 },
  { position: [-1.35, 0.06, 0.85], scale: 0.12, rotation: 2.0 },
  { position: [0.5, 0.05, 1.4], scale: 0.1, rotation: 1.4 },
  { position: [-0.55, 0.06, 1.05], scale: 0.11, rotation: 0.3 },
  { position: [-1.75, 0.06, -1.1], scale: 0.13, rotation: 1.9 },
];

function Stones() {
  return (
    <>
      {STONES.map((s, i) => (
        <group key={i} position={s.position} rotation={[0.1, s.rotation, 0.07]} scale={s.scale}>
          <mesh castShadow receiveShadow>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial color={i % 2 ? PALETTE.stone : PALETTE.stoneLight} roughness={0.9} />
          </mesh>
          <mesh position={[0.03, 0.5, -0.04]} scale={[0.74, 0.2, 0.68]}>
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial color={PALETTE.moss} roughness={1} />
          </mesh>
        </group>
      ))}
    </>
  );
}

function WaterDish() {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    const m = ref.current?.material;
    if (m) m.opacity = 0.85 + Math.sin(clock.getElapsedTime() * 0.9) * 0.06;
  });
  return (
    <group position={[-0.85, 0, 0.35]}>
      <mesh position={[0, 0.035, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.18, 0.07, 20]} />
        <meshStandardMaterial color={PALETTE.stone} roughness={0.9} />
      </mesh>
      <mesh ref={ref} position={[0, 0.072, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.18, 24]} />
        <meshBasicMaterial color="#a9c8ca" transparent opacity={0.88} />
      </mesh>
    </group>
  );
}

function MistWisp({ radius, speed, phase, height }) {
  const ref = useRef(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed + phase;
    ref.current.position.set(Math.cos(t) * radius, height, Math.sin(t * 0.8) * radius * 0.6 - 0.4);
    ref.current.material.opacity = 0.08 + Math.abs(Math.sin(t * 0.6)) * 0.12;
  });
  return (
    <mesh ref={ref} scale={[1.7, 0.5, 1]}>
      <sphereGeometry args={[0.4, 12, 8]} />
      <meshBasicMaterial color={PALETTE.rim} transparent opacity={0.13} depthWrite={false} />
    </mesh>
  );
}

function Mist() {
  const wisps = useMemo(
    () =>
      Array.from({ length: 6 }).map((_, i) => ({
        radius: 1.0 + seededRand(i * 3.3) * 1.3,
        speed: 0.1 + seededRand(i * 5.5) * 0.08,
        phase: seededRand(i * 7.7) * 8,
        height: 0.2 + seededRand(i * 9.1) * 0.5,
      })),
    [],
  );
  return (
    <>
      {wisps.map((w, i) => (
        <MistWisp key={i} {...w} />
      ))}
    </>
  );
}
function useNormalizedModel(size) {
  const gltf = useGLTF(KOALA_MODEL_PATH);
  return useMemo(() => {
    const clone = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const dim = box.getSize(new THREE.Vector3());
    const scale = size / (dim.y || 1);
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);
    clone.scale.setScalar(scale);
    clone.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    const wrapper = new THREE.Group();
    wrapper.add(clone);
    return wrapper;
  }, [gltf.scene, size]);
}

function Koala({ position = KOALA_RENDER_POSITION }) {
  const group = useRef(null);
  const body = useRef(null);
  const nextGlance = useRef(1 + Math.random() * 2);
  const glance = useRef(0);
  const model = useNormalizedModel(KOALA_HEIGHT);

  useLayoutEffect(() => {
    if (group.current) group.current.rotation.y = 0;
  }, [model]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.getElapsedTime();
    if (t > nextGlance.current) {
      nextGlance.current = t + 2.4 + Math.random() * 2.5;
      glance.current = (Math.random() - 0.5) * 0.35;
    }
    group.current.rotation.y += (glance.current - group.current.rotation.y) * 0.035;
    group.current.position.y = KOALA_PERCH_Y + Math.sin(t * 1.0) * 0.012;
    if (body.current) {
      const breathe = 1 + Math.sin(t * 1.6) * 0.018;
      body.current.scale.set(1 / Math.sqrt(breathe), breathe, 1 / Math.sqrt(breathe));
    }
  });

  return (
    <group ref={group} position={[position[0], KOALA_PERCH_Y, position[1]]}>
      <group ref={body}>
        <primitive object={model} />
      </group>
    </group>
  );
}

class KoalaErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("Koala model failed to load:", error);
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

const ISO_DISTANCE = 4.4;
const ISO_ELEVATION = Math.atan(1 / Math.sqrt(2)) - 0.05;
const ISO_ZOOM = 320;
const ISO_POSITION = [
  0,
  ISO_DISTANCE * Math.sin(ISO_ELEVATION),
  ISO_DISTANCE * Math.cos(ISO_ELEVATION),
];

const SCENE_PAN_X = 0.35;

const KOALA_RENDER_POSITION = [KOALA_POSITION[0] - SCENE_PAN_X, KOALA_POSITION[1] + 0.15];

const KoalaHabitat3D = ({ showCharacter = true }) => {
  useEffect(() => {
    useGLTF.preload(KOALA_MODEL_PATH);
  }, []);

  return (
    <div className="habitat-canvas-wrap habitat-canvas-wrap--no-touch-scroll">
      <Canvas
        shadows
        orthographic
        camera={{ position: ISO_POSITION, zoom: ISO_ZOOM, near: 0.1, far: 60 }}
        gl={{ toneMappingExposure: 1.1 }}
        dpr={[1, 2]}
        style={{ touchAction: "none" }}
        onCreated={({ gl }) => {
          gl.domElement.style.touchAction = "none";
        }}
      >
        <color attach="background" args={[PALETTE.background]} />
        <fog attach="fog" args={[PALETTE.fog, 5, 13]} />

        <ambientLight intensity={0.68} color={PALETTE.rim} />
        <directionalLight
          position={[5, 8, 3]}
          intensity={2.15}
          color={PALETTE.sun}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-5}
          shadow-camera-right={5}
          shadow-camera-top={5}
          shadow-camera-bottom={-5}
        />
        <directionalLight position={[-5, 3, -4]} intensity={0.35} color={PALETTE.rim} />
        <hemisphereLight args={[PALETTE.hemiSky, PALETTE.hemiGround, 0.85]} />

        <Suspense fallback={null}>
          <group position={[SCENE_PAN_X, -0.18, 0]}>
            <Ground />
            {TREES.map((t, i) => (
              <GumTree key={`t${i}`} {...t} />
            ))}
            {WATTLE_BUSHES.map((w, i) => (
              <WattleBush key={`w${i}`} {...w} />
            ))}
            <FallenLog />
            <WaterDish />
            {SPRIGS.map((s, i) => (
              <LeafSprig key={`s${i}`} {...s} />
            ))}
            <Stones />
            <Mist />
            {showCharacter && (
              <HideWhenAnimated><KoalaErrorBoundary>
                <Koala />
              </KoalaErrorBoundary></HideWhenAnimated>
            )}
          </group>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default KoalaHabitat3D;