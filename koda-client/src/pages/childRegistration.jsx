import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./setUp.css";
import { setSelectedChildForUser } from "../utils/authStorage";

const ChildRegistration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const avatar = location.state?.avatar ?? "🐻";

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");

  const handleCreate = async () => {
    if (!name || !dob) return;

    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const token = localStorage.getItem("token");

      const res = await fetch(`${API_URL}/api/children`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-auth-token": token,
        },
        body: JSON.stringify({
          name,
          dob,
          avatar,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        return;
      }

      setSelectedChildForUser(data);
      navigate("/parentDashboard");
    } catch (err) {
      console.error("Could not create child profile:", err);
    }
  };

  return (
    <div className="setup-container">
      {/* back button */}
      <button
        className="setup-back"
        onClick={() => navigate("/avatarSelection")}
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
      <img src="/koda-logo.png" alt="Koda" className="setup-logo" />

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
