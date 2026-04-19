import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./setUp.css";
import { getCurrentUserId, selectedChildStorageKey } from "../utils/authStorage";

const Login = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleLogin = async () => {
    if (!form.email || !form.password) {
      setError("please enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || "https://koda-babytracker.onrender.com";
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.msg || "invalid credentials.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      const childRes = await fetch(`${API_URL}/api/children`, {
        headers: {
          "x-auth-token": data.token,
        },
      });

      const children = await childRes.json();
      const userId = data.user?.id || getCurrentUserId();
      const childKey = selectedChildStorageKey(userId);

      if (childKey && childRes.ok && Array.isArray(children) && children.length > 0) {
        localStorage.setItem(childKey, JSON.stringify(children[0]));
      } else if (childKey) {
        localStorage.removeItem(childKey);
      }

      navigate("/parentDashboard");
    } catch (err) {
      setError("connection failed.");
      setLoading(false);
    }
  };

  return (
    <div className="setup-container">
      <button className="setup-back" onClick={() => navigate("/")}>
        <ChevronLeft size={18} /> back
      </button>

      {/* The Fireflies you have in Registration */}
      <div className="firefly-layer">
        {[...Array(6)].map((_, i) => <div key={i} className="firefly" />)}
      </div>

      <img src="/koda-logo.png" alt="Koda" className="setup-logo" />

      <div className="setup-card">
        <h1 className="setup-title">Welcome Back</h1>
        <p className="setup-sub">Please Enter Your Details</p>

        <div className="setup-field">
          <label>Email</label>
          <input
            type="email"
            placeholder="your-email@email.com"
            value={form.email}
            onChange={set("email")}
          />
        </div>

        <div className="setup-field">
          <label>Password</label>
          <input
            type="password"
            placeholder="enter your password"
            value={form.password}
            onChange={set("password")}
          />
        </div>

        {error && <p className="setup-error">{error}</p>}

        <button className="setup-btn-primary" onClick={handleLogin} disabled={loading}>
          {loading ? "logging in..." : "Login"}
        </button>
        <button 
          type="button"
          style={{ 
            background: "none", 
            border: "none", 
            textDecoration: "underline", 
            cursor: "pointer", 
            marginTop: "10px",
            fontSize: "14px"
          }}
          onClick={() => navigate("/forgot-password")}
        >
          Forgot Password?
        </button>

        <p className="setup-footer">
          Don't have an account? <a onClick={() => navigate("/registering")}>Sign Up</a>
        </p>
      </div>
    </div>
  );
};

export default Login;