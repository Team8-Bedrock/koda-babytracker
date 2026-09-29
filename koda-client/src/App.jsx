import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React from 'react';
import ParentDashboard from './pages/ParentDashboard';
import AvatarSelection from './pages/Onboarding/avatarSelection';
import Welcome from './pages/Onboarding/welcome';
import Registering from './pages/Onboarding/registering';
import Login from './pages/Onboarding/Login';
import ForgotPassword from './pages/Onboarding/ForgotPassword';
import ChildRegistration from './pages/Onboarding/childRegistration';
import Activities from './pages/Activities';
import ResetPassword from "./pages/Onboarding/ResetPassword";
import AccountSettings from './pages/AccountSettings';
import HistoryPage from './pages/HistoryPage';
import AnalyticsPage from './pages/analyticsPage';
import Layout from './components/Layout';
import Caregiver from './pages/Onboarding/Caregiver';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Welcome />} />
        <Route path="/registering" element={<Registering />} />
        <Route path="/login" element={<Login />} />
        <Route path="/avatarSelection" element={<AvatarSelection />} />
        <Route path="/childRegistration" element={<ChildRegistration />} />
        <Route path="/caregiver" element={<Caregiver />} />
        <Route path="/add-activity" element={<Activities />} />
        <Route path="/ParentDashboard" element={<Layout><ParentDashboard /></Layout>} />
        <Route path="/account" element={<AccountSettings />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
      </Routes>
    </Router>
  );
}

export default App;
