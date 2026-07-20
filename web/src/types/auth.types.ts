export interface User {
  username: string;
  email: string;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
}

export interface UserResponse {
  success: boolean;
  user: User;
}
