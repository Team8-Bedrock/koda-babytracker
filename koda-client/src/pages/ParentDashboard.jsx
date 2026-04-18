import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Bell, ClipboardList, User, Home,
  PlusSquare, BarChart2, MessageCircle, Settings,
  ChevronDown
} from 'lucide-react';
import '../App.css';
import { getSelectedChildForUser } from '../utils/authStorage';

const ParentDashboard = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState(null);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  const settingsMenuRef = useRef(null);

  // 1. Fetch data from Maria's Backend API
  useEffect(() => {
    const savedChild = getSelectedChildForUser();
    if (savedChild) {
      setSelectedChild(savedChild);
    }

    const fetchData = async () => {
      try {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';

        // Fetching activities for now.
        // Caregiver request can be added back once that route is available.
        const childName = getSelectedChildForUser()?.name || "Gracie";
        const actRes = await axios.get(`${apiUrl}/api/activities?childName=${encodeURIComponent(childName)}`);
        console.log("ACTIVITY RESPONSE:", actRes.data);
        // const careRes = await axios.get(`${apiUrl}/api/auth/caregivers`);

        const { feedings = [], sleeps = [], diapers = [] } = actRes.data;

        const formatTime = (value) => {
          if (!value) return '';
          return new Date(value).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          });
        };

        const getDuration = (start, end) => {
          if (!start || !end) return '';
          const diffInMs = new Date(end) - new Date(start);
          const diffInMins = Math.round(diffInMs / 60000);
          const hours = Math.floor(diffInMins / 60);
          const minutes = diffInMins % 60;
          return `${hours > 0 ? `${hours}h ` : ''}${minutes}m`;
        };

        const combinedActivities = [
          ...feedings.map((item) => ({
            type: 'feeding',
            value: `${item.type || 'feeding'}${item.amount ? ` - ${item.amount} oz` : ''}${item.side && item.side !== 'N/A' ? ` (${item.side})` : ''}`,
            time: formatTime(item.timestamp),
            rawTime: item.timestamp,
          })),
          ...sleeps.map((item) => ({
            type: 'sleep',
            value: `${getDuration(item.startTime, item.endTime)}${item.quality ? ` (${item.quality})` : ''}`,
            time: '',
            rawTime: item.timestamp || item.endTime || item.startTime,
          })),
          ...diapers.map((item) => ({
            type: 'diaper',
            value: item.type || 'diaper change',
            time: formatTime(item.timestamp),
            rawTime: item.timestamp,
          })),
        ];

        //to get the latest log activity
        const latestFeeding = feedings.length > 0
          ? {
            type: 'feeding',
            value: `${feedings[0].type || 'feeding'}${feedings[0].amount ? ` - ${feedings[0].amount} oz` : ''}${feedings[0].side && feedings[0].side !== 'N/A' ? ` (${feedings[0].side})` : ''}`,
            time: formatTime(feedings[0].timestamp),
            rawTime: feedings[0].timestamp,
          }
          : null;

        const latestSleep = sleeps.length > 0
          ? {
            type: 'sleep',
            value: `${formatTime(sleeps[0].startTime)} - ${formatTime(sleeps[0].endTime)}${sleeps[0].quality ? ` (${sleeps[0].quality})` : ''}`,
            time: '',
            rawTime: sleeps[0].timestamp || sleeps[0].endTime || sleeps[0].startTime,
          }
          : null;

        const latestDiaper = diapers.length > 0
          ? {
            type: 'diaper',
            value: diapers[0].type || 'diaper change',
            time: formatTime(diapers[0].timestamp),
            rawTime: diapers[0].timestamp,
          }
          : null;

        const recentActivities = [latestFeeding, latestSleep, latestDiaper]
          .filter(Boolean)
          .sort((a, b) => new Date(b.rawTime) - new Date(a.rawTime));

        setActivities(recentActivities);
        // setCaregivers(careRes.data);
        setLoading(false);
      } catch (err) {
        console.error("Link to backend failed:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setIsSettingsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const backgroundStyle = {
    backgroundImage: `url(${process.env.PUBLIC_URL + '/lightmode.jpg'})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundAttachment: 'fixed',
    height: '100vh',
    width: '100vw',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '120px',
    overflowY: 'auto',
    overflowX: 'hidden'
  };

  return (
    <div className="dashboard-container" style={backgroundStyle}>

      {/* FULL-WIDTH GLASS HEADER */}
      <header className="dashboard-header">
        <img src="/koda-logo.png" alt="Koda" className="koda-logo" />

        <button className="name-dropdown-btn" onClick={() => console.log("Open Child Switcher")}>
          {selectedChild?.name || "Gracie"} <ChevronDown size={20} strokeWidth={2.5} />
        </button>

        <Bell size={28} strokeWidth={1.5} className="nav-icon" />
      </header>

      {/* TODAY'S ACTIVITIES CARD */}
      <div className="glass-card first-card">
        <div className="card-header">
          <ClipboardList size={24} strokeWidth={2} />
          <span>todays activities</span>
        </div>

        {activities.length > 0 ? (
          <div className="activity-list">
            {activities.map((act, index) => (
              <p key={index} className="empty-msg-light">
                <strong>{act.type}:</strong> {act.value}{act.time ? ` at ${act.time}` : ''}
              </p>
            ))}
          </div>
        ) : (
          <p className="empty-msg-light">No activities yet. Tap the + to get started!</p>
        )}
      </div>

      {/* CAREGIVERS CARD */}
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

      {/* KODA BEAR */}
      <img
        src="/bear-character.png"
        alt="Koda Bear"
        className="bear-character"
      />

      {/* BOTTOM NAVIGATION */}
      <nav className="bottom-nav">
        <Home size={28} strokeWidth={1.5} className="nav-icon" onClick={() => navigate('/ParentDashboard')} />

        {/* The Add Button - Links to activity logging */}
        <PlusSquare
          size={36}
          strokeWidth={1.5}
          className="nav-icon plus-btn"
          onClick={() => navigate('/add-activity')}
        />

        <BarChart2 size={28} strokeWidth={1.5} className="nav-icon" onClick={() => navigate('/stats')} />
        <MessageCircle size={28} strokeWidth={1.5} className="nav-icon" onClick={() => navigate('/chat')} />
        <div className="settings-menu-wrapper" ref={settingsMenuRef}>
          <button
            type="button"
            className="settings-menu-trigger"
            onClick={() => setIsSettingsMenuOpen((current) => !current)}
            aria-haspopup="menu"
            aria-expanded={isSettingsMenuOpen}
          >
            <Settings size={28} strokeWidth={.5} className="nav-icon" />
          </button>

          {isSettingsMenuOpen && (
            <div className="settings-dropdown" role="menu">
              <button
                type="button"
                className="settings-dropdown-item"
                onClick={() => {
                  setIsSettingsMenuOpen(false);
                  navigate('/settings');
                }}
              >
                Account Settings
              </button>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default ParentDashboard;
