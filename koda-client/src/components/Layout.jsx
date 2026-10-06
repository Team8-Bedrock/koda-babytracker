// universal header (logo/child-name pill/bell), page content, and the bottom nav bar. 
// what needs to be fixed:
// 1. headers for some reason are weirdly different on account settings, the log history page and the analytics page 
import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Bell,
  Home,
  PlusSquare,
  BarChart2,
  MessageCircle,
  Settings as SettingsIcon,
  ChevronDown,
} from "lucide-react";
import { getSelectedChildForUser } from "../utils/authStorage";
import { getPageLabel, getPillFontSize } from "../constants/pageLabels";
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
  const isActivityLogPage = location.pathname.toLowerCase() === "/add-activity";

  useEffect(() => {
    const savedChild = getSelectedChildForUser();
    if (savedChild) setSelectedChild(savedChild);
  }, []);

  const pageLabel = getPageLabel(location.pathname, selectedChild?.name || "Gracie");

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
          <button
            className="name-dropdown-btn"
            onClick={() => console.log("Open Child Switcher")}
            style={{ "--pill-font-size": `${getPillFontSize(pageLabel)}px` }}
          >
            <span>{pageLabel}</span>
            <ChevronDown size={14} strokeWidth={2.5} className="layout-name-pill-chevron" />
          </button>
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
