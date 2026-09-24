import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "../../styling/pages/setUp.css";
import { AVATARS } from "../../constants/avatars";
import { ChevronLeft, MapPin, Pointer } from "lucide-react";
import AvatarHabitatBackdrop from "../../components/AvatarHabitatBackdrop";


const AvatarSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAddChildMode = location.state?.mode === "addChild";
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modelLoading, setModelLoading] = useState(true);
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const currentModel = useRef(null);
  const animFrame = useRef(null);
  const bounceStart = useRef(null);
  const loader = useRef(new GLTFLoader());
  const isDragging = useRef(false);
  const lastPointerX = useRef(0);
  const [showDragHint, setShowDragHint] = useState(true);
  const restRotationY = useRef(0);
  const hintActiveRef = useRef(true);

  const selected = AVATARS[selectedIndex];

  // three.js boot 
  useEffect(() => {
    hintActiveRef.current = showDragHint;
  }, [showDragHint]);

  useEffect(() => {
    const mount = mountRef.current;
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0.5, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 2.0));
    const sun = new THREE.DirectionalLight(0xffffff, 1.0);
    sun.position.set(3, 5, 4);
    scene.add(sun);
    const fill = new THREE.DirectionalLight(0xffffff, 0.6);
    fill.position.set(-3, 2, -2);
    scene.add(fill);

    const animate = () => {
      animFrame.current = requestAnimationFrame(animate);
      if (currentModel.current) {
        const baseY = currentModel.current.userData.baseY ?? 0;
        let y = baseY + Math.sin(Date.now() * 0.002) * 0.08;

        if (bounceStart.current !== null) {
          const elapsed = Date.now() - bounceStart.current;
          const duration = 420;
          if (elapsed < duration) {
            y += Math.sin((elapsed / duration) * Math.PI) * 0.22;
          } else {
            bounceStart.current = null;
          }
        }

        currentModel.current.position.y = y;

        if (hintActiveRef.current && !isDragging.current) {
          const wiggle = Math.sin((Date.now() / 1300) * Math.PI * 2) * 0.18;
          currentModel.current.rotation.y = restRotationY.current + wiggle;
        } else {
          currentModel.current.rotation.y = restRotationY.current;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", onResize);

    // drag-to-spin touch-friendly
    const getClientX = (e) => (e.touches ? e.touches[0].clientX : e.clientX);

    const onPointerDown = (e) => {
      isDragging.current = true;
      lastPointerX.current = getClientX(e);
      setShowDragHint(false);
    };
    const onPointerMove = (e) => {
      if (!isDragging.current || !currentModel.current) return;
      const x = getClientX(e);
      const deltaX = x - lastPointerX.current;
      lastPointerX.current = x;
      currentModel.current.rotation.y += deltaX * 0.012;
      restRotationY.current = currentModel.current.rotation.y;
    };
    const onPointerUp = () => {
      isDragging.current = false;
    };

    const dom = renderer.domElement;
    dom.style.touchAction = "none";
    dom.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      cancelAnimationFrame(animFrame.current);
      window.removeEventListener("resize", onResize);
      dom.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  // swap model on selection change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    setModelLoading(true);
    setShowDragHint(true);

    if (currentModel.current) {
      scene.remove(currentModel.current);
      currentModel.current = null;
    }

    loader.current.load(
      selected.model,
      (gltf) => {
        const model = gltf.scene;

        const rawBox = new THREE.Box3().setFromObject(model);
        const rawSize = rawBox.getSize(new THREE.Vector3());
        const scale = (selected.scale || 2.6) / rawSize.y;
        model.scale.setScalar(scale);

        const scaledBox = new THREE.Box3().setFromObject(model);
        const center = scaledBox.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.position.x += selected.offsetX || 0;

        const pivot = new THREE.Group();
        pivot.add(model);
        pivot.userData.baseY = 0;
        pivot.rotation.y = 0;
        restRotationY.current = 0;

        scene.add(pivot);
        currentModel.current = pivot;
        setModelLoading(false);
      },
      undefined,
      (err) => {
        console.error(`Model load error for ${selected.id}:`, err);
        setModelLoading(false);
      },
    );
  }, [selectedIndex]);

  const handleSelect = (index) => setSelectedIndex(index);

  const handleConfirm = () => {
    bounceStart.current = Date.now();
    setTimeout(() => {
      navigate("/childRegistration", { state: { avatar: selected.id, mode: location.state?.mode } });
    }, 420);
  };

  return (
    <div className="setup-container setup-container--habitat">
      <AvatarHabitatBackdrop avatarId={selected.id} />

      <button
        className="setup-back setup-back--on-habitat"
        onClick={() => navigate(isAddChildMode ? "/account" : "/registering")}
      >

        <ChevronLeft size={18} /> back
      </button>

      <div className="firefly-layer">
        <div className="firefly" />
        <div className="firefly" />
        <div className="firefly" />
        <div className="firefly" />
        <div className="firefly" />
        <div className="firefly" />
      </div>

      <img
        src="/assets/koda-logo.png"
        alt="Koda"
        className="setup-logo setup-logo--corner"

        onError={(e) => {
          e.target.style.visibility = "hidden";
        }}
      />

      <div className="setup-card setup-card--on-habitat">
        <div className="setup-progress">
          <div className="setup-dot" />
          <div className="setup-dot active" />
          <div className="setup-dot" />
        </div>
        <h1 className="setup-title avatar-select-heading">Who will represent your little one? 🍃</h1>
        <p key={selected.id} className="avatar-habitat-label">
          <MapPin size={13} strokeWidth={2.5} />
          <span>{selected.habitat}</span>
        </p>


        {/* 3D character stage */}
        <div className="avatar-stage-row">
          <button
            className="avatar-arrow-btn"
            onClick={() =>
              handleSelect((selectedIndex - 1 + AVATARS.length) % AVATARS.length)
            }
            aria-label="Previous character"
          >
            ‹
          </button>

          <div className="avatar-stage-wrap">
            {modelLoading && <div className="avatar-stage-loading">loading…</div>}
            <div className="avatar-sculpture-stage" ref={mountRef} />
            {showDragHint && (
              <div className="avatar-drag-hint-icon" aria-label="drag to spin">
                <div className="avatar-drag-tap-circle" />
                <Pointer size={28} strokeWidth={2} className="avatar-drag-cursor" />
              </div>
            )}
          </div>

          <button
            className="avatar-arrow-btn"
            onClick={() => handleSelect((selectedIndex + 1) % AVATARS.length)}
            aria-label="Next character"
          >
            ›
          </button>
        </div>
        <div className="avatar-dot-row">
          {AVATARS.map((_, i) => (
            <div
              key={i}
              className={`avatar-dot ${i === selectedIndex ? "active" : ""}`}
              onClick={() => handleSelect(i)}
            />
          ))}
        </div>

        <button className="setup-btn-primary" onClick={handleConfirm}>
          Confirm
        </button>

        {!isAddChildMode && (
          <p className="setup-footer">
            Already have a child profile?{" "}
            <a onClick={() => navigate("/login")}>Join here</a>
          </p>
        )}
      </div>
    </div>
  );
};

export default AvatarSelection;