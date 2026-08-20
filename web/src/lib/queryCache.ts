import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { Post, PostsResponse } from "../types/post";
import { queryKeys } from "./queryKeys";

/**
 * Updates a specific post inside a single infinite feed query cache
 */
export const updatePostInInfiniteCache = (
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  postId: string,
  updater: (post: Post) => Post
) => {
  queryClient.setQueryData<InfiniteData<PostsResponse>>(
    queryKey,
    (oldData) => {
      if (!oldData) return oldData;

      return {
        ...oldData,

        pages: oldData.pages.map((page) => ({
          ...page,

          data: page.data.map((post) =>
            post._id === postId
              ? updater(post)
              : post
          ),
        })),
      };
    }
  );
};

/**
 * Updates a specific post across ALL active infinite post query caches matching queryKeys.posts.all prefix
 */
export const updatePostInAllInfiniteCaches = (
  queryClient: QueryClient,
  postId: string,
  updater: (post: Post) => Post
) => {
  const queries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
    queryKey: queryKeys.posts.all,
  });

  queries.forEach(([queryKey, oldData]) => {
    if (!oldData) return;

    queryClient.setQueryData<InfiniteData<PostsResponse>>(queryKey, {
      ...oldData,

      pages: oldData.pages.map((page) => ({
        ...page,

        data: page.data.map((post) =>
          post._id === postId
            ? updater(post)
            : post
        ),
      })),
    });
  });
};
