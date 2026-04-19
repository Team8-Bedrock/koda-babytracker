import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, X, Save } from 'lucide-react';
import '../App.css';
import { getSelectedChildForUser } from '../utils/authStorage';

const Activities = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [type, setType] = useState('');
  const [value, setValue] = useState('');
  const [feedingAmount, setFeedingAmount] = useState('');
  const [feedingType, setFeedingType] = useState('');
  const [feedingSide, setFeedingSide] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [quality, setQuality] = useState('');
  const [diaperType, setDiaperType] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const API_URL = process.env.REACT_APP_API_URL || "https://koda-babytracker.onrender.com";
      const childName = getSelectedChildForUser()?.name || "Gracie";
      console.log("SELECTED CHILD:", childName);

      if (type === 'sleep') {
        console.log("SENDING SLEEP:", { childName, startTime, endTime, quality });
        const today = new Date().toISOString().split('T')[0];

        const sleepStart = new Date(`${today}T${startTime}`);
        const sleepEnd = new Date(`${today}T${endTime}`);

        const duration = Math.round((sleepEnd - sleepStart) / (1000 * 60));

        await axios.post(`${API_URL}/api/sleep`, {
          childName,
          startTime: sleepStart,
          endTime: sleepEnd,
          duration,
          quality,
          timestamp: new Date(),
        });
      } else if (type === 'feeding') {
        await axios.post(`${API_URL}/api/feeding`, {
          childName,
          type: feedingType,
          amount: feedingAmount ? Number(feedingAmount) : undefined,
          side: feedingSide || 'N/A',
          timestamp: new Date(),
        });

      } else if (type === 'diaper') {
        await axios.post(`${API_URL}/api/diaper`, {
          childName,
          type: diaperType,
          timestamp: new Date(),
        });
      }

      navigate('/ParentDashboard');
    } catch (err) {
      console.error("Error saving activity:", err);
    }
  };

  const backgroundStyle = {
    backgroundImage: `url('/lightmode.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    minHeight: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '80px'
  };

  return (
    <div className="dashboard-container" style={backgroundStyle}>

      {/* Header with Close Button */}
      <header className="dashboard-header">
        <img src="/koda-logo.png" alt="Koda" className="koda-logo" />
        <h2 style={{ fontFamily: 'Londrina Solid', fontSize: '28px', margin: 0 }}>log activity</h2>
        <X
          size={28}
          className="nav-icon"
          onClick={() => {
            if (step === 2) {
              setStep(1);
              setType('');
            } else {
              navigate('/parentDashboard');
            }
          }}
        />
      </header>

      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Dropdown Card */}
        {step === 1 && (
          <div className="glass-card first-card">
            <div className="card-header">
              <span>activity log</span>
            </div>

            <button
              type="button"
              className="activity-menu-btn"
              onClick={() => {
                setType('feeding');
                setStep(2);
              }}
            >
              feeding
            </button>

            <button
              type="button"
              className="activity-menu-btn"
              onClick={() => {
                setType('sleep');
                setStep(2);
              }}
            >
              sleeping
            </button>

            <button
              type="button"
              className="activity-menu-btn"
              onClick={() => {
                setType('diaper');
                setStep(2);
              }}
            >
              diaper change
            </button>

            <button
              type="button"
              className="activity-menu-btn"
              onClick={() => {
                setType('playtime');
                setStep(2);
              }}
            >
              playtime
            </button>

            <button
              type="button"
              className="activity-menu-btn"
              onClick={() => {
                setType('mood');
                setStep(2);
              }}
            >
              mood
            </button>
          </div>
        )}

        {step === 2 && (
          <>
            {/* Details Input Card */}

            <div className="glass-card" style={{ marginTop: '24px' }}>
              <div className="card-header">
                <span>details</span>
              </div>

              {type === 'sleep' ? (
                // sleep fields
                <div className="sleep-form-container">
                  <div className="sleep-field-group">
                    <label className="sleep-label">start time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="sleep-input"
                      required
                    />
                  </div>

                  <div className="sleep-field-group">
                    <label className="sleep-label">end time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="sleep-input"
                      required
                    />
                  </div>

                  <div className="sleep-field-group">
                    <label className="sleep-label">quality</label>
                    <select
                      value={quality}
                      onChange={(e) => setQuality(e.target.value)}
                      className="sleep-input"
                      required
                    >
                      <option value="">Select Sleep Quality</option>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Poor">Poor</option>
                    </select>
                  </div>
                </div>

              ) : type === 'feeding' ? (
                //feeding fields
                <div className="sleep-form-container">
                  <div className="sleep-field-group">
                    <label className="sleep-label">feeding type</label>
                    <select
                      value={feedingType}
                      onChange={(e) => setFeedingType(e.target.value)}
                      className="sleep-input"
                      required
                    >
                      <option value="">Select Feeding Type</option>
                      <option value="Breast">Breast</option>
                      <option value="Bottle">Bottle</option>
                      <option value="Solids">Solids</option>
                    </select>
                  </div>

                  <div className="sleep-field-group">
                    <label className="sleep-label">amount</label>
                    <input
                      type="number"
                      value={feedingAmount}
                      onChange={(e) => setFeedingAmount(e.target.value)}
                      className="sleep-input"
                      placeholder="e.g. 4"
                    />
                  </div>

                  <div className="sleep-field-group">
                    <label className="sleep-label">side</label>
                    <select
                      value={feedingSide}
                      onChange={(e) => setFeedingSide(e.target.value)}
                      className="sleep-input"
                      required
                    >
                      <option value="">Select Side</option>
                      <option value="Left">Left</option>
                      <option value="Right">Right</option>
                      <option value="N/A">N/A</option>
                    </select>
                  </div>
                </div>
              ) : type === 'diaper' ? (
                //diaper fields
                <div className="sleep-form-container">
                  <div className="sleep-field-group">
                    <label className="sleep-label">diaper type</label>
                    <select
                      value={diaperType}
                      onChange={(e) => setDiaperType(e.target.value)}
                      className="sleep-input"
                      required
                    >
                      <option value="">Select Diaper Type</option>
                      <option value="Wet">Wet</option>
                      <option value="Dirty">Dirty</option>
                      <option value="Mixed">Mixed</option>
                    </select>
                  </div>
                </div>
              ) : (
                <input
                  type="text"
                  className="empty-msg-light activity-input"
                  placeholder="Enter details"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                />
              )}
            </div>

            {/* Save Button Styled like a Glass Card */}
            <button type="submit" className="glass-card save-btn-card">
              <Save size={24} />
              <span>save entry</span>
            </button>
          </>
        )}

      </form>
      {type !== 'sleep' && type !== 'feeding' && type !== 'diaper' && (
        <img src="/bear-character.png" alt="Koda Bear" className="bear-character" />
      )}
    </div>
  );
};

export default Activities;