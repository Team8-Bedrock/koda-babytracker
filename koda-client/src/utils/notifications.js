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

export const addNotification = ({ id, title, message, path }) => {
  const key = getKey();
  if (!key) return;
  const current = getNotifications();
  if (id && current.some((item) => item.id === id)) return;
  localStorage.setItem(key, JSON.stringify([
    ...current,
    { id: id || `${Date.now()}-${Math.random()}`, title, message, path },
  ]));
  window.dispatchEvent(new Event("koda-notifications-updated"));
};

export const removeNotification = (id) => {
  const key = getKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(getNotifications().filter((item) => item.id !== id)));
  window.dispatchEvent(new Event("koda-notifications-updated"));
};
