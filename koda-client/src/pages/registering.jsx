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

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.username || !form.email || !form.password || !form.confirm) {
      setError("please fill in all fields.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("passwords don't match.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
      {/* back button */}
      <button className="setup-back" onClick={() => navigate("/")}>
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
        <div class="setup-progress">
          <div class="setup-dot active"></div>
          <div class="setup-dot"></div>
          <div class="setup-dot"></div>
        </div>

        <h1 class="setup-title">Create your account</h1>
        <p class="setup-sub">Let's get you set up 🌱</p>

        <div className="setup-field">
          <label>Username</label>
          <input
            placeholder="pick a username"
            value={form.username}
            onChange={set("username")}
          />
        </div>
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
            placeholder="create a password"
            value={form.password}
            onChange={set("password")}
          />
        </div>
        <div className="setup-field">
          <label>Confirm Password</label>
          <input
            type="password"
            placeholder="confirm your password"
            value={form.confirm}
            onChange={set("confirm")}
          />
        </div>

        {error && <p className="setup-error">{error}</p>}

        <button
          className="setup-btn-primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "signing up..." : "Sign Up"}
        </button>

        <p className="setup-footer">
          Already have an account?{" "}
          <a onClick={() => navigate("/login")}>Login</a>
        </p>
      </div>
    </div>
  );
};

export default Registering;
