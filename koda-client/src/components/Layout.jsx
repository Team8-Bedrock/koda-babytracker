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
import MoodBuddy from "./MoodBuddy";
import NightTheme from "./NightTheme";
import ChildSwitchOverlay, { startChildSwitch } from "./childSwitch";
import CharacterHead from "./CharacterHead";
import "../styling/global/layout.css";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedChild, setSelectedChild] = useState(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [childOptions, setChildOptions] = useState([]);
  const [headerLabel, setHeaderLabel] = useState("");
  const [switchKey, setSwitchKey] = useState(0);
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

  useEffect(() => {
    const updateHeader = (event) => setHeaderLabel(event.detail?.label || "");
    window.addEventListener("koda-header-label", updateHeader);
    return () => window.removeEventListener("koda-header-label", updateHeader);
  }, []);

  const pageLabel = headerLabel || getPageLabel(location.pathname, selectedChild?.name || "Gracie");

  const handleSelectChild = (child) => {
    setIsSwitcherOpen(false);
    if (selectedChild?._id === child._id) return;
    startChildSwitch(child, switcherRef.current, () => {
      setSelectedChildForUser(child);
      setSelectedChild(child);
      setHeaderLabel("");
      setSwitchKey((k) => k + 1);
    });
  };

  return (
    <div className="layout-mobile-frame">
      <NightTheme />
      <ChildSwitchOverlay />
      <HabitatBackground key={`habitat-${switchKey}`} />
      {selectedChild ? <MoodBuddy key={`buddy-${selectedChild._id}-${switchKey}`} child={selectedChild} /> : null}

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
                <style>{"@keyframes kcsItemIn{from{opacity:0;transform:translateY(-6px) scale(0.96)}to{opacity:1;transform:none}}"}</style>
                {childOptions.length > 0 ? (
                  childOptions.map((child, index) => (
                    <button
                      key={child._id}
                      type="button"
                      className={`child-switcher-item ${selectedChild?._id === child._id ? "child-switcher-item--active" : ""}`}
                      onClick={() => handleSelectChild(child)}
                      style={{ animation: `kcsItemIn 0.28s cubic-bezier(.2,1.3,.4,1) ${index * 0.05}s both` }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <CharacterHead child={child} size={30} style={{ background: "rgba(255,255,255,0.55)", boxShadow: "inset 0 0 0 1.5px rgba(90,70,53,0.18)" }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{child.name}</span>
                      </span>
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


      <React.Fragment key={`page-${switchKey}`}>{children}</React.Fragment>


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