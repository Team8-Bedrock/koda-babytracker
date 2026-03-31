import React, { useState } from 'react';
import { 
  Bell, ClipboardList, User, Home, 
  PlusSquare, BarChart2, MessageCircle, Settings,
  ChevronDown 
} from 'lucide-react'; 
import '../App.css';

const ParentDashboard = () => {
  //placeholder for now, basically empty
  const [activities] = useState([]); 
  //^ same thing here
  const [caregivers] = useState([]);

  return (
    <div className="dashboard-container" style={{ backgroundImage: `url('/lightmode.jpg')` }}>
      
      <header className="dashboard-header">
        <img src="/koda-logo.png" alt="Koda" className="koda-logo" />
        
        {/* Child Name Dropdown Button */}
        <button className="name-dropdown-btn">
          Gracie <ChevronDown size={20} strokeWidth={2.5} />
        </button>

        <Bell size={28} strokeWidth={1.5} className="nav-icon" />
      </header>

      <div className="glass-card first-card">
        <div className="card-header">
          <ClipboardList size={24} strokeWidth={2} />
          <span>todays activities</span>
        </div>

        <p className="empty-msg-light">No activities yet. Tap the + to get started!</p>
      </div>

      <div className="glass-card">
        <div className="card-header">
          <User size={24} strokeWidth={2} />
          <span>caregivers</span>
        </div>
        
        <p className="empty-msg-light">No caregivers yet. Add a caregiver to share the load!</p>
      </div>

      <img src="/bear-character.png" alt="Koda Bear" className="bear-character" />

      <nav className="bottom-nav">
        <Home size={28} strokeWidth={1.5} className="nav-icon" />
        <PlusSquare size={36} strokeWidth={1.5} className="nav-icon plus-btn" />
        <BarChart2 size={28} strokeWidth={1.5} className="nav-icon" />
        <MessageCircle size={28} strokeWidth={1.5} className="nav-icon" />
        <Settings size={28} strokeWidth={1.5} className="nav-icon" />
      </nav>
    </div>
  );
};

export default ParentDashboard;