export interface CommentAuthor {
  _id: string;
  name?: string;
  username: string;
  email?: string;
}

export interface Comment {
  _id: string;
  content: string;
  author: CommentAuthor;
  post: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentsResponse {
  success: boolean;
  data: Comment[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface CreateCommentResponse {
  success: boolean;
  data: Comment;
}
