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
  CalendarClock,
  UserPlus,
  CloudOff,
  X,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { getCurrentUserId, getSelectedChildForUser, setSelectedChildForUser } from "../utils/authStorage";
import { getPageLabel, getPillFontSize } from "../constants/pageLabels";
import { API_URL } from "../config";
import HabitatBackground from "./HabitatBackground";
import { getAvatarById } from "../constants/avatars";
import NavIconButton from "./NavIconButton";
import MoodBuddy from "./MoodBuddy";
import NightTheme from "./NightTheme";
import Backdrop, { WelcomeBackdrop } from "./backdrop";
import ChildSwitchOverlay, { startChildSwitch } from "./childSwitch";
import TravelOverlay from "./Traveloverlay";
import CaregiverLinkPrompt from "./Caregiverlinkprompt";
import {
  addNotification,
  clearNotifications,
  dismissNotification,
  getDismissedIds,
  getNotifications,
  notificationKind,
  removeNotification,
  timeAgo,
} from "../utils/notifications";

import CharacterHead from "./CharacterHead";
import "../styling/global/layout.css";

const KIND_ICONS = {
  caregiver: UserPlus,
  schedule: CalendarClock,
  chat: MessageCircle,
  offline: CloudOff,
  note: StickyNote,
  general: Sparkles,
};

const NOTE_FRESH_MS = 7 * 24 * 60 * 60 * 1000;

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedChild, setSelectedChild] = useState(() => getSelectedChildForUser());
  const [logoFailed, setLogoFailed] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [childOptions, setChildOptions] = useState([]);
  const [headerLabel, setHeaderLabel] = useState("");
  const [switchKey, setSwitchKey] = useState(0);
  const [notifications, setNotifications] = useState(getNotifications);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [role, setRole] = useState(() => {
    try {
      return sessionStorage.getItem(`koda-role:${getCurrentUserId()}`) || null;
    } catch {
      return null;
    }
  });
  const isCaregiver = role === "caregiver";
  const switcherRef = useRef(null);
  const notificationsRef = useRef(null);
  const isActivityLogPage = location.pathname.toLowerCase() === "/add-activity";
  const isDashboardPage = location.pathname.toLowerCase() === "/parentdashboard";
  const selectedAvatar = getAvatarById(selectedChild?.avatar);

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
    const updateChild = (event) => {
      const child = event.detail?.child;
      if (!child) return;
      setSelectedChild(child);
      setChildOptions((current) => current.map((option) => (
        option._id === child._id ? child : option
      )));
    };
    window.addEventListener("koda-selected-child-updated", updateChild);
    return () => window.removeEventListener("koda-selected-child-updated", updateChild);
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
        const response = await fetch(`${API_URL}/api/chat/${childId}/messages?with=all`, {
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

        const incomingMessages = messages
          .filter((message) => {
            const senderId = message.senderId?._id || message.senderId;
            const isIncoming = String(senderId) !== String(currentUserId);
            return isIncoming && !seenIds.has(message._id);
          });

        const threads = new Map();
        incomingMessages.forEach((message) => {
          const senderId = String(message.senderId?._id || message.senderId);
          const threadKey = message.recipientId ? senderId : "group";
          if (!threads.has(threadKey)) threads.set(threadKey, []);
          threads.get(threadKey).push(message);
        });
        threads.forEach((items, threadKey) => {
          const latestMessage = items[items.length - 1];
          const senderName = latestMessage.senderId?.username || "someone";
          addNotification({
            groupId: `chat:${childId}:${threadKey}`,
            title: threadKey === "group" ? `${senderName} in family chat` : senderName,
            path: "/chat",
            state: { with: threadKey },
            message: `${items.length} new ${items.length === 1 ? "message" : "messages"}`,
            count: items.length,
          });
        });
        incomingMessages.forEach((message) => seenIds.add(message._id));

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
    const token = localStorage.getItem("token");
    const userId = getCurrentUserId();
    if (!token || !userId || role) return;
    fetch(`${API_URL}/api/auth/me`, { headers: { "x-auth-token": token } })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (!user?.role) return;
        try {
          sessionStorage.setItem(`koda-role:${userId}`, user.role);
        } catch {
          return;
        } finally {
          setRole(user.role);
        }
      })
      .catch(() => { });
  }, [role]);

  useEffect(() => {
    if (isCaregiver && location.pathname.toLowerCase() === "/analytics") {
      navigate("/ParentDashboard", { replace: true });
    }
  }, [isCaregiver, location.pathname, navigate]);

  useEffect(() => {
    if (!location.state?.openProfile) return undefined;
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("koda-open-profile"));
    }, 500);
    return () => clearTimeout(timer);
  }, [location.key, location.state]);

  useEffect(() => {
    const childId = selectedChild?._id;
    const token = localStorage.getItem("token");
    const userId = getCurrentUserId();
    if (!isCaregiver || !childId || !token || !userId) return undefined;
    let active = true;
    const seenKey = `notesSeen:${userId}:${childId}`;

    const checkNotes = async () => {
      try {
        const response = await fetch(`${API_URL}/api/child-notes/${childId}`, {
          headers: { "x-auth-token": token },
        });
        if (!response.ok || !active) return;
        const data = await response.json();
        if (data?.isParent) return;
        const notes = Array.isArray(data?.notes) ? data.notes : [];
        let seen = [];
        try {
          const saved = JSON.parse(localStorage.getItem(seenKey) || "[]");
          seen = Array.isArray(saved) ? saved : [];
        } catch {
          seen = [];
        }
        const seenIds = new Set(seen);
        const childName = selectedChild?.name || "your little one";

        notes.forEach((note) => {
          if (seenIds.has(note._id)) return;
          seenIds.add(note._id);
          const stamp = new Date(note.updatedAt || note.createdAt).getTime();
          if (!Number.isFinite(stamp) || Date.now() - stamp > NOTE_FRESH_MS) return;
          const topic = String(note.label || "note").toLowerCase();
          const body = String(note.text || "").trim();
          addNotification({
            id: `note:${note._id}`,
            title: `new note about ${childName}`,
            message: `${topic}: ${body.length > 90 ? `${body.slice(0, 90)}…` : body}`,
            path: "/ParentDashboard",
            state: { openProfile: true },
            notificationType: "note",
          });
        });

        localStorage.setItem(seenKey, JSON.stringify([...seenIds].slice(-300)));
      } catch (error) {
        console.error("Could not check shared notes:", error);
      }
    };

    checkNotes();
    const interval = setInterval(checkNotes, 20000);
    window.addEventListener("focus", checkNotes);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", checkNotes);
    };
  }, [isCaregiver, selectedChild?._id, selectedChild?.name]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = getCurrentUserId();
    if (!token || !userId || isCaregiver) return undefined;
    const skipKey = `koda-not-parent:${userId}`;
    if (sessionStorage.getItem(skipKey)) return undefined;
    let active = true;
    let interval = null;

    const checkRequests = async () => {
      try {
        const response = await fetch(`${API_URL}/api/caregiver-links/requests`, {
          headers: { "x-auth-token": token },
        });
        if (response.status === 403) {
          sessionStorage.setItem(skipKey, "1");
          clearInterval(interval);
          return;
        }
        if (!response.ok || !active) return;
        const data = await response.json();
        const links = Array.isArray(data?.links) ? data.links : [];
        const pendingIds = new Set();
        const dismissed = getDismissedIds();
        const existing = getNotifications();

        links
          .filter((link) => link.status === "pending")
          .forEach((link) => {
            const id = `caregiver-request:${link.id}`;
            pendingIds.add(id);
            if (dismissed.has(id) || existing.some((item) => item.id === id)) return;
            const name = link.caregiver?.username || "someone";
            addNotification({
              id,
              title: "new caregiver request",
              message: `${name} wants to help look after your little one. tap to review.`,
              path: "/account",
              state: { openCategory: "caretaker" },
              notificationType: "caregiver-request",
            });
          });

        existing
          .filter((item) => item.notificationType === "caregiver-request" && !pendingIds.has(item.id))
          .forEach((item) => removeNotification(item.id));
      } catch (error) {
        console.error("Could not check caregiver requests:", error);
      }
    };

    checkRequests();
    interval = setInterval(checkRequests, 20000);
    const onFocus = () => checkRequests();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [isCaregiver]);

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

  const handleNotificationPress = (notification) => {
    const keep = ["schedule-reminder", "caregiver-request", "note"].includes(notification.notificationType);
    if (!keep) {
      setNotifications((current) =>
        current.filter((item) => item.id !== notification.id)
      );
      removeNotification(notification.id);
    }
    if (notification.path) {
      setNotificationsOpen(false);
      navigate(notification.path, notification.state ? { state: notification.state } : undefined);
    }
  };

  const handleDismiss = (event, notification) => {
    event.stopPropagation();
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    dismissNotification(notification);
  };

  const sortedNotifications = [...notifications].sort((a, b) => {
    const rank = (n) => (n.notificationType === "caregiver-request" ? 0 : 1);
    return rank(a) - rank(b) || (b.createdAt || 0) - (a.createdAt || 0);
  });

  return (
    <div className="layout-mobile-frame">
      <NightTheme />
      <ChildSwitchOverlay />
      <TravelOverlay />
      <CaregiverLinkPrompt isCaregiver={isCaregiver} hasChild={Boolean(selectedChild?._id)} />
      {!selectedChild ? (
        <WelcomeBackdrop />
      ) : isDashboardPage ? (
        <>
          <HabitatBackground key={`habitat-${switchKey}`} />
          {selectedChild ? <MoodBuddy key={`buddy-${selectedChild._id}-${switchKey}`} child={selectedChild} /> : null}
        </>
      ) : (
        <Backdrop animal={selectedAvatar?.id || selectedChild?.avatar} />
      )}

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

        <div className="header-notifications" ref={notificationsRef}>
          <NavIconButton
            icon={Bell}
            size={20}
            strokeWidth={1.6}
            onClick={() => setNotificationsOpen((open) => !open)}
            aria-label="Open notifications"
            className="header-bell-btn"
          />
          {notifications.length > 0 && (
            <span className="header-notification-dot" aria-hidden="true">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
          {notificationsOpen && (
            <div className="notifications-menu" role="region" aria-label="Notifications">
              <div className="notifications-menu__head">
                <h2>notifications</h2>
                {notifications.length > 0 && (
                  <button type="button" className="notifications-menu__clear" onClick={clearNotifications}>
                    clear all
                  </button>
                )}
              </div>
              {sortedNotifications.length ? (
                <ul className="notifications-list">
                  {sortedNotifications.map((notification) => {
                    const kind = notificationKind(notification);
                    const Icon = KIND_ICONS[kind] || Sparkles;
                    const when = timeAgo(notification.createdAt);
                    return (
                      <li key={notification.id} className={`notification-item notification-item--${kind}`}>
                        <button
                          type="button"
                          className="notification-item__main"
                          onClick={() => handleNotificationPress(notification)}
                        >
                          <span className="notification-item__icon" aria-hidden="true">
                            <Icon size={17} strokeWidth={2.2} />
                          </span>
                          <span className="notification-item__text">
                            <strong>{notification.title}</strong>
                            <span>{String(notification.message || "").replace(`${notification.title} — `, "")}</span>
                            {(when || kind === "caregiver") && (
                              <span className="notification-item__meta">
                                {kind === "caregiver" && <em>review</em>}
                                {when}
                              </span>
                            )}
                          </span>
                        </button>
                        <button
                          type="button"
                          className="notification-item__dismiss"
                          onClick={(event) => handleDismiss(event, notification)}
                          aria-label={`Dismiss ${notification.title}`}
                        >
                          <X size={14} strokeWidth={2.4} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="notifications-empty">
                  <span className="notifications-empty__icon" aria-hidden="true">
                    <Bell size={20} strokeWidth={2} />
                  </span>
                  <strong>all caught up</strong>
                  <span>we'll ring the bell when something needs you.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </header>


      <React.Fragment key={`page-${switchKey}`}>{children}</React.Fragment>


      <nav className="layout-bottom-nav">
        <NavIconButton icon={Home} onClick={() => navigate("/ParentDashboard")} />
        <NavIconButton icon={PlusSquare} onClick={() => navigate("/add-activity")} />
        {!isCaregiver && (
          <NavIconButton icon={BarChart2} strokeWidth={2} onClick={() => navigate("/analytics")} />
        )}
        <NavIconButton icon={MessageCircle} onClick={() => navigate("/chat")} />
        <NavIconButton icon={SettingsIcon} onClick={() => navigate("/account")} />
      </nav>
    </div>
  );
};

export default Layout;