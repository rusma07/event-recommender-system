import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/Home/Home.jsx";
import Login from "../pages/Login/Login.jsx";
import { Dashboard } from "../pages/Dashboard/EventRecommend.jsx";
import ForgotPassword from "../pages/ForgotPassword/ForgotPassword.jsx";
import AboutUs from "../pages/Aboutus/Aboutus.jsx";
import useAuth from "../hooks/useAuth";
import Register from "../pages/Register/Register.jsx";
import Edit from "../pages/EditProfile/Edit.jsx";
import { ViewEvents } from "../pages/VeiwEvents/ViewEvents.jsx";

const AppRoutes = () => {
  const { user } = useAuth() || {};

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" /> : <Login />}
      />
      <Route path="/signup" element={<Register />} />
      <Route
        path="/dashboard"
        element={
          localStorage.getItem("token") && user ? (
            <Dashboard userId={user.id} />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/event/:eventId"
        element={
          user ? <ViewEvents userId={user.id} /> : <Navigate to="/login" />
        }
      />

      <Route path="/profile" element={<Edit />}></Route>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/aboutus" element={<AboutUs />} />
    </Routes>
  );
};

export default AppRoutes;
