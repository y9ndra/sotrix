import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import {
  getToken,
  setToken,
  removeToken,
} from "../services/token.service";
import { useAuthStore } from "../store/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

interface RetryRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

let refreshPromise: Promise<string> | null = null;

const handleLogout = () => {
  removeToken();
  useAuthStore.getState().clearUser();
  window.location.href = "/login";
};

const refreshAccessToken = async (): Promise<string> => {
  const response = await axios.post(
    `${API_BASE_URL}/auth/refresh`,
    {},
    {
      withCredentials: true,
    }
  );

  return response.data.token;
};

export const refreshSession = async (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken();
  }
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
};

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryRequestConfig;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401) {
      return Promise.reject(error);
    }

    /*
      Don't refresh login/signup/etc.
    */
    const requestUrl = originalRequest.url;
    if (
      requestUrl?.includes("/auth/login") ||
      requestUrl?.includes("/auth/signup") ||
      requestUrl?.includes("/auth/refresh")
    ) {
      return Promise.reject(error);
    }

    /*
      Prevent infinite retry loops.
    */
    if (originalRequest._retry) {
      handleLogout();
      return Promise.reject(error);
    }

    /*
      No access token means this probably isn't
      an expired authenticated request.
    */
    const currentToken = getToken();
    if (!currentToken) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshSession();

      setToken(newAccessToken);

      return api(originalRequest);
    } catch (refreshError) {
      handleLogout();
      return Promise.reject(refreshError);
    }
  }
);

export default api;