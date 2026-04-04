import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./setUp.css";

const AVATARS = ["🐻", "🦊", "🐼", "🐨", "🐸", "🦁", "🐰", "🐮", "🦋"];

const AvatarSelection = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);

  const handleConfirm = () => {
    if (selected === null) return;
    navigate("/childRegistration", { state: { avatar: AVATARS[selected] } });
  };

  return (
    <div className="setup-container">
      <button className="setup-back" onClick={() => navigate("/registering")}>
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

      <img src="/koda-logo.png" alt="Koda" className="setup-logo" />

      <div className="setup-card">
        <div className="setup-progress">
          <div className="setup-dot" />
          <div className="setup-dot active" />
          <div className="setup-dot" />
        </div>

        <h1 className="setup-title">Pick your child's character</h1>
        <p className="setup-sub">Who represents your little one? 🍃</p>

        <div className="setup-avatar-grid">
          {AVATARS.map((emoji, i) => (
            <div
              key={i}
              className={`setup-avatar-cell${selected === i ? " selected" : ""}`}
              onClick={() => setSelected(i)}
            >
              {emoji}
              {selected === i && <span className="setup-avatar-check">✓</span>}
            </div>
          ))}
        </div>

        <button
          className="setup-btn-primary"
          disabled={selected === null}
          onClick={handleConfirm}
        >
          Confirm Animal
        </button>

        <p className="setup-footer">
          Already have a child profile?{" "}
          <a onClick={() => navigate("/login")}>Join here</a>
        </p>
      </div>
    </div>
  );
};

export default AvatarSelection;
