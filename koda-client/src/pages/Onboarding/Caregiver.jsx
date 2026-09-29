import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Leaf } from "lucide-react";
import "../../styling/pages/setUp.css";

const Caregiver = () => {
    const navigate = useNavigate();
    const [invite, setInvite] = useState("");
    const [error, setError] = useState("");

    const handleJoin = (e) => {
        e.preventDefault();
        if (!invite.trim()) {
            setError("please enter your invite link or code.");
            return;
        }
        setError("");
        navigate("/registering?role=caregiver", { state: { invite } });
    };

    return (
        <div className="setup-container setup-container--form setup-container--caregiver">
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

            <img
                src="/assets/koda-logo.png"
                alt="Koda"
                className="setup-logo setup-logo--corner"
                onError={(e) => { e.target.style.visibility = "hidden"; }}
            />

            <div className="setup-card setup-card--caregiver">
                <h1 className="setup-title">Welcome Caregiver</h1>

                {/* placeholder until the real image is ready */}
                <div className="caregiver-hero" aria-label="Caregiver image placeholder" />

                <p className="invite-note">{"Invite Code Required to Join\nthe Habitat"}</p>

                <form onSubmit={handleJoin} style={{ width: "100%" }}>
                    <div className="setup-field">
                        <label>{"\n"}</label>
                        <input
                            placeholder="paste your invite code"
                            value={invite}
                            onChange={(e) => setInvite(e.target.value)}
                        />
                    </div>

                    {error && <p className="setup-error">{error}</p>}

                    <button className="setup-btn-primary" type="submit">
                        Join <Leaf className="btn-leaf" />
                    </button>

                </form>

                <p className="setup-footer">
                    Already have an account?{" "}
                    <a onClick={() => navigate("/login")}>Login</a>
                </p>
            </div>
        </div>
    );
};

export default Caregiver;
