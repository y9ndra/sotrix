import api from "./api";
import type { PostsResponse } from "../types/post";

export const getPosts = async (
  cursor?: string
): Promise<PostsResponse> => {
  const response = await api.get("/posts", {
    params: {
      limit: 10,
      cursor,
    },
  });

  return response.data;
};
