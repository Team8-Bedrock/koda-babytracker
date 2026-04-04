import React from "react";
import { useNavigate } from "react-router-dom";
import "./setUp.css";

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="setup-container">
      {/* fireflies */}
      <div className="firefly-layer">
        <div className="firefly" />
        <div className="firefly" />
        <div className="firefly" />
        <div className="firefly" />
        <div className="firefly" />
        <div className="firefly" />
      </div>

      {/* sparkles */}

      <img src="/koda-logo.png" alt="Koda" className="setup-logo" />

      <div className="setup-card">
        <h1 className="setup-title">Welcome to KODA</h1>
        <p className="setup-sub">Who will you be joining as?</p>

        <button
          className="setup-btn-green"
          onClick={() => navigate("/registering")}
        >
          Parent
        </button>
        <button
          className="setup-btn-brown"
          onClick={() => navigate("/registering")}
        >
          Caregiver
        </button>

        <p className="setup-footer">
          Already have an account?{" "}
          <a onClick={() => navigate("/login")}>Login</a>
        </p>
      </div>
    </div>
  );
};

export default Welcome;
