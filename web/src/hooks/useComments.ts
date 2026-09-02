import { useQuery } from "@tanstack/react-query";
import { getComments } from "../services/comment.service";
import { queryKeys } from "../lib/queryKeys";

export const useComments = (postId: string) => {
  return useQuery({
    queryKey: queryKeys.comments.byPost(postId),
    queryFn: () => getComments(postId),
    enabled: Boolean(postId),
  });
};
