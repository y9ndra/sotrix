import api from "../api/axios";
import type { Post } from "../types/post.types";

export interface FeedResponse {
  success: boolean;

  data: Post[];

  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export const getFeed = async (
  cursor?: string
): Promise<FeedResponse> => {
  const response = await api.get("/feed", {
    params: {
      limit: 10,
      ...(cursor ? { cursor } : {}),
    },
  });

  return response.data;
};

export const getHomeFeed = getFeed;
