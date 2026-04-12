import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React from 'react';
import ParentDashboard from './pages/ParentDashboard';
import AvatarSelection from './pages/avatarSelection';
import Welcome from './pages/welcome';
import Registering from './pages/registering';
import Login from './pages/Login';
import ChildRegistration from './pages/childRegistration';
import Activities from './pages/Activities';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/registering" element={<Registering />} />
        <Route path="/login" element={<Login />} />
        <Route path="/avatarSelection" element={<AvatarSelection />} />
        <Route path="/childRegistration" element={<ChildRegistration />} />
        <Route path="/ParentDashboard" element={<ParentDashboard />} />
        <Route path="/add-activity" element={<Activities />} />
      </Routes>
    </Router>
  );
}

export default App;
