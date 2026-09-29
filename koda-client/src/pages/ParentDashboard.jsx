import React, { useEffect, useState } from "react";
import axios from "axios";
import { ClipboardList, Users } from "lucide-react";
import "../styling/pages/parentDashboard.css";
import { getSelectedChildForUser } from "../utils/authStorage";
import { API_URL } from "../config";
import ActivitiesModal from "../components/modals/ActivitiesModal";
import CaregiversModal from "../components/modals/CaregiversModal";
import NavIconButton from "../components/NavIconButton";

const ParentDashboard = () => {
  const [activities, setActivities] = useState([]);
  const [caregivers, setCaregivers] = useState([]);

  const [isActivitiesOpen, setIsActivitiesOpen] = useState(true);
  const [isCaregiversOpen, setIsCaregiversOpen] = useState(true);

  const selectedChild = getSelectedChildForUser();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const childId = selectedChild?._id;
        const token = localStorage.getItem("token");
        if (!childId || !token) {
          setActivities([]);
          return;
        }

        const actRes = await axios.get(`${API_URL}/api/activities`, {
          params: { childId },
          headers: { "x-auth-token": token },
        });

        const { feedings = [], sleeps = [], diapers = [] } = actRes.data;

        const isToday = (value) => {
          if (!value) return false;
          const d = new Date(value);
          const now = new Date();
          return (
            d.getFullYear() === now.getFullYear() &&
            d.getMonth() === now.getMonth() &&
            d.getDate() === now.getDate()
          );
        };

        const formatTime = (value) => {
          if (!value) return "";
          return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        };

        const latestFeeding = feedings.length > 0 && isToday(feedings[0].timestamp) ? {
          type: "feeding",
          value: `${feedings[0].type || "feeding"}${feedings[0].amount ? ` - ${feedings[0].amount} oz` : ""}${feedings[0].side && feedings[0].side !== "N/A" ? ` (${feedings[0].side})` : ""}`,
          time: formatTime(feedings[0].timestamp),
          rawTime: feedings[0].timestamp,
        } : null;

        const latestSleep = sleeps.length > 0 && isToday(sleeps[0].timestamp || sleeps[0].endTime || sleeps[0].startTime) ? {
          type: "sleep",
          value: `${formatTime(sleeps[0].startTime)} - ${formatTime(sleeps[0].endTime)}${sleeps[0].quality ? ` (${sleeps[0].quality})` : ""}`,
          time: "",
          rawTime: sleeps[0].timestamp || sleeps[0].endTime || sleeps[0].startTime,
        } : null;

        const latestDiaper = diapers.length > 0 && isToday(diapers[0].timestamp) ? {
          type: "diaper",
          value: diapers[0].type || "diaper change",
          time: formatTime(diapers[0].timestamp),
          rawTime: diapers[0].timestamp,
        } : null;

        const recentActivities = [latestFeeding, latestSleep, latestDiaper]
          .filter(Boolean)
          .sort((a, b) => new Date(b.rawTime) - new Date(a.rawTime));

        setActivities(recentActivities);
      } catch (err) {
        console.error("Link to backend failed:", err);
      }
    };

    fetchData();
  }, [selectedChild?._id]);

  const addCaregiver = async (email) => {
    if (!selectedChild?._id) {
      return { ok: false, message: "Create or select a child profile first." };
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/children/${selectedChild._id}/caregivers`,
        { email },
        { headers: { "x-auth-token": localStorage.getItem("token") } },
      );
      setCaregivers(response.data.caregiverIds || []);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: error.response?.data?.msg || "Could not link that caregiver." };
    }
  };

  return (
    <div className="dashboard-container">
      <div className="hm-sticker-stack">
        {isActivitiesOpen && (
          <ActivitiesModal
            activities={activities}
            onClose={() => setIsActivitiesOpen(false)}
          />
        )}
        {isCaregiversOpen && (
          <CaregiversModal
            caregivers={caregivers}
            onAddCaregiver={addCaregiver}
            onClose={() => setIsCaregiversOpen(false)}
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
      {!isCaregiversOpen && (
        <NavIconButton
          icon={Users}
          size={20}
          strokeWidth={2}
          onClick={() => setIsCaregiversOpen(true)}
          className="dashboard-corner-btn dashboard-corner-btn--caregivers"
        />
      )}
    </div>
  );
};

export default ParentDashboard;
