import api from "./axios";
import type { LoginRequest, SignupRequest, LoginResponse, SignupResponse, UserResponse } from "../types/auth.types";

const login = async (data: LoginRequest) => {
  return api.post<LoginResponse>("/auth/login", data);
};

const signup = async (data: SignupRequest) => {
  return api.post<SignupResponse>("/auth/signup", data);
};

const getMe = async () => {
  return api.get<UserResponse>("/auth/me");
};

const getCurrentUser = async () => {
  return api.get<UserResponse>("/auth/me");
};

const logout = async () => {
  return api.post("/auth/logout");
};

export { login, signup, getMe, getCurrentUser, logout };



