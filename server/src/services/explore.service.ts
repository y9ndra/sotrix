import Post from "../models/post.model";
import User from "../models/user.model";
import Like from "../models/like.model";
import Follow from "../models/follow.model";
import Comment from "../models/comment.model";
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
  const followedAuthorIdsSet = new Set<string>();

  const postIds = posts.map((post) => post._id);

  const queries: Promise<any>[] = [
    Comment.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ])
  ];

  if (currentUserId) {
    const authorIds = posts
      .map((post) => post.author?._id || post.author)
      .filter(Boolean);

    queries.push(
      Like.find({ user: currentUserId, post: { $in: postIds } }).select("post"),
      Follow.find({ follower: currentUserId, following: { $in: authorIds } }).select("following")
    );
  }

  const [commentCounts, userLikes = [], userFollows = []] = await Promise.all(queries);

  const commentCountsMap = new Map<string, number>();
  commentCounts.forEach((c: any) => {
    commentCountsMap.set(c._id.toString(), c.count);
  });

  userLikes.forEach((like: any) => {
    likedPostIdsSet.add(like.post.toString());
  });

  userFollows.forEach((follow: any) => {
    followedAuthorIdsSet.add(follow.following.toString());
  });

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
      commentCount: commentCountsMap.get(postObj._id.toString()) || 0,
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
    .populate("author", "name username email bio profilePicUrl")
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
