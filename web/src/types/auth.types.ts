import type { User } from "./user.types";

export type { User };

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface SignupRequest {
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



