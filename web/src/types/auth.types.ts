import type { User } from "./user.types";

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface SignupRequest {
  name?: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
}

export interface SignupResponse {
  message: string;
  user: User;
}

export interface UserResponse {
  success: boolean;
  user: User;
}

export interface VerifyOtpRequest {
  otp: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  user: User;
}

export interface ResendOtpResponse {
  success: boolean;
  message: string;
  email?: string;
}

export interface ChangeEmailRequest {
  newEmail: string;
  currentPassword: string;
}

export interface ChangeEmailResponse {
  success: boolean;
  message: string;
  email: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

export interface ForgotPasswordRequest {
  identifier: string;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  email?: string;
}

export interface ResetPasswordRequest {
  identifier: string;
  otp: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  success: boolean;
  message: string;
}



