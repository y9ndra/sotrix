export interface SignupInput {
  username: string;
  email: string;
  password?: string;
}

export interface LoginInput {
  identifier: string;
  password?: string;
}

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
