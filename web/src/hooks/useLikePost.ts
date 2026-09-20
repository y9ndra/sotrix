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
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.detail(postId) });

      // 2. Snapshot current states for rollback
      const previousFeedQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
        queryKey: queryKeys.feed,
      });
      const previousPostQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
        queryKey: queryKeys.posts.all,
      });
      const previousDetailPost = queryClient.getQueryData<Post>(
        queryKeys.posts.detail(postId)
      );
      const previousQueries = [...previousFeedQueries, ...previousPostQueries];

      // 3. Optimistically update all matching caches (feed, explore, profile, single post)
      updatePostInAllInfiniteCaches(queryClient, postId, (oldPost: Post) => {
        const nextLiked = !oldPost.isLiked;
        const currentCount = Math.max(0, oldPost.likeCount ?? 0);
        return {
          ...oldPost,
          isLiked: nextLiked,
          likeCount: nextLiked ? currentCount + 1 : Math.max(0, currentCount - 1),
        };
      });

      return { previousQueries, previousDetailPost, postId };
    },

    onSuccess: (data, variables) => {
      const postId = typeof variables === "string" ? variables : variables.postId;
      if (data && typeof data.likeCount === "number") {
        updatePostInAllInfiniteCaches(queryClient, postId, (oldPost: Post) => ({
          ...oldPost,
          isLiked: data.liked,
          likeCount: Math.max(0, data.likeCount),
        }));
      }
    },

    onError: (_err, _variables, context) => {
      // Rollback to saved snapshots on error
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, oldData]) => {
          queryClient.setQueryData(queryKey, oldData);
        });
      }
      if (context?.postId && context?.previousDetailPost) {
        queryClient.setQueryData(
          queryKeys.posts.detail(context.postId),
          context.previousDetailPost
        );
      }
    },

    onSettled: (_data, _error, variables) => {
      const postId = typeof variables === "string" ? variables : variables.postId;

      // Sync with server state
      queryClient.invalidateQueries({
        queryKey: queryKeys.feed,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.all,
      });
      if (postId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.posts.detail(postId),
        });
      }
    },
  });
};
