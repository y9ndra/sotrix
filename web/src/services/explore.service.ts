import api from "./api";
import type { PostsResponse } from "../types/post";
import type { User } from "../types/user.types";

export interface SuggestedUser extends User {
  _id: string;
  name?: string;
  username: string;
  bio?: string;
  followersCount: number;
  isFollowing: boolean;
}

export interface SuggestedUsersResponse {
  success: boolean;
  data: SuggestedUser[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export const getExplorePosts = async (
  cursor?: string,
  limit: number = 10
): Promise<PostsResponse> => {
  const response = await api.get("/explore/posts", {
    params: {
      limit,
      cursor,
    },
  });

  return response.data;
};

export const getSuggestedUsers = async (
  cursor?: string,
  limit: number = 10
): Promise<SuggestedUsersResponse> => {
  const response = await api.get("/explore/users", {
    params: {
      limit,
      cursor,
    },
  });

  return response.data;
};
