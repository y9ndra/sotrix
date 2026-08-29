export interface AuthUser {
  id: string;
  username?: string;
  email?: string;
  name?: string;
  bio?: string;
  profilePicUrl?: string;
  profilePicPublicId?: string;
}

export interface LoginServiceResult {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

export interface SignupServiceResult {
  user: AuthUser;
}
