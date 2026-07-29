export interface PostAuthor {
  _id: string;
  name?: string;
  username: string;
}

export interface Post {
  _id: string;
  content: string;
  author: PostAuthor;
  likeCount?: number;
  isLiked?: boolean;
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

export interface CreatePostResponse {
  success: boolean;
  data: Post;
}
