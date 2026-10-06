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
  const user = useAuthStore((state) => state.user);

  if (!isInitialized) {
    return <RubiksLoader fullscreen text="INITIALIZING SOTRIX" size="md" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !user.isEmailVerified && !user.isDemo) {
    return <Navigate to="/verify-email" replace />;
  }

  return children;
};

export default ProtectedRoute;

