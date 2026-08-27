import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";
import { getMe } from "../api/auth.api";
import { removeToken } from "../services/token.service";

const AuthInitializer = () => {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const setInitialized = useAuthStore((state) => state.setInitialized);

  useEffect(() => {
    const initializeAuth = async () => {
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
      } finally {
        setInitialized(true);
      }
    };

    initializeAuth();
  }, [setUser, clearUser, setInitialized]);

  return null;
};

export default AuthInitializer;
