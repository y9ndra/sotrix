import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { Post, PostAuthor, PostsResponse } from "../types/post.types";
import { queryKeys } from "./queryKeys";

/**
 * Updates a specific post across ALL active infinite post query caches (feed, explore, profile, etc.)
 * as well as single post detail caches.
 */
export const updatePostInAllInfiniteCaches = (
  queryClient: QueryClient,
  postId: string,
  updater: (post: Post) => Post
) => {
  const postQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
    queryKey: queryKeys.posts.all,
  });
  const feedQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
    queryKey: queryKeys.feed,
  });
  const queries = [...postQueries, ...feedQueries];

  queries.forEach(([queryKey, oldData]) => {
    if (!oldData) return;

    queryClient.setQueryData<InfiniteData<PostsResponse>>(queryKey, {
      ...oldData,
      pages: oldData.pages.map((page) => ({
        ...page,
        data: page.data.map((post) =>
          post._id === postId ? updater(post) : post
        ),
      })),
    });
  });

  // Also update single post detail cache if currently loaded
  const detailKey = queryKeys.posts.detail(postId);
  const detailData = queryClient.getQueryData<Post>(detailKey);
  if (detailData) {
    queryClient.setQueryData<Post>(detailKey, updater(detailData));
  }
};

/**
 * Updates a specific author's follow status across ALL active post query caches
 */
export const updateAuthorInAllInfiniteCaches = (
  queryClient: QueryClient,
  authorId: string,
  updater: (author: PostAuthor) => PostAuthor
) => {
  const postQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
    queryKey: queryKeys.posts.all,
  });
  const feedQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
    queryKey: queryKeys.feed,
  });
  const queries = [...postQueries, ...feedQueries];

  queries.forEach(([queryKey, oldData]) => {
    if (!oldData) return;

    queryClient.setQueryData<InfiniteData<PostsResponse>>(queryKey, {
      ...oldData,
      pages: oldData.pages.map((page) => ({
        ...page,
        data: page.data.map((post) => {
          if (post.author?._id !== authorId) {
            return post;
          }
          return {
            ...post,
            author: updater(post.author),
          };
        }),
      })),
    });
  });
};

/**
 * Removes a specific post across ALL active infinite post query caches (feed, explore, profile, etc.)
 * as well as single post detail caches.
 */
export const removePostFromAllInfiniteCaches = (
  queryClient: QueryClient,
  postId: string
) => {
  const postQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
    queryKey: queryKeys.posts.all,
  });
  const feedQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
    queryKey: queryKeys.feed,
  });
  const queries = [...postQueries, ...feedQueries];

  queries.forEach(([queryKey, oldData]) => {
    if (!oldData) return;

    queryClient.setQueryData<InfiniteData<PostsResponse>>(queryKey, {
      ...oldData,
      pages: oldData.pages.map((page) => ({
        ...page,
        data: page.data.filter((post) => post._id !== postId),
      })),
    });
  });

  // Also remove single post detail cache if currently loaded
  const detailKey = queryKeys.posts.detail(postId);
  queryClient.removeQueries({ queryKey: detailKey });
};
