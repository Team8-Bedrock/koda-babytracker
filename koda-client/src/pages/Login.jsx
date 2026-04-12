import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./setUp.css";

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
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
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
        <p className="setup-sub">Log in to check on your little one 🐻</p>

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

        <p className="setup-footer">
          New to Koda? <a onClick={() => navigate("/register")}>Create account</a>
        </p>
      </div>
    </div>
  );
};

export default Login;