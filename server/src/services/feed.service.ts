import Post from "../models/post.model";
import Like from "../models/like.model";
import Follow from "../models/follow.model";
import { decodeCursor, encodeCursor } from "../utils/cursor";

export interface PaginatedFeedResult {
  data: any[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

const attachLikeStatus = async (posts: any[], currentUserId?: string) => {
  if (!posts.length) return [];

  const likedPostIdsSet = new Set<string>();
  const followedAuthorIdsSet = new Set<string>();

  if (currentUserId) {
    const postIds = posts.map((post) => post._id);
    const authorIds = posts
      .map((post) => post.author?._id || post.author)
      .filter(Boolean);

    const [userLikes, userFollows] = await Promise.all([
      Like.find({ user: currentUserId, post: { $in: postIds } }).select("post"),
      Follow.find({ follower: currentUserId, following: { $in: authorIds } }).select("following"),
    ]);

    userLikes.forEach((like) => {
      likedPostIdsSet.add(like.post.toString());
    });

    userFollows.forEach((follow) => {
      followedAuthorIdsSet.add(follow.following.toString());
    });
  }

  return posts.map((post) => {
    const postObj = post.toObject ? post.toObject() : post;
    const authorObj =
      typeof postObj.author === "object" && postObj.author !== null
        ? {
            ...postObj.author,
            isFollowing: currentUserId && postObj.author._id
              ? followedAuthorIdsSet.has(postObj.author._id.toString())
              : false,
          }
        : postObj.author;

    return {
      ...postObj,
      author: authorObj,
      likeCount: postObj.likeCount || 0,
      isLiked: currentUserId ? likedPostIdsSet.has(postObj._id.toString()) : false,
    };
  });
};

export const getHomeFeed = async (
  currentUserId: string,
  limit: number = 10,
  cursor?: string
): Promise<PaginatedFeedResult> => {
  const follows = await Follow.find({ follower: currentUserId }).select("following");
  const followedUserIds = follows.map((f) => f.following);

  if (followedUserIds.length === 0) {
    return {
      data: [],
      pagination: {
        hasMore: false,
        nextCursor: null,
      },
    };
  }

  const query: any = {
    author: { $in: followedUserIds },
  };

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
    .populate("author", "name username email bio")
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
