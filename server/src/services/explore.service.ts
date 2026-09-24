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
  profilePicUrl?: string;
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
    ]),
    Like.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]),
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

  const [commentCounts, likeCounts, userLikes = [], userFollows = []] = await Promise.all(queries);

  const commentCountsMap = new Map<string, number>();
  commentCounts.forEach((c: any) => {
    commentCountsMap.set(c._id.toString(), c.count);
  });

  const likeCountsMap = new Map<string, number>();
  likeCounts.forEach((l: any) => {
    likeCountsMap.set(l._id.toString(), l.count);
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
      likeCount: likeCountsMap.get(postObj._id.toString()) ?? 0,
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

  const demoUsers = await User.find({
    $or: [{ isDemo: true }, { email: "demo@sotrix.dev" }, { username: "demo" }],
  }).select("_id").lean();
  const demoUserIds = demoUsers.map((u: any) => u._id);

  const excludedUserIds = [currentUserId, ...followedUserIds, ...demoUserIds];

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

export interface SuggestedUsersCursor {
  phase: "unfollowed" | "followed";
  followersCount: number;
  id: string;
}

export const getSuggestedUsers = async (
  currentUserId: string,
  limit: number = 10,
  cursor?: string
): Promise<PaginatedSuggestedUsersResult> => {
  const follows = await Follow.find({ follower: currentUserId }).select("following").lean();
  const followedUserIds = follows.map((f: any) => f.following.toString());
  const followedSet = new Set(followedUserIds);

  const demoUsers = await User.find({
    $or: [{ isDemo: true }, { email: "demo@sotrix.dev" }, { username: "demo" }],
  }).select("_id").lean();
  const demoUserIds = demoUsers.map((u: any) => u._id.toString());

  let cursorObj: SuggestedUsersCursor | null = null;
  if (cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(cursor, "base64url").toString("utf-8"));
      if (decoded && typeof decoded.followersCount === "number" && decoded.id) {
        cursorObj = {
          phase: decoded.phase === "followed" ? "followed" : "unfollowed",
          followersCount: decoded.followersCount,
          id: decoded.id,
        };
      }
    } catch {
      // Invalid cursor ignored
    }
  }

  const phase: "unfollowed" | "followed" = cursorObj?.phase || "unfollowed";

  if (phase === "unfollowed") {
    const excludedUserIds = [currentUserId, ...followedUserIds, ...demoUserIds];
    const unfollowedQuery: any = {
      _id: { $nin: excludedUserIds },
      isDemo: { $ne: true },
      email: { $ne: "demo@sotrix.dev" },
      username: { $ne: "demo" },
    };

    if (cursorObj && cursorObj.phase === "unfollowed") {
      unfollowedQuery.$or = [
        { followersCount: { $lt: cursorObj.followersCount } },
        {
          followersCount: cursorObj.followersCount,
          _id: { $lt: cursorObj.id },
        },
      ];
    }

    const unfollowedUsers = await User.find(unfollowedQuery)
      .select("_id name username bio followersCount followingCount profilePicUrl")
      .sort({
        followersCount: -1,
        _id: -1,
      })
      .limit(limit + 1)
      .lean();

    if (unfollowedUsers.length > limit) {
      const rawData = unfollowedUsers.slice(0, limit);
      const lastUser: any = rawData[rawData.length - 1];
      const nextCursorObj: SuggestedUsersCursor = {
        phase: "unfollowed",
        followersCount: lastUser.followersCount || 0,
        id: lastUser._id.toString(),
      };
      const nextCursor = Buffer.from(JSON.stringify(nextCursorObj)).toString("base64url");

      return {
        data: rawData.map((user: any) => ({
          _id: user._id.toString(),
          name: user.name || "",
          username: user.username || "",
          bio: user.bio || "",
          followersCount: user.followersCount || 0,
          isFollowing: false,
          profilePicUrl: user.profilePicUrl || "",
        })),
        pagination: {
          hasMore: true,
          nextCursor,
        },
      };
    }

    // Unfollowed users are exhausted or count <= limit
    const rawUnfollowed = unfollowedUsers;
    const remainingLimit = limit - rawUnfollowed.length;

    let rawFollowed: any[] = [];
    let hasMore = false;
    let nextCursor: string | null = null;

    if (followedUserIds.length > 0 && remainingLimit > 0) {
      const followedQuery: any = {
        _id: { $in: followedUserIds, $nin: demoUserIds },
        isDemo: { $ne: true },
        email: { $ne: "demo@sotrix.dev" },
        username: { $ne: "demo" },
      };

      const fetchedFollowed = await User.find(followedQuery)
        .select("_id name username bio followersCount followingCount profilePicUrl")
        .sort({
          followersCount: -1,
          _id: -1,
        })
        .limit(remainingLimit + 1)
        .lean();

      if (fetchedFollowed.length > remainingLimit) {
        hasMore = true;
        rawFollowed = fetchedFollowed.slice(0, remainingLimit);
        const lastUser: any = rawFollowed[rawFollowed.length - 1];
        const nextCursorObj: SuggestedUsersCursor = {
          phase: "followed",
          followersCount: lastUser.followersCount || 0,
          id: lastUser._id.toString(),
        };
        nextCursor = Buffer.from(JSON.stringify(nextCursorObj)).toString("base64url");
      } else {
        rawFollowed = fetchedFollowed;
        hasMore = false;
        nextCursor = null;
      }
    }

    const combinedRaw = [...rawUnfollowed, ...rawFollowed];
    const data: SuggestedUserItem[] = combinedRaw.map((user: any) => ({
      _id: user._id.toString(),
      name: user.name || "",
      username: user.username || "",
      bio: user.bio || "",
      followersCount: user.followersCount || 0,
      isFollowing: followedSet.has(user._id.toString()),
      profilePicUrl: user.profilePicUrl || "",
    }));

    return {
      data,
      pagination: {
        hasMore,
        nextCursor,
      },
    };
  }

  // phase === "followed"
  if (followedUserIds.length === 0) {
    return {
      data: [],
      pagination: {
        hasMore: false,
        nextCursor: null,
      },
    };
  }

  const followedQuery: any = {
    _id: { $in: followedUserIds, $nin: demoUserIds },
    isDemo: { $ne: true },
    email: { $ne: "demo@sotrix.dev" },
    username: { $ne: "demo" },
  };

  if (cursorObj && cursorObj.phase === "followed") {
    followedQuery.$or = [
      { followersCount: { $lt: cursorObj.followersCount } },
      {
        followersCount: cursorObj.followersCount,
        _id: { $lt: cursorObj.id },
      },
    ];
  }

  const followedUsers = await User.find(followedQuery)
    .select("_id name username bio followersCount followingCount profilePicUrl")
    .sort({
      followersCount: -1,
      _id: -1,
    })
    .limit(limit + 1)
    .lean();

  const hasMore = followedUsers.length > limit;
  const rawData = followedUsers.slice(0, limit);

  let nextCursor: string | null = null;
  if (hasMore && rawData.length > 0) {
    const lastUser: any = rawData[rawData.length - 1];
    const nextCursorObj: SuggestedUsersCursor = {
      phase: "followed",
      followersCount: lastUser.followersCount || 0,
      id: lastUser._id.toString(),
    };
    nextCursor = Buffer.from(JSON.stringify(nextCursorObj)).toString("base64url");
  }

  const data: SuggestedUserItem[] = rawData.map((user: any) => ({
    _id: user._id.toString(),
    name: user.name || "",
    username: user.username || "",
    bio: user.bio || "",
    followersCount: user.followersCount || 0,
    isFollowing: true,
    profilePicUrl: user.profilePicUrl || "",
  }));

  return {
    data,
    pagination: {
      hasMore,
      nextCursor,
    },
  };
};
