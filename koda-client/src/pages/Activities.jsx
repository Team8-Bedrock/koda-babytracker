import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ChevronDown, X, Save } from 'lucide-react'; 
import '../App.css';

const Activities = () => {
  const navigate = useNavigate();
  const [type, setType] = useState('feeding');
  const [value, setValue] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
      await axios.post(`${apiUrl}/api/activities`, {
        type,
        value,
        time: new Date().toLocaleTimeString([], { hour: '2-numeric', minute: '2-numeric' })
      });
      navigate('/parentDashboard'); 
    } catch (err) {
      console.error("Error saving activity:", err);
    }
  };

  const backgroundStyle = {
    backgroundImage: `url('/lightmode.jpg')`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    height: '100vh',
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
        <X size={28} className="nav-icon" onClick={() => navigate('/parentDashboard')} />
      </header>

      <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Dropdown Card */}
        <div className="glass-card first-card">
          <div className="card-header">
            <span>activity type</span>
          </div>
          <div className="select-wrapper">
            <select 
              className="custom-select"
              value={type} 
              onChange={(e) => setType(e.target.value)}
            >
              <option value="feeding">🍼 feeding</option>
              <option value="sleep">😴 sleep</option>
              <option value="diaper">🧷 diaper</option>
            </select>
          </div>
        </div>

        {/* Details Input Card */}
        <div className="glass-card">
          <div className="card-header">
            <span>details</span>
          </div>
          <input 
            type="text" 
            className="empty-msg-light activity-input"
            placeholder="e.g. 4oz, Left side, or Wet" 
            value={value} 
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </div>

        {/* Save Button Styled like a Glass Card */}
        <button type="submit" className="glass-card save-btn-card">
          <Save size={24} />
          <span>save entry</span>
        </button>

      </form>

      <img src="/bear-character.png" alt="Koda Bear" className="bear-character" />
    </div>
  );
};

export default Activities;