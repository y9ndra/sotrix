export const queryKeys = {
  feed: ["feed"] as const,
  posts: {
    all: ["posts"] as const,
    explore: ["posts", "explore"] as const,
    feed: ["feed"] as const,
    detail: (postId: string) => ["posts", postId] as const,
    userPosts: (userId: string) =>
      ["posts", "user", userId] as const,
  },

  comments: {
    all: ["comments"] as const,
    byPost: (postId: string) =>
      ["comments", postId] as const,
  },

  users: {
    all: ["users"] as const,
    detail: (userId: string) =>
      ["users", userId] as const,
    suggested: ["users", "suggested"] as const,
  },

  notifications: {
    all: ["notifications"] as const,
    unreadCount: ["notifications", "unreadCount"] as const,
  },

  conversations: {
    all: ["conversations"] as const,
    detail: (id: string) => ["conversations", id] as const,
    messages: (conversationId: string) =>
      ["conversations", conversationId, "messages"] as const,
  },
};
