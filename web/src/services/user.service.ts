import api from "./api";
import type { SuggestedUser } from "./explore.service";

export interface SearchUsersResponse {
  success: boolean;
  data: SuggestedUser[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export const searchUsers = async (
  query: string,
  cursor?: string
): Promise<SearchUsersResponse> => {
  const response = await api.get("/users/search", {
    params: {
      q: query,
      limit: 10,
      cursor,
    },
  });
  return response.data;
};
