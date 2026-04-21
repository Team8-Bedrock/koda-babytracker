import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Home,
  PlusSquare,
  BarChart2,
  MessageCircle,
  Settings,
  ChevronDown,
} from "lucide-react";
import { getSelectedChildForUser } from "../utils/authStorage";
import "../App.css";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState(null);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef(null);

  useEffect(() => {
    const savedChild = getSelectedChildForUser();
    if (savedChild) setSelectedChild(savedChild);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        settingsMenuRef.current &&
        !settingsMenuRef.current.contains(event.target)
      ) {
        setIsSettingsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ minHeight: "100vh", position: "relative" }}>
      {/* UNIVERSAL HEADER */}
      <header className="dashboard-header">
        <img src="/koda-logo.png" alt="Koda" className="koda-logo" />
        <button
          className="name-dropdown-btn"
          onClick={() => console.log("Open Child Switcher")}
          style={{ marginTop: "18px" }}
        >
          {selectedChild?.name || "Gracie"}
          <ChevronDown size={20} strokeWidth={2.5} />
        </button>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Bell size={32} strokeWidth={1.5} className="nav-icon" />
        </div>
      </header>

      {/* PAGE CONTENT — each page manages its own layout */}
      {children}

      {/* UNIVERSAL BOTTOM NAV */}
      <nav className="bottom-nav">
        <Home
          size={32}
          strokeWidth={1.6}
          className="nav-icon"
          onClick={() => navigate("/ParentDashboard")}
        />
        <PlusSquare
          size={32}
          strokeWidth={1.5}
          className="nav-icon"
          onClick={() => navigate("/add-activity")}
        />
        <BarChart2
          size={32}
          strokeWidth={2}
          className="nav-icon"
          onClick={() => navigate("/stats")}
        />
        <MessageCircle
          size={32}
          strokeWidth={1.5}
          className="nav-icon"
          onClick={() => navigate("/chat")}
        />
        <div className="settings-menu-wrapper" ref={settingsMenuRef}>
          <button
            type="button"
            className="settings-menu-trigger"
            onClick={() => setIsSettingsMenuOpen((c) => !c)}
            aria-haspopup="menu"
            aria-expanded={isSettingsMenuOpen}
          >
            <Settings size={40} strokeWidth={1.5} className="nav-icon" />
          </button>
          {isSettingsMenuOpen && (
            <div className="settings-dropdown" role="menu">
              <button
                type="button"
                className="settings-dropdown-item"
                onClick={() => {
                  setIsSettingsMenuOpen(false);
                  navigate("/babysettings");
                }}
              >
                {selectedChild?.name || "Gracie"}'s settings
              </button>
              <button
                type="button"
                className="settings-dropdown-item"
                onClick={() => {
                  setIsSettingsMenuOpen(false);
                  navigate("/account");
                }}
              >
                Account settings
              </button>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Layout;
