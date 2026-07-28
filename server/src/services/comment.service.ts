import Comment, { IComment } from "../models/comment.model";
import Post from "../models/post.model";
import { decodeCursor, encodeCursor } from "../utils/cursor";

interface CreateCommentInput {
  content: string;
  author: string;
  post: string;
}

export interface PaginatedCommentsResult {
  data: IComment[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export const createComment = async ({
  content,
  author,
  post,
}: CreateCommentInput): Promise<IComment> => {
  const existingPost = await Post.findById(post);
  if (!existingPost) {
    throw new Error("Post not found");
  }

  const comment = await Comment.create({
    content,
    author,
    post,
  });

  await comment.populate("author", "name username email");

  return comment;
};

export const getCommentsForPost = async (
  postId: string,
  limit: number = 10,
  cursor?: string
): Promise<PaginatedCommentsResult> => {
  const existingPost = await Post.findById(postId);
  if (!existingPost) {
    throw new Error("Post not found");
  }

  const query: any = { post: postId };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      const cursorDate = new Date(decoded.createdAt);
      query.$or = [
        {
          createdAt: {
            $lt: cursorDate,
          },
        },
        {
          createdAt: cursorDate,
          _id: {
            $lt: decoded.id,
          },
        },
      ];
    }
  }

  const comments = await Comment.find(query)
    .populate("author", "name username email")
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .limit(limit + 1);

  const hasMore = comments.length > limit;
  const data = comments.slice(0, limit);

  let nextCursor: string | null = null;
  if (hasMore && data.length > 0) {
    const lastComment = data[data.length - 1];
    nextCursor = encodeCursor({
      createdAt: (lastComment.createdAt as Date).toISOString(),
      id: lastComment._id.toString(),
    });
  }

  return {
    data,
    pagination: {
      hasMore,
      nextCursor,
    },
  };
};

export const updateComment = async (
  commentId: string,
  userId: string,
  content: string
): Promise<IComment> => {
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new Error("Comment not found");
  }

  if (comment.author.toString() !== userId) {
    throw new Error("You are not authorized to update this comment");
  }

  comment.content = content;
  await comment.save();
  await comment.populate("author", "name username email");

  return comment;
};

export const deleteComment = async (
  commentId: string,
  userId: string
): Promise<IComment> => {
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new Error("Comment not found");
  }

  if (comment.author.toString() !== userId) {
    throw new Error("You are not authorized to delete this comment");
  }

  await Comment.findByIdAndDelete(commentId);

  return comment;
};
