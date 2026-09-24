import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import "../../styling/pages/setUp.css";
import { setSelectedChildForUser } from "../../utils/authStorage";
import { getAvatarById, DEFAULT_MODEL } from "../../constants/avatars";
import { API_URL } from "../../config";

const ChildRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const avatarId = location.state?.avatar ?? "bear";
  const isAddChildMode = location.state?.mode === "addChild";
  const character = getAvatarById(avatarId);
  const characterModel = character?.model || DEFAULT_MODEL;

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [modelLoading, setModelLoading] = useState(true);

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const currentModel = useRef(null);
  const animFrame = useRef(null);
  const bounceStart = useRef(null);

  // three.js boot 
  useEffect(() => {
    const mount = mountRef.current;
    const w = mount.clientWidth;
    const h = mount.clientHeight;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0.5, 5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    scene.add(new THREE.AmbientLight(0xffffff, 2.5));
    const sun = new THREE.DirectionalLight(0xffffff, 0.5);
    sun.position.set(5, 5, 5);
    scene.add(sun);
    const fill = new THREE.PointLight(0xffffff, 0.6);
    fill.position.set(10, 10, 10);
    scene.add(fill);

    const loader = new GLTFLoader();
    loader.load(
      characterModel,
      (gltf) => {
        const model = gltf.scene;

        const rawBox = new THREE.Box3().setFromObject(model);
        const rawSize = rawBox.getSize(new THREE.Vector3());
        const scale = 2.6 / rawSize.y;
        model.scale.setScalar(scale);

        const scaledBox = new THREE.Box3().setFromObject(model);
        const center = scaledBox.getCenter(new THREE.Vector3());
        model.position.sub(center);

        const pivot = new THREE.Group();
        pivot.add(model);
        pivot.userData.baseY = 0;

        scene.add(pivot);
        currentModel.current = pivot;
        setModelLoading(false);
      },
      undefined,
      (err) => {
        console.error("Could not load character model:", err);
        setModelLoading(false);
      },
    );

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

    return () => {
      cancelAnimationFrame(animFrame.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [characterModel]);

  const handleCreate = async () => {
    if (!name || !dob) return;

    bounceStart.current = Date.now();

    try {
      const token = localStorage.getItem("token");

      const [res] = await Promise.all([
        fetch(`${API_URL}/api/children`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-auth-token": token,
          },
          body: JSON.stringify({
            name,
            dob,
            avatar: avatarId,
          }),
        }),
        new Promise((resolve) => setTimeout(resolve, 420)),
      ]);

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        return;
      }

      setSelectedChildForUser(data);
      navigate(isAddChildMode ? "/account" : "/parentDashboard");
    } catch (err) {
      console.error("Could not create child profile:", err);
    }
  };

  return (
    <div
      className="setup-container"
      style={{ background: character?.bg }}
    >
      {/* back button */}
      <button
        className="setup-back"
        onClick={() => navigate("/avatarSelection", { state: { mode: location.state?.mode } })}
      >
        <ChevronLeft size={18} /> back
      </button>

      {/* fireflies */}
      <div className="firefly-layer">
        <div className="firefly" />
        <div className="firefly" />
        <div className="firefly" />
        <div className="firefly" />
        <div className="firefly" />
        <div className="firefly" />
      </div>
      <img src="/koda-logo.png" alt="Koda" className="setup-logo" onError={(e) => { e.target.style.visibility = "hidden"; }} />

      <div className="setup-card">
        <div className="setup-progress">
          <div className="setup-dot" />
          <div className="setup-dot" />
          <div className="setup-dot active" />
        </div>

        <div className="setup-child-preview">
          {modelLoading && <div className="avatar-stage-loading">loading…</div>}
          <div className="avatar-sculpture-stage" ref={mountRef} />
        </div>
        <h1 className="setup-title"> Please Enter your child's </h1>
        <h1 className="setup-title"> details</h1>
        <div className="setup-field">
          <label>Name</label>
          <input
            placeholder="e.g. Gracie"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="setup-field">
          <label>Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
        </div>

        <button
          className="setup-btn-primary"
          disabled={!name || !dob}
          onClick={handleCreate}
        >
          {isAddChildMode ? "Add Child" : "Create Baby Profile"}
        </button>
      </div>
    </div>
  );
};

export default ChildRegistration;