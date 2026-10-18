import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ClipboardList, TriangleAlert, Bell } from "lucide-react";
import "../styling/pages/parentDashboard.css";
import { getSelectedChildForUser, getCurrentUserId } from "../utils/authStorage";
import { API_URL } from "../config";
import ActivitiesModal from "../components/modals/ActivitiesModal";
import NavIconButton from "../components/NavIconButton";
import OfflineDuplicateReview from "../components/OfflineDuplicateReview";
import { getQueuedActivities } from "../utils/offlineStorage";

const ParentDashboard = () => {
  const [activities, setActivities] = useState([]);

  const [reviewVersion, setReviewVersion] = useState(0);

  const [isActivitiesOpen, setIsActivitiesOpen] = useState(true);
  const [anomalyAlerts, setAnomalyAlerts] = useState([]);
  const [scheduleReminders, setScheduleReminders] = useState([]);
  const shownReminderKeys = useRef(new Set());

  const selectedChild = getSelectedChildForUser();

  const [offlineSaveNotice, setOfflineSaveNotice] = useState(() => {
    try {
      const savedNotice = sessionStorage.getItem('showOfflineSaveNotice');
      const notice = savedNotice ? JSON.parse(savedNotice) : null;
      return notice?.title ? notice : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let active = true;
    let requestNumber = 0;

    const fetchData = async () => {
      const currentRequest = ++requestNumber;
      const childId = selectedChild?._id;
      const token = localStorage.getItem("token");
      const userId = getCurrentUserId();

      if (!childId || !token || !userId) {
        if (active) setActivities([]);
        return;
      }

      let serverData = {
        feedings: [],
        sleeps: [],
        diapers: [],
      };

      if (navigator.onLine) {
        try {
          const response = await axios.get(`${API_URL}/api/activities`, {
            params: { childId },
            headers: { "x-auth-token": token },
            timeout: 10000,
          });

          serverData = response.data;
          setAnomalyAlerts(response.data.anomalyAlerts || []);
        } catch (err) {
          console.error("Could not load online activities:", err);
        }
      }

      try {
        const queue = await getQueuedActivities();

        const pendingEntries = queue
          .filter((entry) => {
            const entryChildId = entry.data?.childId || entry.data?.babyId;
            const entryUserId = entry.data?.loggedBy || entry.data?.userId;

            return (
              !entry.isSynced &&
              String(entryChildId) === String(childId) &&
              String(entryUserId) === String(userId)
            );
          })
          .map((entry) => ({
            ...entry.data,
            activityType: entry.type,
            timestamp: entry.timestamp,
            pendingSync: true,
          }));

        const allEntries = [
          ...(serverData.feedings || []).map((entry) => ({
            ...entry,
            activityType: "feeding",
          })),
          ...(serverData.sleeps || []).map((entry) => ({
            ...entry,
            activityType: "sleep",
          })),
          ...(serverData.diapers || []).map((entry) => ({
            ...entry,
            activityType: "diaper",
          })),
          ...pendingEntries,
        ];

        const getEntryTime = (entry) =>
          entry.timestamp || entry.endTime || entry.startTime;

        const isToday = (value) => {
          if (!value) return false;

          const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value)) ? new Date(`${value}T00:00`) : new Date(value);
          if (Number.isNaN(date.getTime())) return false;
          const now = new Date();

          return (
            date.getFullYear() === now.getFullYear() &&
            date.getMonth() === now.getMonth() &&
            date.getDate() === now.getDate()
          );
        };

        const formatTime = (value) =>
          value
            ? new Date(value).toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })
            : "";

        const todaysEntries = allEntries
          .filter((entry) => isToday(getEntryTime(entry)))
          .sort(
            (a, b) =>
              new Date(getEntryTime(b)) - new Date(getEntryTime(a))
          );

        const recentActivities = ["feeding", "sleep", "diaper"]
          .map((activityType) => {
            const entry = todaysEntries.find(
              (item) => item.activityType === activityType
            );

            if (!entry) return null;

            let value = "";

            if (activityType === "feeding") {
              value = `${entry.type || "feeding"}${entry.amount ? ` - ${entry.amount} oz` : ""
                }${entry.side && entry.side !== "N/A"
                  ? ` (${entry.side})`
                  : ""
                }`;
            } else if (activityType === "sleep") {
              value = `${formatTime(entry.startTime)} - ${formatTime(
                entry.endTime
              )}${entry.quality ? ` (${entry.quality})` : ""}`;
            } else {
              value = entry.type || "diaper change";
            }

            if (entry.pendingSync) {
              value += " — Pending sync";
            }

            return {
              type: activityType,
              value,
              time:
                activityType === "sleep"
                  ? ""
                  : formatTime(getEntryTime(entry)),
              rawTime: getEntryTime(entry),
            };
          })
          .filter(Boolean)
          .sort((a, b) => new Date(b.rawTime) - new Date(a.rawTime));

        if (
          active &&
          currentRequest === requestNumber &&
          getCurrentUserId() === userId
        ) {
          setActivities(recentActivities);
        }
      } catch (err) {
        console.error("Could not load saved activities:", err);
      }
    };

    fetchData();

    let midnightTimer;
    const scheduleMidnight = () => {
      const next = new Date();
      next.setHours(24, 0, 5, 0);
      midnightTimer = setTimeout(() => {
        fetchData();
        scheduleMidnight();
      }, next.getTime() - Date.now());
    };
    scheduleMidnight();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchData();
    };

    window.addEventListener("online", fetchData);
    window.addEventListener("offline", fetchData);
    window.addEventListener("offline-sync-complete", fetchData);
    window.addEventListener("activity-saved", fetchData);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      active = false;
      clearTimeout(midnightTimer);
      window.removeEventListener("online", fetchData);
      window.removeEventListener("offline", fetchData);
      window.removeEventListener("offline-sync-complete", fetchData);
      window.removeEventListener("activity-saved", fetchData);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [selectedChild?._id, reviewVersion]);

  useEffect(() => {
    let active = true;
    let reminderTimer;
    const fetchReminders = async () => {
      const childId = selectedChild?._id;
      const token = localStorage.getItem("token");
      if (!childId || !token || !navigator.onLine) {
        if (active) setScheduleReminders([]);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/schedule/reminders`, {
          params: {
            childId,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          headers: { "x-auth-token": token },
          timeout: 10000,
        });
        if (!active) return;

        const newReminders = (response.data.reminders || []).filter((reminder) => {
          const key = `${reminder.activityType}-${reminder.occursAt}`;
          if (shownReminderKeys.current.has(key)) return false;
          shownReminderKeys.current.add(key);
          return true;
        });

        if (newReminders.length > 0) {
          setScheduleReminders(newReminders);
          window.clearTimeout(reminderTimer);
          reminderTimer = window.setTimeout(() => {
            if (active) setScheduleReminders([]);
          }, 8000);
        }
      } catch (err) {
        console.error("Could not load schedule reminders:", err);
      }
    };

    fetchReminders();
    const interval = window.setInterval(fetchReminders, 60000);
    window.addEventListener("online", fetchReminders);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.clearTimeout(reminderTimer);
      window.removeEventListener("online", fetchReminders);
    };
  }, [selectedChild?._id]);

  useEffect(() => {
    sessionStorage.removeItem('showOfflineSaveNotice');

    if (!offlineSaveNotice) return;

    const timer = setTimeout(() => {
      setOfflineSaveNotice(null);
    }, 8000);

    return () => clearTimeout(timer);
  }, [offlineSaveNotice]);

  useEffect(() => {
    const closeActivities = () => setIsActivitiesOpen(false);
    const afterSwitch = () => {
      setIsActivitiesOpen(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setIsActivitiesOpen(true)));
      setReviewVersion((v) => v + 1);
    };
    window.addEventListener("close-todays-activities", closeActivities);
    window.addEventListener("koda-child-switched", afterSwitch);
    return () => {
      window.removeEventListener("close-todays-activities", closeActivities);
      window.removeEventListener("koda-child-switched", afterSwitch);
    };
  }, []);

  return (
    <div className="dashboard-container">
      {offlineSaveNotice && (
        <div className="offline-save-notice" role="status">
          <div>
            <strong>{offlineSaveNotice.title}</strong>
            <p>{offlineSaveNotice.message}</p>
          </div>

          <button
            type="button"
            onClick={() => setOfflineSaveNotice(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <div className="hm-sticker-stack">
        {isActivitiesOpen && (
          <ActivitiesModal
            activities={activities}
            onClose={() => setIsActivitiesOpen(false)}
          />
        )}
        {(scheduleReminders.length > 0 || anomalyAlerts.length > 0) && (
          <div className="dashboard-notice-stack" aria-live="polite">
            {scheduleReminders.map((reminder, index) => (
              <div className="dashboard-reminder" role="status" key={`${reminder.activityType}-${reminder.occursAt}-${index}`}>
                <Bell size={17} aria-hidden="true" />
                <span>
                  <strong>Coming up:</strong> {reminder.activityType === "sleep" ? "sleep" : "feeding"} at{" "}
                  {new Date(reminder.occursAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  {" "}— within 30 minutes
                </span>
              </div>
            ))}
            {anomalyAlerts.length > 0 && (
              <div className="dashboard-anomaly" role="status">
                <div className="dashboard-anomaly-heading">
                  <TriangleAlert size={17} aria-hidden="true" />
                  <strong>AI routine check</strong>
                </div>
                {anomalyAlerts.map((alert) => (
                  <p key={alert.id}>
                    {alert.activityType === "sleep" ? "Sleep" : "Feeding"} log: {alert.message}.
                  </p>
                ))}
                <small>Pattern estimates only; not medical advice.</small>
              </div>
            )}
          </div>
        )}
      </div>

      {!isActivitiesOpen && (
        <NavIconButton
          icon={ClipboardList}
          size={20}
          strokeWidth={2}
          onClick={() => setIsActivitiesOpen(true)}
          className="dashboard-corner-btn dashboard-corner-btn--activities"
        />
      )}

      <OfflineDuplicateReview
        onReviewed={() => setReviewVersion((current) => current + 1)}
      />

    </div>
  );
};

export default ParentDashboard;