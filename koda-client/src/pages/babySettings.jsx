import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PencilLine, Check, X } from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import "../App.css";
import {
  getSelectedChildForUser,
  setSelectedChildForUser,
} from "../utils/authStorage";
import { API_URL } from "../config";

const AVATARS = ["🐻", "🦊", "🐼", "🐨", "🐸", "🦁", "🐰", "🐮", "🦋"];

function IdleBear() {
  const group = useRef();
  const { scene } = useGLTF("/bear.glb");
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    group.current.position.y = Math.sin(t * 2) * 0.06;
  });
  return (
    <primitive
      ref={group}
      object={scene}
      scale={1}
      position={[-0.3, 0.1, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

useGLTF.preload("/bear.glb");

const BabySettings = () => {
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [avatar, setAvatar] = useState("🐻");
  const [weight, setWeight] = useState("");
  const [allergies, setAllergies] = useState("");
  const [other, setOther] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const applyChildProfile = (profile) => {
    if (!profile) return;
    setChild(profile);
    setName(profile.name || "");
    setDob(profile.dob || "");
    setAvatar(profile.avatar || "🐻");
    setWeight(profile.weight || "");
    setAllergies(profile.allergies || "");
    setOther(profile.other || "");
  };

  const ageLabel = useMemo(() => {
    if (!dob) return "Age not set";
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return "Age not set";

    const now = new Date();
    let months =
      (now.getFullYear() - birthDate.getFullYear()) * 12 +
      (now.getMonth() - birthDate.getMonth());
    if (now.getDate() < birthDate.getDate()) months -= 1;
    if (months < 0) return "Age not set";

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years >= 1) {
      return `${years} ${years === 1 ? "year" : "years"} old`;
    } else {
      return `${remainingMonths} ${remainingMonths === 1 ? "month" : "months"} old`;
    }
  }, [dob]);

  useEffect(() => {
    const loadChild = async () => {
      try {
        const parsedChild = getSelectedChildForUser();
        const legacyChildRaw = localStorage.getItem("selectedChild");
        const legacyChild = legacyChildRaw ? JSON.parse(legacyChildRaw) : null;
        const token = localStorage.getItem("token");

        if (token) {
          const response = await fetch(`${API_URL}/api/children`, {
            headers: { "x-auth-token": token },
          });
          if (response.ok) {
            const children = await response.json();
            const matchedChild =
              children.find((item) => item._id === parsedChild?._id) ||
              children.find((item) => item._id === legacyChild?._id) ||
              children[0] ||
              parsedChild ||
              legacyChild;
            if (matchedChild) {
              applyChildProfile(matchedChild);
              setSelectedChildForUser(matchedChild);
            }
          } else if (parsedChild) {
            applyChildProfile(parsedChild);
          }
        }
      } catch (error) {
        console.error("Could not load child profile:", error);
      } finally {
        setLoading(false);
      }
    };
    loadChild();
  }, []);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!child?._id) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/children/${child._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-auth-token": token },
        body: JSON.stringify({ name, dob, avatar, weight, allergies, other }),
      });
      if (response.ok) {
        const updatedChild = await response.json();
        setSelectedChildForUser(updatedChild);
        setChild(updatedChild);
        setIsEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (error) {
      console.error("Could not save child profile:", error);
    }
  };

  return (
    <div
      className="as-page"
      style={{
        minHeight: "100vh",
        backgroundImage: `url(${process.env.PUBLIC_URL + "/lightmode.jpg"})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        paddingBottom: "120px",
      }}
    >
      <div className="as-shell">
        {loading ? (
          <div className="as-loading">loading profile…</div>
        ) : (
          <>
            {/* top card */}
            <div
              className="as-info-card"
              style={{ position: "relative", marginBottom: "20px" }}
            >
              <div
                className="as-hero"
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  backdropFilter: "none",
                  boxShadow: "none",
                }}
              >
                <div
                  className="as-bear-canvas"
                  style={{ width: "100px", height: "100px" }}
                >
                  <Canvas camera={{ position: [0, 0, 3], fov: 45 }}>
                    <ambientLight intensity={2.5} />
                    <directionalLight position={[5, 5, 5]} intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={0.6} />
                    <React.Suspense fallback={null}>
                      <IdleBear />
                    </React.Suspense>
                  </Canvas>
                </div>

                <div className="as-hero-text">
                  <h1 style={{ fontSize: "2.2rem", margin: "0" }}>
                    {name || "Gracie"}
                  </h1>
                  <p style={{ fontSize: "1rem", opacity: 0.8 }}>{ageLabel}</p>
                </div>

                <button
                  type="button"
                  className="as-edit-btn"
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    position: "absolute",
                    top: "15px",
                    right: "15px",
                    background: "none",
                    border: "none",
                  }}
                >
                  {isEditing ? (
                    <X size={20} color="black" strokeWidth={2.5} />
                  ) : (
                    <PencilLine size={20} color="black" strokeWidth={2.5} />
                  )}
                </button>
              </div>

              {!isEditing && (
                <div
                  className="as-info-grid"
                  style={{
                    marginTop: "15px",
                    borderTop: "1px solid rgba(255,255,255,0.2)",
                    paddingTop: "15px",
                  }}
                >
                  <div className="as-info-item">
                    <span className="as-info-label">birthday</span>
                    <span className="as-info-val">
                      {dob ? new Date(dob).toLocaleDateString() : "n/a"}
                    </span>
                  </div>
                  <div className="as-info-item">
                    <span className="as-info-label">allergies</span>
                    <span className="as-info-val">{allergies || "n/a"}</span>
                  </div>
                  <div className="as-info-item">
                    <span className="as-info-label">weight</span>
                    <span className="as-info-val">{weight || "n/a"}</span>
                  </div>
                  <div className="as-info-item">
                    <span className="as-info-label">other</span>
                    <span className="as-info-val">{other || "n/a"}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Mood Explanation  */}
            {!isEditing && (
              <div className="as-info-card">
                <h2 style={{ fontSize: "1.5rem", marginBottom: "8px" }}>
                  mood explanation
                </h2>
                <p style={{ opacity: 0.9, lineHeight: "1.4" }}>
                  <span style={{ opacity: 0.6 }}>
                    → {name || "Gracie"} has no mood explanations at this time.
                  </span>
                </p>
              </div>
            )}

            {/* edit form */}
            {isEditing && (
              <form className="as-form" onSubmit={handleSave}>
                <div className="as-field-group">
                  <label className="as-field">
                    <span>name</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label className="as-field">
                    <span>date of birth</span>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </label>
                  <label className="as-field">
                    <span>weight</span>
                    <input
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                    />
                  </label>
                  <label className="as-field">
                    <span>allergies</span>
                    <input
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                    />
                  </label>
                  <label className="as-field">
                    <span>other notes</span>
                    <input
                      value={other}
                      onChange={(e) => setOther(e.target.value)}
                    />
                  </label>
                </div>

                <p className="as-section-label" style={{ marginTop: "20px" }}>
                  pick an avatar
                </p>
                <div className="as-avatar-grid">
                  {AVATARS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={`as-avatar-opt${avatar === opt ? " active" : ""}`}
                      onClick={() => setAvatar(opt)}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                {message && <p className="as-error">{message}</p>}

                <button className="as-save-btn" type="submit">
                  <Check size={18} /> save changes
                </button>
              </form>
            )}

            {saveSuccess && (
              <div className="as-toast">
                <Check size={16} /> saved!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BabySettings;
