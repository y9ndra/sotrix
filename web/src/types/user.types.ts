export interface User {
  id?: string;
  _id?: string;
  username: string;
  email: string;
  name?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
