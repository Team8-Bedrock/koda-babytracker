import React, { useEffect, useState } from "react";
import axios from "axios";
import { ClipboardList } from "lucide-react";
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

          const date = new Date(value);
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

    window.addEventListener("online", fetchData);
    window.addEventListener("offline", fetchData);
    window.addEventListener("offline-sync-complete", fetchData);

    return () => {
      active = false;
      window.removeEventListener("online", fetchData);
      window.removeEventListener("offline", fetchData);
      window.removeEventListener("offline-sync-complete", fetchData);
    };
  }, [selectedChild?._id, reviewVersion]);

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
    window.addEventListener("close-todays-activities", closeActivities);
    return () => window.removeEventListener("close-todays-activities", closeActivities);
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