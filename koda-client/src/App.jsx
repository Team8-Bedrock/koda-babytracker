import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React from 'react';
import ParentDashboard from './pages/ParentDashboard';
import AvatarSelection from './pages/avatarSelection';
import Welcome from './pages/welcome';
import Registering from './pages/registering';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ChildRegistration from './pages/childRegistration';
import Activities from './pages/Activities';
import ResetPassword from "./pages/ResetPassword";
import BabySettings from './pages/babySettings';
import Layout from './components/layout';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/registering" element={<Registering />} />
        <Route path="/login" element={<Login />} />
        <Route path="/avatarSelection" element={<AvatarSelection />} />
        <Route path="/childRegistration" element={<ChildRegistration />} />
        <Route path="/add-activity" element={<Activities />} />
        <Route path="/ParentDashboard" element={<Layout><ParentDashboard /></Layout>} />
        <Route path="/babysettings" element={<Layout><BabySettings /></Layout>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Routes>
    </Router>
  );
}

export default App;
