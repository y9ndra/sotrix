import api from "./api";
import type { PostsResponse, CreatePostResponse, Post } from "../types/post";

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
  content: string,
  image?: File | null
): Promise<CreatePostResponse> => {
  const formData = new FormData();
  formData.append("content", content);
  if (image) {
    formData.append("image", image);
  }
  const response = await api.post("/posts", formData);
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

export const getUserPosts = async (
  userId: string,
  cursor?: string
): Promise<PostsResponse> => {
  const response = await api.get(`/posts/user/${userId}`, {
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

export interface SearchPostsResponse {
  success: boolean;
  data: Post[];
}

export const searchPosts = async (query: string): Promise<SearchPostsResponse> => {
  const response = await api.get("/posts/search", {
    params: {
      q: query,
    },
  });
  return response.data;
};
