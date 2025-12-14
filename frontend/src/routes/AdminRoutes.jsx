import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const AdminRoute = ({ children }) => {
  const { user } = useAuth() || {};
  const location = useLocation();

  if (!user || !localStorage.getItem("token")) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (user.role !== "admin") {
    return <Navigate to="/event" replace />;
  }
  return children;
};

export default AdminRoute;
