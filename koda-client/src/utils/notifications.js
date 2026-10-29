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
