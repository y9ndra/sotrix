import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { getMe } from "../api/auth.api";
import { setToken, removeToken } from "../services/token.service";
import { refreshSession } from "../api/axios";

const AuthInitializer = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const newAccessToken = await refreshSession();
        setToken(newAccessToken);

        const response = await getMe();
        if (response.data && response.data.user) {
          setUser(response.data.user);
        } else {
          clearUser();
          removeToken();
        }
      } catch (error) {
        clearUser();
        removeToken();
      }
    };

    initializeAuth();
  }, [setUser, clearUser]);

  return null;
};

export default AuthInitializer;
