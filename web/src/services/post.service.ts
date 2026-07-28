import api from "./api";
import type { PostsResponse, CreatePostResponse } from "../types/post";

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

export const createPost = async (
  content: string
): Promise<CreatePostResponse> => {
  const response = await api.post("/posts", { content });
  return response.data;
};

export const getMyPosts = async (
  cursor?: string
): Promise<PostsResponse> => {
  const response = await api.get("/posts/me", {
    params: {
      limit: 10,
      cursor,
    },
  });

  return response.data;
};

export const updatePost = async (
  postId: string,
  content: string
): Promise<CreatePostResponse> => {
  const response = await api.patch(`/posts/${postId}`, { content });
  return response.data;
};

export const deletePost = async (
  postId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/posts/${postId}`);
  return response.data;
};
