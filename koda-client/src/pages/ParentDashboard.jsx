import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { ClipboardList, User } from "lucide-react";
import "../App.css";
import { getSelectedChildForUser } from "../utils/authStorage";
import { API_URL } from "../config";

function ActivityModel({ model }) {
  const group = useRef();
  const { scene } = useGLTF(model);
useFrame(({ clock }) => {
  const t = clock.getElapsedTime();
  group.current.position.y = Math.sin(t * 2) * 0.06;  // gentle bounce
});


  return (
    <primitive ref={group} object={scene} scale={0.55} position={[0, -0.5, 0]} rotation={[0, -0.1, 0]} />
  );
}
const backgroundStyle = {
  backgroundImage: `url(${process.env.PUBLIC_URL + "/lightmode.jpg"})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  backgroundAttachment: "fixed",
  height: "100vh",
  width: "100vw",
  position: "relative",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  paddingTop: "120px",  
  overflowY: "auto",
  overflowX: "hidden",
};
useGLTF.preload("/bear.glb");
useGLTF.preload("/feeding.glb");
useGLTF.preload("/sleep.glb");

const ParentDashboard = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const childName = getSelectedChildForUser()?.name || "Gracie";
        const actRes = await axios.get(`${API_URL}/api/activities?childName=${encodeURIComponent(childName)}`);

        const { feedings = [], sleeps = [], diapers = [] } = actRes.data;

        const formatTime = (value) => {
          if (!value) return "";
          return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        };

        const latestFeeding = feedings.length > 0 ? {
          type: "feeding",
          value: `${feedings[0].type || "feeding"}${feedings[0].amount ? ` - ${feedings[0].amount} oz` : ""}${feedings[0].side && feedings[0].side !== "N/A" ? ` (${feedings[0].side})` : ""}`,
          time: formatTime(feedings[0].timestamp),
          rawTime: feedings[0].timestamp,
        } : null;

        const latestSleep = sleeps.length > 0 ? {
          type: "sleep",
          value: `${formatTime(sleeps[0].startTime)} - ${formatTime(sleeps[0].endTime)}${sleeps[0].quality ? ` (${sleeps[0].quality})` : ""}`,
          time: "",
          rawTime: sleeps[0].timestamp || sleeps[0].endTime || sleeps[0].startTime,
        } : null;

        const latestDiaper = diapers.length > 0 ? {
          type: "diaper",
          value: diapers[0].type || "diaper change",
          time: formatTime(diapers[0].timestamp),
          rawTime: diapers[0].timestamp,
        } : null;

        const recentActivities = [latestFeeding, latestSleep, latestDiaper]
          .filter(Boolean)
          .sort((a, b) => new Date(b.rawTime) - new Date(a.rawTime));

        setActivities(recentActivities);
        setLoading(false);
      } catch (err) {
        console.error("Link to backend failed:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getActivityModel = () => {
    if (activities.length === 0) return "/bear.glb";
    const latest = activities[0];
    if (latest.type === "feeding") return "/feeding.glb";
    if (latest.type === "sleep") return "/sleep.glb";
    return "/bear.glb";
  };

  return (
    <div className="dashboard-container" style={{
      backgroundImage: `url(${process.env.PUBLIC_URL + "/lightmode.jpg"})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundAttachment: "fixed",
      height: "100vh",
      width: "100vw",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      paddingTop: "120px",
      overflowY: "auto",
      overflowX: "hidden",
    }}>
      <div className="glass-card first-card">
        <div className="card-header">
          <ClipboardList size={24} strokeWidth={2} />
          <span>todays activities</span>
        </div>
        {activities.length > 0 ? (
          <div className="activity-list">
            {activities.map((act, index) => (
              <p key={index} className="empty-msg-light">
                <strong>{act.type}:</strong> {act.value}{act.time ? ` at ${act.time}` : ""}
              </p>
            ))}
          </div>
        ) : (
          <p className="empty-msg-light">No activities yet. Tap the + to get started!</p>
        )}
      </div>

      <div className="glass-card">
        <div className="card-header">
          <User size={24} strokeWidth={2} />
          <span>caregivers</span>
        </div>
        {caregivers.length > 0 ? (
          <div className="caregiver-list">
            {caregivers.map((cg, index) => (
              <p key={index} className="empty-msg-light">{cg.name}</p>
            ))}
          </div>
        ) : (
          <p className="empty-msg-light">No caregivers yet. Add a caregiver to share the load!</p>
        )}
      </div>

      {!loading && (
        <div style={{ width: "280px", height: "280px", position: "absolute", bottom: "30px", left: "-68px" }}>
          <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
            <ambientLight intensity={2.5} />
            <directionalLight position={[5, 5, 5]} intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={0.6} />
            <ActivityModel model={getActivityModel()} />
          </Canvas>

          {activities[0]?.type === "sleep" && (
            <div className="zzz-overlay">
              <span className="zzz z1">Z</span>
              <span className="zzz z2">Z</span>
              <span className="zzz z3">Z</span>
            </div>
          )}

          {activities[0]?.type === "feeding" && (
            <div className="bubbles-overlay">
              <span className="bubble b1" />
              <span className="bubble b2" />
              <span className="bubble b3" />
              <span className="bubble b4" />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;