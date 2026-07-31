import Post from "../models/post.model";
import User from "../models/user.model";
import Like from "../models/like.model";
import Follow from "../models/follow.model";
import { decodeCursor, encodeCursor } from "../utils/cursor";

export interface PaginatedExplorePostsResult {
  data: any[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface SuggestedUserItem {
  _id: string;
  name: string;
  username: string;
  bio: string;
  followersCount: number;
  isFollowing: boolean;
}

export interface PaginatedSuggestedUsersResult {
  data: SuggestedUserItem[];
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

export const getExplorePosts = async (
  currentUserId: string,
  limit: number = 10,
  cursor?: string
): Promise<PaginatedExplorePostsResult> => {
  const follows = await Follow.find({ follower: currentUserId }).select("following");
  const followedUserIds = follows.map((f) => f.following);

  const excludedUserIds = [currentUserId, ...followedUserIds];

  const query: any = {
    author: { $nin: excludedUserIds },
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

export const getSuggestedUsers = async (
  currentUserId: string,
  limit: number = 10,
  cursor?: string
): Promise<PaginatedSuggestedUsersResult> => {
  const follows = await Follow.find({ follower: currentUserId }).select("following");
  const followedUserIds = follows.map((f) => f.following);

  const excludedUserIds = [currentUserId, ...followedUserIds];

  const query: any = {
    _id: { $nin: excludedUserIds },
  };

  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
      if (decoded && typeof decoded.followersCount === "number" && decoded.id) {
        query.$or = [
          { followersCount: { $lt: decoded.followersCount } },
          {
            followersCount: decoded.followersCount,
            _id: { $lt: decoded.id },
          },
        ];
      }
    } catch {
      // Invalid cursor ignored
    }
  }

  const users = await User.find(query)
    .select("_id name username bio followersCount followingCount")
    .sort({
      followersCount: -1,
      _id: -1,
    })
    .limit(limit + 1);

  const hasMore = users.length > limit;
  const rawData = users.slice(0, limit);

  let nextCursor: string | null = null;
  if (hasMore && rawData.length > 0) {
    const lastUser = rawData[rawData.length - 1];
    const cursorObj = {
      followersCount: lastUser.followersCount || 0,
      id: lastUser._id.toString(),
    };
    nextCursor = Buffer.from(JSON.stringify(cursorObj)).toString("base64url");
  }

  const data: SuggestedUserItem[] = rawData.map((user) => ({
    _id: user._id.toString(),
    name: user.name || "",
    username: user.username || "",
    bio: user.bio || "",
    followersCount: user.followersCount || 0,
    isFollowing: false,
  }));

  return {
    data,
    pagination: {
      hasMore,
      nextCursor,
    },
  };
};
