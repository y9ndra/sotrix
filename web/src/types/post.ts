export interface PostAuthor {
  _id: string;
  name?: string;
  username: string;
}

export interface Post {
  _id: string;
  content: string;
  author: PostAuthor;
  createdAt: string;
  updatedAt: string;
}

export interface PostsResponse {
  success: boolean;
  data: Post[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}
