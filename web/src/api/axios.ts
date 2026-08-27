import axios, { AxiosError } from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import {
  getAccessToken,
  setToken,
  removeToken,
} from "../services/token.service";
import { useAuthStore } from "../store/authStore";
import authApi from "./authApi";

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

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

const handleLogout = () => {
  removeToken();
  useAuthStore.getState().clearUser();
  window.location.href = "/login";
};

const refreshAccessToken = async (): Promise<string> => {
  const response = await authApi.post("/auth/refresh", {});
  return response.data.token;
};

export const refreshSession = async (): Promise<string> => {
  return refreshAccessToken();
};

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
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

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => {
          return Promise.reject(err);
        });
    }

    isRefreshing = true;

    return new Promise((resolve, reject) => {
      refreshSession()
        .then((newAccessToken) => {
          setToken(newAccessToken);
          processQueue(null, newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          resolve(api(originalRequest));
        })
        .catch((refreshError) => {
          processQueue(refreshError, null);
          handleLogout();
          reject(refreshError);
        })
        .finally(() => {
          isRefreshing = false;
        });
    });
  }
);

export default api;