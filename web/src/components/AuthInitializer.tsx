import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { getMe } from "../api/auth.api";
import { getToken, removeToken } from "../services/token.service";

const AuthInitializer = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getToken();

      if (!token) {
        clearUser();
        return;
      }

      try {
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
