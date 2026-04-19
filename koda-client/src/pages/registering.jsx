import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import "./setUp.css";

const Registering = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Real-time tracking for the checkpoints
  const [passwordChecks, setPasswordChecks] = useState({
    length: false,
    number: false,
    uppercase: false,
    special: false,
  });

  const set = (key) => (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
    
    // Only run validation if we are typing in the password field
    if (key === "password") {
      setPasswordChecks({
        length: val.length >= 8,
        number: /\d/.test(val),
        uppercase: /[A-Z]/.test(val),
        special: /[@$!%*?&]/.test(val),
      });
    }
  };

  const handleSubmit = async () => {
    const isPasswordValid = Object.values(passwordChecks).every(Boolean);

    if (!form.username || !form.email || !form.password || !form.confirm) {
      setError("please fill in all fields.");
      return;
    }
    if (!isPasswordValid) {
      setError("please meet all password requirements.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("passwords don't match.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || "https://koda-babytracker.onrender.com";

      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.msg || "something went wrong.");
        setLoading(false);
        return;
      }

      localStorage.setItem("token", data.token);
      navigate("/avatarSelection");
    } catch (err) {
      setError("could not connect to server. try again.");
      setLoading(false);
    }
  };

  return (
    <div className="setup-container">
      <button className="setup-back" onClick={() => navigate("/")}>
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
      <img src="/koda-logo.png" alt="Koda" className="setup-logo" />

      <div className="setup-card">
        <h1 className="setup-title">Create your account</h1>
        
        {/* Username & Email Fields */}
        <div className="setup-field">
          <label>Username</label>
          <input placeholder="pick a username" value={form.username} onChange={set("username")} />
        </div>
        <div className="setup-field">
          <label>Email</label>
          <input type="email" placeholder="email@email.com" value={form.email} onChange={set("email")} />
        </div>

        {/* PASSWORD FIELD #1 */}
        <div className="setup-field">
          <label>Password</label>
          <input
            type="password"
            placeholder="create a password"
            value={form.password}
            onChange={set("password")}
          />
          
          {/* Checkpoints nested under the first password box */}
          <div className="password-checkpoints" style={{ marginTop: '10px', fontSize: '13px', textAlign: 'left', width: '100%' }}>
            <p style={{ color: passwordChecks.length ? '#4caf50' : '#f44336', margin: '2px 0' }}>
              {passwordChecks.length ? '✓' : '✕'} At least 8 characters
            </p>
            <p style={{ color: passwordChecks.uppercase ? '#4caf50' : '#f44336', margin: '2px 0' }}>
              {passwordChecks.uppercase ? '✓' : '✕'} Contains an uppercase letter
            </p>
            <p style={{ color: passwordChecks.number ? '#4caf50' : '#f44336', margin: '2px 0' }}>
              {passwordChecks.number ? '✓' : '✕'} Contains a number
            </p>
            <p style={{ color: passwordChecks.special ? '#4caf50' : '#f44336', margin: '2px 0' }}>
              {passwordChecks.special ? '✓' : '✕'} Contains a symbol (@$!%*?&)
            </p>
          </div>
        </div>

        {/* PASSWORD FIELD #2 (CONFIRM) */}
        <div className="setup-field" style={{ marginTop: '15px' }}>
          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="confirm your password"
            value={form.confirm}
            onChange={set("confirm")}
          />
        </div>

        {error && <p className="setup-error" style={{ color: '#f44336', marginTop: '10px' }}>{error}</p>}

        <button className="setup-btn-primary" onClick={handleSubmit} disabled={loading}>
          {loading ? "signing up..." : "Sign Up"}
        </button>
      </div>
    </div>
  );
};

export default Registering;
