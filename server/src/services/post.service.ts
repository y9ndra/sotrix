import Post, { IPost } from "../models/post.model";
import { decodeCursor, encodeCursor } from "../utils/cursor";

interface CreatePostInput {
  content: string;
  author: string;
}

export interface PaginatedPostsResult {
  data: IPost[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export const createPost = async ({
  content,
  author,
}: CreatePostInput): Promise<IPost> => {
  const post = await Post.create({
    content,
    author,
  });

  return post;
};

export const getPosts = async (
  limit: number = 10,
  cursor?: string
): Promise<PaginatedPostsResult> => {
  const query: any = {};

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

  const posts = await Post.find(query)
    .populate("author", "name username email")
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .limit(limit + 1);

  const hasMore = posts.length > limit;
  const data = posts.slice(0, limit);

  let nextCursor: string | null = null;
  if (hasMore && data.length > 0) {
    const lastPost = data[data.length - 1];
    nextCursor = encodeCursor({
      createdAt: (lastPost.createdAt as Date).toISOString(),
      id: lastPost._id.toString(),
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

export const getPostById = async (postId: string): Promise<IPost> => {
  const post = await Post.findById(postId).populate("author", "name username email");

  if (!post) {
    throw new Error("Post not found");
  }

  return post;
};

export const updatePost = async (
  postId: string,
  userId: string,
  content: string
): Promise<IPost> => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new Error("Post not found");
  }

  if (post.author.toString() !== userId) {
    throw new Error("You are not authorized to update this post");
  }

  post.content = content;
  await post.save();

  return post;
};

export const deletePost = async (
  postId: string,
  userId: string
): Promise<IPost> => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new Error("Post not found");
  }

  if (post.author.toString() !== userId) {
    throw new Error("You are not authorized to delete this post");
  }

  await Post.findByIdAndDelete(postId);

  return post;
};
