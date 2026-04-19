import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./setUp.css"; // Reuse your existing styling

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResetRequest = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
  
    try {
      // Ensure this matches your server's port
      const API_URL = process.env.REACT_APP_API_URL || "https://koda-babytracker.onrender.com"; 
  
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }), // Ensure 'email' matches your state
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        setError(data.msg || "Something went wrong.");
      } else {
        setMessage(data.msg);
      }
    } catch (err) {
      setError("Could not connect to the server.");
    }
  };

  return (
    <div className="setup-container">
      <button className="setup-back" onClick={() => navigate("/login")}>
        <ChevronLeft size={18} /> back to login
      </button>

      <div className="setup-card">
        <h1 className="setup-title">Reset Password</h1>
        <p className="setup-sub">Enter your email to receive a reset link</p>

        <div className="setup-field">
          <label>Email Address</label>
          <input 
            type="email" 
            placeholder="your-email@email.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {error && <p className="setup-error">{error}</p>}
        {message && <p style={{ color: "#4caf50", fontSize: "14px" }}>{message}</p>}

        <button className="setup-btn-primary" onClick={handleResetRequest}>
          Send Reset Link
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;