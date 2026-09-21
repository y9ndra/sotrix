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
          const postAuthorId = post.author?._id || (post.author as any)?.id;
          if (!postAuthorId || postAuthorId.toString() !== authorId.toString() || !post.author) {
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

/**
 * Optimistically updates a user's follow status and follower count across ALL user query caches
 * (suggested users, search queries, user details).
 */
export const updateUserInAllUserCaches = (
  queryClient: QueryClient,
  targetUserId: string,
  isFollowing: boolean,
  followersCount?: number
) => {
  const userQueries = queryClient.getQueriesData<any>({
    queryKey: queryKeys.users.all,
  });

  userQueries.forEach(([queryKey, oldData]) => {
    if (!oldData) return;

    if (Array.isArray(oldData.pages)) {
      queryClient.setQueryData(queryKey, {
        ...oldData,
        pages: oldData.pages.map((page: any) => {
          if (!page || !Array.isArray(page.data)) return page;
          return {
            ...page,
            data: page.data.map((user: any) => {
              const uId = user._id || user.id;
              if (uId && uId.toString() === targetUserId.toString()) {
                const currentCount = typeof user.followersCount === "number" ? user.followersCount : 0;
                const newCount = typeof followersCount === "number"
                  ? followersCount
                  : Math.max(0, currentCount + (isFollowing ? 1 : -1));
                return {
                  ...user,
                  isFollowing,
                  followersCount: newCount,
                };
              }
              return user;
            }),
          };
        }),
      });
    } else if (oldData.data && typeof oldData.data === "object") {
      const uId = oldData.data._id || oldData.data.id;
      if (uId && uId.toString() === targetUserId.toString()) {
        const currentCount = typeof oldData.data.followersCount === "number" ? oldData.data.followersCount : 0;
        const newCount = typeof followersCount === "number"
          ? followersCount
          : Math.max(0, currentCount + (isFollowing ? 1 : -1));
        queryClient.setQueryData(queryKey, {
          ...oldData,
          data: {
            ...oldData.data,
            isFollowing,
            followersCount: newCount,
          },
        });
      }
    } else if (oldData._id || oldData.id) {
      const uId = oldData._id || oldData.id;
      if (uId && uId.toString() === targetUserId.toString()) {
        const currentCount = typeof oldData.followersCount === "number" ? oldData.followersCount : 0;
        const newCount = typeof followersCount === "number"
          ? followersCount
          : Math.max(0, currentCount + (isFollowing ? 1 : -1));
        queryClient.setQueryData(queryKey, {
          ...oldData,
          isFollowing,
          followersCount: newCount,
        });
      }
    }
  });
};

/**
 * Synchronizes and invalidates query caches across the application when a follow/unfollow occurs.
 * - For the view currently open on screen: refetches immediately if relevant.
 * - For all inactive views: marks queries as invalidated with `refetchType: 'none'` so NO background
 *   API calls are fired until the user actually enters that page (saving multiple redundant requests).
 */
export const invalidateFollowQueries = async (
  queryClient: QueryClient,
  targetUserId?: string
) => {
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
  const isHome = currentPath === "/";
  const isExplore = currentPath.startsWith("/explore");
  const isSearch = currentPath.startsWith("/search");

  await Promise.all([
    // Home feed: refetch immediately if currently viewing Home, otherwise mark invalidated with 0 background calls
    queryClient.invalidateQueries({
      queryKey: queryKeys.feed,
      refetchType: isHome ? "active" : "none",
    }),

    // Explore posts: refetch immediately if currently viewing Explore, otherwise mark invalidated with 0 background calls
    queryClient.invalidateQueries({
      queryKey: queryKeys.posts.explore,
      refetchType: isExplore ? "active" : "none",
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.posts.all,
      refetchType: isExplore ? "active" : "none",
    }),

    // Search queries: refetch if currently viewing Search, otherwise mark invalidated with 0 background calls
    queryClient.invalidateQueries({
      queryKey: queryKeys.users.suggested,
      refetchType: isSearch ? "active" : "none",
    }),
    queryClient.invalidateQueries({
      queryKey: queryKeys.users.all,
      refetchType: isSearch ? "active" : "none",
    }),

    // Conversations: deferred invalidation
    queryClient.invalidateQueries({
      queryKey: queryKeys.conversations.all,
      refetchType: "none",
    }),

    // Profile detail & user posts for target user if specified
    ...(targetUserId
      ? [
          queryClient.invalidateQueries({
            queryKey: queryKeys.users.detail(targetUserId),
            refetchType: "all",
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.posts.userPosts(targetUserId),
            refetchType: "all",
          }),
        ]
      : []),
  ]);
};

