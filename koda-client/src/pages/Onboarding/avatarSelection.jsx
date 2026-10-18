import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../../styling/pages/setUp.css";
import { AVATARS } from "../../constants/avatars";
import { ChevronLeft, MapPin, Leaf } from "lucide-react";
import AvatarHabitatBackdrop from "../../components/AvatarHabitatBackdrop";
import AvatarStage from "../../components/AvatarStage";
import KodaLoader from "../../components/Kodaloader";

const AvatarSelection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAddChildMode = location.state?.mode === "addChild";
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [modelLoading, setModelLoading] = useState(true);

  const selected = AVATARS[selectedIndex];

  useEffect(() => {
    setModelLoading(true);
  }, [selected.id]);

  const handleReady = useCallback(() => setModelLoading(false), []);

  useEffect(() => {
    const id = setTimeout(() => setModelLoading(false), 12000);
    return () => clearTimeout(id);
  }, [selected.id]);

  const handleSelect = (index) => setSelectedIndex(index);

  const handleConfirm = () => {
    navigate("/childRegistration", { state: { avatar: selected.id, mode: location.state?.mode } });
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
        <div className="avatar-select-header">
          <h1 className="setup-title avatar-select-heading">Who will represent your little one? <Leaf className="btn-leaf" /></h1>
          <p key={selected.id} className="avatar-habitat-label">
            <MapPin size={13} strokeWidth={2.5} />
            <span>{selected.habitat}</span>
          </p>
        </div>

        <div className="avatar-stage-row">
          <button
            className="avatar-arrow-btn"
            onClick={() => handleSelect((selectedIndex - 1 + AVATARS.length) % AVATARS.length)}
            aria-label="Previous character"
          >
            ‹
          </button>

          <div className="avatar-stage-wrap">
            {modelLoading && <KodaLoader label="waking up" />}
            <AvatarStage
              avatarId={selected.id}
              modelUrl={selected.model}
              sizeScale={(selected.scale || 2.6) / 2.6}
              offsetX={(selected.offsetX || 0) * (1.8 / 2.6)}
              onReady={handleReady}
            />
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

        <div className="avatar-select-actions">
          <button className="setup-btn-primary" onClick={handleConfirm}>
            Confirm
          </button>

          {!isAddChildMode && (
            <p className="setup-footer">
              Already have an account?{" "}
              <button type="button" className="setup-footer-link" onClick={() => navigate("/login")}>Log in</button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvatarSelection;