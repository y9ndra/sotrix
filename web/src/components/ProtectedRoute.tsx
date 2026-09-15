import { Navigate } from "react-router-dom";
import React from "react";
import { useAuthStore } from "../store/authStore";
import RubiksLoader from "./RubiksLoader";

interface ProtectedRouteProps {
  children: React.ReactElement;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isInitialized) {
    return <RubiksLoader fullscreen text="INITIALIZING SOTRIX" size="md" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

