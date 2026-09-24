// universal header (logo/child-name pill/bell), page content, and the bottom nav bar. 
// what needs to be fixed:
// 1. headers for some reason are weirdly different on account settings, the log history page and the analytics page 
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Home,
  PlusSquare,
  BarChart2,
  MessageCircle,
  Settings as SettingsIcon,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { getSelectedChildForUser, setSelectedChildForUser } from "../utils/authStorage";
import { getPageLabel, getPillFontSize } from "../constants/pageLabels";
import { API_URL } from "../config";
import HabitatBackground from "./HabitatBackground";
import NavIconButton from "./NavIconButton";
import DarkModeToggle from "./DarkModeToggle";
import "../styling/global/layout.css";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedChild, setSelectedChild] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [childOptions, setChildOptions] = useState([]);
  const switcherRef = useRef(null);
  const isActivityLogPage = location.pathname.toLowerCase() === "/add-activity";

  useEffect(() => {
    const savedChild = getSelectedChildForUser();
    if (savedChild) setSelectedChild(savedChild);

    const token = localStorage.getItem("token");
    if (!token) return;

    fetch(`${API_URL}/api/children`, { headers: { "x-auth-token": token } })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setChildOptions(Array.isArray(data) ? data : []))
      .catch(() => setChildOptions([]));
  }, []);

  useEffect(() => {
    if (!isSwitcherOpen) return;

    const onClickOutside = (event) => {
      if (switcherRef.current && !switcherRef.current.contains(event.target)) {
        setIsSwitcherOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isSwitcherOpen]);

  const pageLabel = getPageLabel(location.pathname, selectedChild?.name || "Gracie");

  const handleSelectChild = (child) => {
    setSelectedChildForUser(child);
    setIsSwitcherOpen(false);
    window.location.reload();
  };

  return (
    <div className="layout-mobile-frame">
      <HabitatBackground />

      <header className="layout-header">
        <button
          type="button"
          onClick={() => navigate("/ParentDashboard")}
          aria-label="Go to home"
          className="layout-logo-btn"
        >
          {logoFailed ? (
            <div className="koda-logo koda-logo-corner layout-logo-fallback">koda</div>
          ) : (
            <img
              src="/assets/koda-logo.png"
              alt="Koda"
              className="koda-logo koda-logo-corner"
              onError={() => setLogoFailed(true)}
            />
          )}
        </button>

        {isActivityLogPage ? (
          <div className="name-dropdown-btn layout-name-pill-static">
            Activity Log
          </div>
        ) : (
          <div className="child-switcher" ref={switcherRef}>
            <button
              className="name-dropdown-btn"
              onClick={() => setIsSwitcherOpen((prev) => !prev)}
              style={{ "--pill-font-size": `${getPillFontSize(pageLabel)}px` }}
            >
              <span>{pageLabel}</span>
              <ChevronDown size={14} strokeWidth={2.5} className="layout-name-pill-chevron" />
            </button>

            {isSwitcherOpen && (
              <div className="child-switcher-menu">
                {childOptions.length > 0 ? (
                  childOptions.map((child) => (
                    <button
                      key={child._id}
                      type="button"
                      className={`child-switcher-item ${selectedChild?._id === child._id ? "child-switcher-item--active" : ""}`}
                      onClick={() => handleSelectChild(child)}
                    >
                      <span>{child.name}</span>
                      {selectedChild?._id === child._id && <CheckCircle2 size={14} />}
                    </button>
                  ))
                ) : (
                  <p className="child-switcher-empty">no child profiles yet</p>
                )}
              </div>
            )}
          </div>
        )}

        <NavIconButton
          icon={Bell}
          size={20}
          strokeWidth={1.6}
          onClick={() => { }}
          className="header-bell-btn"
        />
      </header>


      {children}

      <DarkModeToggle
        isDarkMode={isDarkMode}
        onToggle={() => setIsDarkMode((prev) => !prev)}
      />

      <nav className="layout-bottom-nav">
        <NavIconButton icon={Home} onClick={() => navigate("/ParentDashboard")} />
        <NavIconButton icon={PlusSquare} onClick={() => navigate("/add-activity")} />
        <NavIconButton icon={BarChart2} strokeWidth={2} onClick={() => navigate("/analytics")} />
        <NavIconButton icon={MessageCircle} onClick={() => navigate("/chat")} />
        <NavIconButton icon={SettingsIcon} onClick={() => navigate("/account")} />
      </nav>
    </div>
  );
};

export default Layout;
