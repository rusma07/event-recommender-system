import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "../pages/Home/Home.jsx";
import Login from "../pages/Login/Login.jsx";
import { Dashboard } from "../pages/Dashboard/EventRecommend.jsx";
import ForgotPassword from "../pages/ForgotPassword/ForgotPassword.jsx";
import AboutUs from "../pages/Aboutus/Aboutus.jsx";
import useAuth from "../hooks/useAuth";
import Register from "../pages/Register/Register.jsx";
import Edit from "../pages/EditProfile/Edit.jsx";
import { ViewEvents } from "../pages/VeiwEvents/ViewEvents.jsx";
import ResetPassword from "../pages/ResetPassword.jsx";
import TagSelection from "../pages/TagSelection/TagSelection.jsx";
import OnboardingPage from "../components/onboarding/onboardingPage.jsx";

// Protected Route Component - handles authentication and onboarding checks
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth() || {};
  const location = useLocation();

  // Not authenticated - redirect to login
  if (!user || !localStorage.getItem("token")) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user has completed onboarding (using localStorage with user ID)
  const onboardingKey = `onboardingComplete_${user.id}`;
  const hasCompletedOnboarding = localStorage.getItem(onboardingKey) === 'true';

  // User hasn't completed onboarding and trying to access protected pages
  if (!hasCompletedOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // User has completed onboarding but trying to access onboarding page
  if (hasCompletedOnboarding && location.pathname === '/onboarding') {
    return <Navigate to="/event" replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useAuth() || {};

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/aboutus" element={<AboutUs />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Auth Routes - redirect to event if already logged in */}
      <Route
        path="/login"
        element={user ? <Navigate to="/event" /> : <Login />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/event" /> : <Register />}
      />

      {/* Protected Routes - require authentication and onboarding */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/event"
        element={
          <ProtectedRoute>
            <Dashboard userId={user?.id} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/event/:eventId"
        element={
          <ProtectedRoute>
            <ViewEvents userId={user?.id} />
          </ProtectedRoute>
        }
      />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Edit />
          </ProtectedRoute>
        }
      />

      <Route
        path="/tag-selection"
        element={
          <ProtectedRoute>
            <TagSelection />
          </ProtectedRoute>
        }
      />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;