import api from "./api";
import type { CommentsResponse, CreateCommentResponse } from "../types/comment";

export const getCommentsForPost = async (
  postId: string,
  cursor?: string
): Promise<CommentsResponse> => {
  const response = await api.get(`/posts/${postId}/comments`, {
    params: {
      limit: 10,
      cursor,
    },
  });
  return response.data;
};

export const getComments = getCommentsForPost;

export const createComment = async (
  postId: string,
  content: string
): Promise<CreateCommentResponse> => {
  const response = await api.post(`/posts/${postId}/comments`, { content });
  return response.data;
};

export const updateComment = async (
  commentId: string,
  content: string
): Promise<CreateCommentResponse> => {
  const response = await api.patch(`/comments/${commentId}`, { content });
  return response.data;
};

export const deleteComment = async (
  commentId: string
): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/comments/${commentId}`);
  return response.data;
};
