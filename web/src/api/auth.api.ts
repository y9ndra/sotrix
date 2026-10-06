import api from "./axios";
import type {
  LoginRequest,
  SignupRequest,
  LoginResponse,
  SignupResponse,
  UserResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  ResendOtpResponse,
  ChangeEmailRequest,
  ChangeEmailResponse,
} from "../types/auth.types";

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

const verifyEmailOtp = async (data: VerifyOtpRequest) => {
  return api.post<VerifyOtpResponse>("/auth/verify-email", data);
};

const resendVerificationOtp = async () => {
  return api.post<ResendOtpResponse>("/auth/resend-otp");
};

const changeEmail = async (data: ChangeEmailRequest) => {
  return api.post<ChangeEmailResponse>("/auth/change-email", data);
};

export {
  login,
  signup,
  getMe,
  getCurrentUser,
  logout,
  verifyEmailOtp,
  resendVerificationOtp,
  changeEmail,
};




