import api from "./api";
import type { PostsResponse } from "../types/post";

export const getHomeFeed = async (
  cursor?: string,
  limit: number = 10
): Promise<PostsResponse> => {
  const response = await api.get("/feed", {
    params: {
      limit,
      cursor,
    },
  });

  return response.data;
};
