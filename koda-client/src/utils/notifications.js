import { getCurrentUserId } from "./authStorage";

const getKey = () => {
  const userId = getCurrentUserId();
  return userId ? `notifications:${userId}` : null;
};

export const getNotifications = () => {
  const key = getKey();
  if (!key) return [];
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

export const addNotification = ({
  id,
  groupId,
  title,
  message,
  path,
  state,
  count = 1,
  notificationType,
  childId,
  activityType,
  occursAt,
}) => {
  const key = getKey();
  if (!key) return;
  const current = getNotifications();
  if (id && current.some((item) => item.id === id)) return;
  const groupIndex = groupId
    ? current.findIndex((item) => item.groupId === groupId)
    : -1;
  const next = [...current];

  if (groupIndex >= 0) {
    const existing = next[groupIndex];
    const total = (existing.count || 1) + count;
    next[groupIndex] = {
      ...existing,
      title,
      createdAt: Date.now(),
      message: `${total} new ${total === 1 ? "message" : "messages"}`,
      count: total,
    };
  } else {
    next.push({
      id: id || groupId || `${Date.now()}-${Math.random()}`,
      groupId,
      title,
      message: groupId ? `${title} — ${message}` : message,
      path,
      count,
      createdAt: Date.now(),
      ...(state ? { state } : {}),
      ...(notificationType ? { notificationType } : {}),
      ...(childId ? { childId } : {}),
      ...(activityType ? { activityType } : {}),
      ...(occursAt ? { occursAt } : {}),
    });
  }

  localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new Event("koda-notifications-updated"));
};

export const removeNotification = (id) => {
  const key = getKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(getNotifications().filter((item) => item.id !== id)));
  window.dispatchEvent(new Event("koda-notifications-updated"));
};

export const removeScheduleNotifications = (childId, activityType, loggedAt) => {
  const key = getKey();
  const loggedTime = new Date(loggedAt).getTime();
  if (!key || !Number.isFinite(loggedTime)) return;

  const current = getNotifications();
  const next = current.filter((notification) => (
    notification.notificationType !== "schedule-reminder" ||
    String(notification.childId) !== String(childId) ||
    notification.activityType !== activityType ||
    !Number.isFinite(new Date(notification.occursAt).getTime()) ||
    Math.abs(loggedTime - new Date(notification.occursAt).getTime()) > 15 * 60 * 1000
  ));

  if (next.length === current.length) return;
  localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new Event("koda-notifications-updated"));
};

const dismissedKey = () => {
  const userId = getCurrentUserId();
  return userId ? `notificationsDismissed:${userId}` : null;
};

export const getDismissedIds = () => {
  const key = dismissedKey();
  if (!key) return new Set();
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return new Set(Array.isArray(value) ? value : []);
  } catch {
    return new Set();
  }
};

export const dismissNotification = (notification) => {
  if (!notification) return;
  if (notification.notificationType === "caregiver-request") {
    const key = dismissedKey();
    if (key) {
      const ids = getDismissedIds();
      ids.add(notification.id);
      localStorage.setItem(key, JSON.stringify([...ids].slice(-200)));
    }
  }
  removeNotification(notification.id);
};

export const clearNotifications = () => {
  getNotifications().forEach((notification) => {
    if (notification.notificationType === "caregiver-request") dismissNotification(notification);
  });
  const key = getKey();
  if (!key) return;
  localStorage.setItem(key, "[]");
  window.dispatchEvent(new Event("koda-notifications-updated"));
};

export const notificationKind = (notification) => {
  if (notification?.notificationType === "caregiver-request") return "caregiver";
  if (notification?.notificationType === "schedule-reminder") return "schedule";
  if (notification?.notificationType === "note") return "note";
  if (String(notification?.groupId || "").startsWith("chat:")) return "chat";
  if (/offline|sync|device/i.test(`${notification?.title || ""} ${notification?.message || ""}`)) return "offline";
  return "general";
};

export const timeAgo = (value) => {
  const time = Number(value);
  if (!Number.isFinite(time) || time <= 0) return "";
  const minutes = Math.floor((Date.now() - time) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days}d ago`;
};