import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./setUp.css";

const ResetPassword = () => {
  const { token } = useParams(); // Grabs the secret token from the URL
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");

  const handleReset = async () => {
    if (password !== confirm) return alert("Passwords do not match");

    try {
      const API_URL = process.env.REACT_APP_API_URL || "https://koda-babytracker.onrender.com";
      const res = await fetch(`${API_URL}/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("Password updated! Logging you in...");
        navigate("/login");
      } else {
        alert(data.msg);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="setup-container">
      <div className="setup-card">
        <h1 className="setup-title">New Password</h1>
        <div className="setup-field">
          <label>New Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="setup-field">
          <label>Confirm New Password</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <button className="setup-btn-primary" onClick={handleReset}>Update Password</button>
      </div>
    </div>
  );
};

export default ResetPassword;