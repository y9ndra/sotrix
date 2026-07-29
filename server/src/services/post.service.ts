import Post, { IPost } from "../models/post.model";
import Like from "../models/like.model";
import { decodeCursor, encodeCursor } from "../utils/cursor";

interface CreatePostInput {
  content: string;
  author: string;
}

export interface PaginatedPostsResult {
  data: any[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

const attachLikeStatus = async (posts: any[], currentUserId?: string) => {
  if (!posts.length) return [];

  const likedPostIdsSet = new Set<string>();

  if (currentUserId) {
    const postIds = posts.map((post) => post._id);
    const userLikes = await Like.find({
      user: currentUserId,
      post: { $in: postIds },
    }).select("post");

    userLikes.forEach((like) => {
      likedPostIdsSet.add(like.post.toString());
    });
  }

  return posts.map((post) => {
    const postObj = post.toObject ? post.toObject() : post;
    return {
      ...postObj,
      likeCount: postObj.likeCount || 0,
      isLiked: currentUserId ? likedPostIdsSet.has(postObj._id.toString()) : false,
    };
  });
};

export const createPost = async ({
  content,
  author,
}: CreatePostInput): Promise<any> => {
  const post = await Post.create({
    content,
    author,
  });

  await post.populate("author", "name username email");
  const postObj = post.toObject();

  return {
    ...postObj,
    likeCount: 0,
    isLiked: false,
  };
};

export const getPosts = async (
  limit: number = 10,
  cursor?: string,
  currentUserId?: string
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
  const rawData = posts.slice(0, limit);

  let nextCursor: string | null = null;
  if (hasMore && rawData.length > 0) {
    const lastPost = rawData[rawData.length - 1];
    nextCursor = encodeCursor({
      createdAt: (lastPost.createdAt as Date).toISOString(),
      id: lastPost._id.toString(),
    });
  }

  const data = await attachLikeStatus(rawData, currentUserId);

  return {
    data,
    pagination: {
      hasMore,
      nextCursor,
    },
  };
};

export const getPostById = async (
  postId: string,
  currentUserId?: string
): Promise<any> => {
  const post = await Post.findById(postId).populate("author", "name username email");

  if (!post) {
    throw new Error("Post not found");
  }

  const [postWithLike] = await attachLikeStatus([post], currentUserId);
  return postWithLike;
};

export const getMyPosts = async (
  userId: string,
  limit: number = 10,
  cursor?: string,
  currentUserId?: string
): Promise<PaginatedPostsResult> => {
  const query: any = { author: userId };

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
  const rawData = posts.slice(0, limit);

  let nextCursor: string | null = null;
  if (hasMore && rawData.length > 0) {
    const lastPost = rawData[rawData.length - 1];
    nextCursor = encodeCursor({
      createdAt: (lastPost.createdAt as Date).toISOString(),
      id: lastPost._id.toString(),
    });
  }

  const data = await attachLikeStatus(rawData, currentUserId);

  return {
    data,
    pagination: {
      hasMore,
      nextCursor,
    },
  };
};

export const updatePost = async (
  postId: string,
  userId: string,
  content: string
): Promise<any> => {
  const post = await Post.findById(postId);

  if (!post) {
    throw new Error("Post not found");
  }

  if (post.author.toString() !== userId) {
    throw new Error("You are not authorized to update this post");
  }

  post.content = content;
  await post.save();
  await post.populate("author", "name username email");

  const [postWithLike] = await attachLikeStatus([post], userId);
  return postWithLike;
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
