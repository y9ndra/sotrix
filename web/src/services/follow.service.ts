import api from "./api";

export interface ToggleFollowResponse {
  success: boolean;
  following: boolean;
  followersCount: number;
}

export const toggleFollowUser = async (
  userId: string
): Promise<ToggleFollowResponse> => {
  const response = await api.post<ToggleFollowResponse>(`/users/${userId}/follow`);
  return response.data;
};
