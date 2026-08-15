export interface AuthUser {
  id: string;
  username?: string;
  email?: string;
}

export interface LoginServiceResult {
  token: string;
  user: AuthUser;
}

export interface SignupServiceResult {
  user: AuthUser;
}
