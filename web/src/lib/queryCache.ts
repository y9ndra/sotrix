import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import type { Post, PostsResponse } from "../types/post";

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
