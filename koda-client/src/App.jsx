import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import React, { lazy, Suspense } from "react";

const ParentDashboard = lazy(() => import("./pages/ParentDashboard"));
const AvatarSelection = lazy(() => import("./pages/Onboarding/avatarSelection"));
const Welcome = lazy(() => import("./pages/Onboarding/welcome"));
const Registering = lazy(() => import("./pages/Onboarding/registering"));
const Login = lazy(() => import("./pages/Onboarding/Login"));
const ForgotPassword = lazy(() => import("./pages/Onboarding/ForgotPassword"));
const ChildRegistration = lazy(() => import("./pages/Onboarding/childRegistration"));
const Activities = lazy(() => import("./pages/Activities"));
const ResetPassword = lazy(() => import("./pages/Onboarding/ResetPassword"));
const AccountSettings = lazy(() => import("./pages/AccountSettings"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const AnalyticsPage = lazy(() => import("./pages/analyticsPage"));
const FullLogPage = lazy(() => import("./pages/FullLogPage"));
const Chat = lazy(() => import("./pages/Chat"));
const Layout = lazy(() => import("./components/Layout"));

function App() {
  return (
    <Router>
      <Suspense
        fallback={
          <div role="status" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
            Loading…
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/registering" element={<Registering />} />
          <Route path="/login" element={<Login />} />
          <Route path="/avatarSelection" element={<AvatarSelection />} />
          <Route path="/childRegistration" element={<ChildRegistration />} />
          <Route path="/add-activity" element={<Activities />} />
          <Route path="/ParentDashboard" element={<Layout><ParentDashboard /></Layout>} />
          <Route path="/account" element={<AccountSettings />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/full-log" element={<FullLogPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/chat" element={<Layout><Chat /></Layout>} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
