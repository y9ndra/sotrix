export interface PostAuthor {
  _id: string;
  name?: string;
  username: string;
  isFollowing?: boolean;
  profilePicUrl?: string;
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

export interface FeedResponse {
  success: boolean;
  data: Post[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
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
