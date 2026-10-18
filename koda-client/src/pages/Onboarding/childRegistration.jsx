import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft, Leaf } from "lucide-react";
import "../../styling/pages/setUp.css";
import { setSelectedChildForUser } from "../../utils/authStorage";
import { getAvatarById, DEFAULT_MODEL } from "../../constants/avatars";
import { API_URL } from "../../config";
import AvatarStage from "../../components/AvatarStage";
import KodaLoader from "../../components/Kodaloader";

const bubbleStyle = {
  position: "absolute",
  top: -62,
  left: "50%",
  transform: "translateX(-50%)",
  padding: "7px 22px",
  minWidth: 150,
  textAlign: "center",
  borderRadius: 999,
  background: "#fff8ee",
  border: "2px solid rgba(90, 70, 53, 0.25)",
  boxShadow: "0 4px 12px rgba(30, 60, 40, 0.14)",
  color: "#5a4635",
  fontWeight: 700,
  fontSize: 13,
  whiteSpace: "nowrap",
  zIndex: 2,
  pointerEvents: "none",
};

const STAGE_HEIGHT = 300;

const stageCss = `
.setup-child-preview.koda-reg-preview { height: ${STAGE_HEIGHT}px; min-height: ${STAGE_HEIGHT}px; max-height: none; overflow: visible; }
.koda-reg-stage { width: 100%; height: ${STAGE_HEIGHT}px; position: relative; }
.koda-reg-stage canvas { overflow: visible; }
`;

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
  const [creating, setCreating] = useState(false);
  const stageRef = useRef(null);
  const greetedName = useRef("");

  const handleReady = useCallback(() => setModelLoading(false), []);

  useEffect(() => {
    const id = setTimeout(() => setModelLoading(false), 12000);
    return () => clearTimeout(id);
  }, [avatarId]);

  const handleNameBlur = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== greetedName.current) {
      greetedName.current = trimmed;
      stageRef.current?.play("happy");
    }
  };

  const handleDobChange = (value) => {
    setDob(value);
    if (value) stageRef.current?.pat();
  };

  const handleCreate = async () => {
    if (!name || !dob || creating) return;
    setCreating(true);
    stageRef.current?.celebrate();

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
        new Promise((resolve) => setTimeout(resolve, 900)),
      ]);

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        setCreating(false);
        return;
      }

      setSelectedChildForUser(data);
      navigate(isAddChildMode ? "/account" : "/parentDashboard");
    } catch (err) {
      console.error("Could not create child profile:", err);
      setCreating(false);
    }
  };

  const trimmedName = name.trim();

  return (
    <div
      className="setup-container setup-container--child"
      style={{ background: character?.bg }}
    >
      <button
        className="setup-back setup-back--child"
        onClick={() => navigate("/avatarSelection", { state: { mode: location.state?.mode } })}
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
      <div className="setup-progress" style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", margin: 0, zIndex: 3 }}>
        <div className="setup-dot" />
        <div className="setup-dot" />
        <div className="setup-dot active" />
      </div>
      <img src="/assets/koda-logo.png" alt="Koda" className="setup-logo setup-logo--corner" onError={(e) => { e.target.style.visibility = "hidden"; }} />

      <div className="setup-card setup-card--child">

        <style>{stageCss}</style>
        <div className="setup-child-preview koda-reg-preview" style={{ position: "relative" }}>
          {modelLoading && <KodaLoader label="getting cozy" />}
          {!modelLoading && (
            <div style={bubbleStyle}>
              {trimmedName ? `hi, my name is ${trimmedName}!` : "hi, my name is…"}
            </div>
          )}
          <AvatarStage
            ref={stageRef}
            avatarId={avatarId}
            modelUrl={characterModel}
            sizeScale={(character?.scale || 2.6) / 2.6}
            hints={[]}
            className="koda-reg-stage"
            onReady={handleReady}
          />
        </div>
        <section className="child-details-panel">
          <h1 className="setup-title">Please Enter your child's details</h1>
          <div className="setup-field">
            <label htmlFor="child-name">Name</label>
            <input
              id="child-name"
              placeholder="e.g. Gracie"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleNameBlur}
            />
          </div>
          <div className="setup-field">
            <label htmlFor="child-dob">Date of Birth</label>
            <input
              id="child-dob"
              type="date"
              value={dob}
              onChange={(e) => handleDobChange(e.target.value)}
            />
          </div>

          <button
            className="setup-btn-primary"
            disabled={!name || !dob || creating}
            onClick={handleCreate}
          >
            {isAddChildMode ? "Add Child" : "Create Baby Profile"}
            <Leaf className="btn-leaf" aria-hidden="true" />
          </button>
        </section>
      </div>
    </div>
  );
};

export default ChildRegistration;