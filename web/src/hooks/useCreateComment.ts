import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createComment } from "../services/comment.service";
import { queryKeys } from "../lib/queryKeys";
import { updatePostInAllInfiniteCaches } from "../lib/queryCache";
import type { Post } from "../types/post.types";

export interface CreateCommentParams {
  postId: string;
  content: string;
}

export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content }: CreateCommentParams) =>
      createComment(postId, content),

    onSuccess: (_newComment, variables) => {
      // 1. Invalidate comments cache for this specific post
      queryClient.invalidateQueries({
        queryKey: queryKeys.comments.byPost(variables.postId),
      });

      // 2. Increment comment count across infinite post caches
      updatePostInAllInfiniteCaches(queryClient, variables.postId, (oldPost: Post) => ({
        ...oldPost,
        commentCount: (oldPost.commentCount ?? 0) + 1,
      }));

      // 3. Invalidate feed and post queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.feed,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.all,
      });
    },
  });
};
