import {
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { toggleLike } from "../services/like.service";
import { queryKeys } from "../lib/queryKeys";
import { updatePostInAllInfiniteCaches } from "../lib/queryCache";
import type { PostsResponse, Post } from "../types/post.types";

export interface LikePostParams {
  postId: string;
  isLiked?: boolean;
}

export const useLikePost = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: string | LikePostParams) => {
      const postId = typeof params === "string" ? params : params.postId;
      return toggleLike(postId);
    },

    onMutate: async (params) => {
      const postId = typeof params === "string" ? params : params.postId;

      // 1. Cancel outgoing queries so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.feed });
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });

      // 2. Snapshot current state for rollback
      const previousFeedQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
        queryKey: queryKeys.feed,
      });
      const previousPostQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
        queryKey: queryKeys.posts.all,
      });
      const previousQueries = [...previousFeedQueries, ...previousPostQueries];

      // 3. Optimistically update all matching infinite caches (feed, explore, profile)
      updatePostInAllInfiniteCaches(queryClient, postId, (oldPost: Post) => {
        const nextLiked = !oldPost.isLiked;
        return {
          ...oldPost,
          isLiked: nextLiked,
          likeCount: nextLiked
            ? (oldPost.likeCount ?? 0) + 1
            : Math.max(0, (oldPost.likeCount ?? 1) - 1),
        };
      });

      return { previousQueries };
    },

    onError: (_err, _variables, context) => {
      // Rollback to saved snapshots on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, oldData]) => {
          queryClient.setQueryData(queryKey, oldData);
        });
      }
    },

    onSettled: () => {
      // Sync with server state
      queryClient.invalidateQueries({
        queryKey: queryKeys.feed,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.all,
      });
    },
  });
};
