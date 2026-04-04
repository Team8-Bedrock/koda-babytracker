import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./setUp.css";

const ChildRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const avatar = location.state?.avatar ?? "🐻";

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");

  const handleCreate = () => {
    if (!name || !dob) return;
    navigate("/parentDashboard");
  };

  return (
    <div className="setup-container">
      {/* back button */}
      <button className="setup-back" onClick={() => navigate("/avatarSelection")}>
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

      <div className="setup-card">
        <div className="setup-progress">
          <div className="setup-dot" />
          <div className="setup-dot" />
          <div className="setup-dot active" />
        </div>

        <div className="setup-child-preview">{avatar}</div>
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
          Create Baby Profile
        </button>
      </div>
    </div>
  );
};

export default ChildRegistration;
