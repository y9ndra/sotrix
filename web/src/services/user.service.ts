import api from "./api";
import type { SuggestedUser } from "./explore.service";

export interface SearchUsersResponse {
  success: boolean;
  data: SuggestedUser[];
}

export const searchUsers = async (query: string): Promise<SearchUsersResponse> => {
  const response = await api.get("/users/search", {
    params: {
      q: query,
    },
  });
  return response.data;
};
