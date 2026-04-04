import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React from 'react';
import ParentDashboard from './components/ParentDashboard';
import AvatarSelection from './pages/avatarSelection';
import Welcome from './pages/welcome';
import Registering from './pages/registering';
import ChildRegistration from './pages/childRegistration';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/registering" element={<Registering />} />
        <Route path="/avatarSelection" element={<AvatarSelection />} />
        <Route path="/childRegistration" element={<ChildRegistration />} />
        <Route path="/parentDashboard" element={<ParentDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
