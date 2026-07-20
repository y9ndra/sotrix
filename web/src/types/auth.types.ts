export interface User {
  username: string;
  email: string;
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
