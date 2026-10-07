import React from "react";
import { useNavigate } from "react-router-dom";
import { ClipboardList } from "lucide-react";
import HabitatModal from "./HabitatModal";

const rowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  fontFamily: "inherit",
};

const labelStyle = {
  fontFamily: "inherit",
  fontWeight: 700,
  textTransform: "capitalize",
  whiteSpace: "nowrap",
};

const valueStyle = {
  fontFamily: "inherit",
  fontWeight: 400,
  opacity: 0.8,
  fontSize: "0.85em",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const timeStyle = {
  fontFamily: "inherit",
  fontWeight: 700,
  fontSize: "0.85em",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const splitSleep = (value) => {
  const match = /^(.*?)\s*\((.*)\)\s*$/.exec(value || "");
  return match ? { time: match[1], detail: match[2] } : { time: value, detail: "" };
};

const ActivitiesModal = ({ activities, onClose }) => {
  const navigate = useNavigate();

  return (
    <HabitatModal title="todays activities" icon={ClipboardList} onClose={onClose} className="hm-todays-activities">
      {activities.length > 0 ? (
        activities.map((act, index) => {
          const isSleep = act.type === "sleep";
          const sleep = isSleep ? splitSleep(act.value) : null;
          const detail = isSleep ? sleep.detail : act.value;
          const time = isSleep ? sleep.time : act.time;
          return (
            <div key={index} className="hm-list-item" style={rowStyle}>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span style={labelStyle}>{act.type}</span>
                {detail ? <span style={valueStyle}>{detail}</span> : null}
              </div>
              {time ? <span style={timeStyle}>{time}</span> : null}
            </div>
          );
        })
      ) : (
        <p className="hm-empty">No activities yet. Tap the + to get started!</p>
      )}

      <button type="button" className="hm-link-btn" onClick={() => navigate("/history")}>
        view full log →
      </button>
    </HabitatModal>
  );
};

export default ActivitiesModal;