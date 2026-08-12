export interface PostAuthor {
  _id: string;
  name?: string;
  username: string;
  isFollowing?: boolean;
}

export interface Post {
  _id: string;
  content: string;
  author: PostAuthor;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  imageUrl?: string;
  imagePublicId?: string;
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
