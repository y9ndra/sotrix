import api from "./api";

export interface ToggleFollowResponse {
  success: boolean;
  following: boolean;
  followersCount: number;
  data?: {
    following: boolean;
    followersCount: number;
  };
}

export const toggleFollowUser = async (
  userId: string
): Promise<ToggleFollowResponse> => {
  const response = await api.post<any>(`/users/${userId}/follow`);
  const raw = response.data || {};
  const following =
    typeof raw.following === "boolean"
      ? raw.following
      : typeof raw.data?.following === "boolean"
      ? raw.data.following
      : false;
  const followersCount =
    typeof raw.followersCount === "number"
      ? raw.followersCount
      : typeof raw.data?.followersCount === "number"
      ? raw.data.followersCount
      : 0;

  return {
    ...raw,
    following,
    followersCount,
  };
};

export interface FollowUserItem {
  _id: string;
  name?: string;
  username: string;
  bio?: string;
  profilePicUrl?: string;
  followersCount?: number;
  isFollowing: boolean;
  followedAt?: string;
}

export interface FollowUsersResponse {
  success: boolean;
  data: FollowUserItem[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number;
  };
}

export const getFollowers = async (
  userId: string,
  limit: number = 20,
  cursor?: string,
  q?: string
): Promise<FollowUsersResponse> => {
  const params: Record<string, any> = { limit };
  if (cursor) params.cursor = cursor;
  if (q && q.trim()) params.q = q.trim();
  const response = await api.get<FollowUsersResponse>(`/users/${userId}/followers`, { params });
  return response.data;
};

export const getFollowing = async (
  userId: string,
  limit: number = 20,
  cursor?: string,
  q?: string
): Promise<FollowUsersResponse> => {
  const params: Record<string, any> = { limit };
  if (cursor) params.cursor = cursor;
  if (q && q.trim()) params.q = q.trim();
  const response = await api.get<FollowUsersResponse>(`/users/${userId}/following`, { params });
  return response.data;
};
