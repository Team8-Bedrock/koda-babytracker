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
import { getCurrentUserId, getSelectedChildForUser, setSelectedChildForUser } from "../utils/authStorage";
import { getPageLabel, getPillFontSize } from "../constants/pageLabels";
import { API_URL } from "../config";
import HabitatBackground from "./HabitatBackground";
import NavIconButton from "./NavIconButton";
import MoodBuddy from "./MoodBuddy";
import { addNotification, getNotifications, removeNotification } from "../utils/notifications";
import "../styling/global/layout.css";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedChild, setSelectedChild] = useState(null);
  const [logoFailed, setLogoFailed] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [childOptions, setChildOptions] = useState([]);
  const [headerLabel, setHeaderLabel] = useState("");
  const [notifications, setNotifications] = useState(getNotifications);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const switcherRef = useRef(null);
  const notificationsRef = useRef(null);
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
    const update = () => setNotifications(getNotifications());
    window.addEventListener("koda-notifications-updated", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("koda-notifications-updated", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return undefined;
    const close = (event) => {
      if (!notificationsRef.current?.contains(event.target)) setNotificationsOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [notificationsOpen]);

  useEffect(() => {
    const childId = selectedChild?._id;
    const token = localStorage.getItem("token");
    if (!childId || !token) return undefined;
    let active = true;
    const checkChat = async () => {
      try {
        const response = await fetch(`${API_URL}/api/chat/${childId}/messages`, {
          headers: { "x-auth-token": token },
        });
        if (!response.ok) return;
        const messages = await response.json();
        if (!active || !Array.isArray(messages)) return;
        const currentUserId = getCurrentUserId();
        const seenKey = `chatNotificationsSeen:${currentUserId}:${childId}`;
        let seen = [];
        try {
          const savedSeen = JSON.parse(localStorage.getItem(seenKey) || "[]");
          seen = Array.isArray(savedSeen) ? savedSeen : [];
        } catch (error) {
          console.error("Could not read seen chat notifications:", error);
        }
        const seenIds = new Set(Array.isArray(seen) ? seen : []);

        messages
          .filter((message) => {
            const senderId = message.senderId?._id || message.senderId;
            const isIncoming = String(senderId) !== String(currentUserId);
            return isIncoming && !seenIds.has(message._id);
          })
          .forEach((message) => {
            addNotification({
              id: `chat:${childId}:${message._id}`,
              title: `${message.senderId?.username || "Family chat"} sent a message`,
              path: "/chat",
              message: message.kind === "photo"
                ? "Sent a photo"
                : message.kind === "voice"
                  ? "Sent a voice message"
                  : message.text || "Sent a message",
            });
            seenIds.add(message._id);
          });

        localStorage.setItem(seenKey, JSON.stringify([...seenIds].slice(-500)));
      } catch (error) {
        console.error("Could not check chat notifications:", error);
      }
    };
    checkChat();
    const interval = setInterval(checkChat, 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [selectedChild?._id]);

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
    setSelectedChildForUser(child);
    setIsSwitcherOpen(false);
    window.location.reload();
  };

  const handleNotificationPress = (notification) => {
    setNotifications((current) =>
      current.filter((item) => item.id !== notification.id)
    );
    removeNotification(notification.id);
    if (notification.path) {
      setNotificationsOpen(false);
      navigate(notification.path);
    }
  };

  return (
    <div className="layout-mobile-frame">
      <HabitatBackground />
      {selectedChild ? <MoodBuddy child={selectedChild} /> : null}

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

        <div className="header-notifications" ref={notificationsRef}>
          <NavIconButton
            icon={Bell}
            size={20}
            strokeWidth={1.6}
            onClick={() => setNotificationsOpen((open) => !open)}
            aria-label="Open notifications"
            className="header-bell-btn"
          />
          {notifications.length > 0 && <span className="header-notification-dot" />}
          {notificationsOpen && (
            <div className="notifications-menu" role="region" aria-label="Notifications">
              <h2>notifications</h2>
              {notifications.length ? notifications.map((notification) => (
                <button
                  type="button"
                  className="notification-item"
                  key={notification.id}
                  onClick={() => handleNotificationPress(notification)}
                >
                  <strong>{notification.title}</strong>
                  <span>{notification.message}</span>
                </button>
              )) : <p className="notifications-empty">no new notifications</p>}
            </div>
          )}
        </div>
      </header>


      {children}


      <nav className="layout-bottom-nav">
        <NavIconButton icon={Home} onClick={() => navigate("/ParentDashboard")} />
        <NavIconButton icon={PlusSquare} onClick={() => navigate("/add-activity")} />
        <NavIconButton icon={BarChart2} strokeWidth={2} onClick={() => navigate("/history")} />
        <NavIconButton icon={MessageCircle} onClick={() => navigate("/chat")} />
        <NavIconButton icon={SettingsIcon} onClick={() => navigate("/account")} />
      </nav>
    </div>
  );
};

export default Layout;