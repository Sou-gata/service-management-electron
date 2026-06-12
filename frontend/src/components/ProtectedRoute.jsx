import React from "react";
import { Navigate, Outlet } from "react-router";

/**
 * Route protection wrapper that redirects unauthenticated users to /login.
 */
const ProtectedRoute = () => {
  const token = localStorage.getItem("token");
  
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};

export default ProtectedRoute;
