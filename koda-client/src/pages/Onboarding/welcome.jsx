import React from "react";
import { useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";
import "../../styling/pages/setUp.css";
const kodaLogo = "/assets/koda-logo.png";

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

      <img src={kodaLogo} alt="Koda" className="setup-logo-x" onError={(e) => { e.target.style.visibility = "hidden"; }} />

      <div className="setup-card">
        <h1 className="setup-title">Welcome,</h1>
        <p className="setup-sub">Who will you be joining as?</p>

        <button
          className="setup-btn-green"
          onClick={() => navigate("/registering?role=parent")}
        >
          Parent <Leaf className="btn-leaf" />
        </button>
        <button
          className="setup-btn-brown"
          onClick={() => navigate("/caregiver")}
        >
          Caretaker
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