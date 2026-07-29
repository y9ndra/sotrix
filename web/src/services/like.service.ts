import api from "./api";

export interface ToggleLikeResponse {
  success: boolean;
  liked: boolean;
  likeCount: number;
}

export const toggleLike = async (
  postId: string
): Promise<ToggleLikeResponse> => {
  const response = await api.post(`/posts/${postId}/like`);
  return response.data;
};
