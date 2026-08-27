import mongoose from "mongoose";
import User from "../models/user.model";
import Follow from "../models/follow.model";
import redisClient from "../config/redis";
import Post from "../models/post.model";

export interface UpdateProfileInput {
  name?: string;
  username?: string;
  bio?: string;
}

export const getUserById = async (userId: string, currentUserId?: string) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid User ID format");
  }

  const key = `user:${userId}`;
  let userObj: any;

  const cachedUser = await redisClient.get(key);

  if (cachedUser) {
    console.log("CACHE HIT:", key);
    userObj = JSON.parse(cachedUser);
  } else {
    console.log("CACHE MISS:", key);
    const user = await User.findById(userId).select("-password");

    if (!user) {
      throw new Error("User not found");
    }

    userObj = user.toObject();

    await redisClient.set(key, JSON.stringify(userObj), {
      EX: 300,
    });
    console.log("USER CACHED (TTL 300s):", key);
  }

  let isFollowing = false;

  if (currentUserId && currentUserId !== userId) {
    const existingFollow = await Follow.exists({
      follower: currentUserId,
      following: userId,
    });
    isFollowing = !!existingFollow;
  }

  const postsCount = await Post.countDocuments({ author: userId });

  return {
    ...userObj,
    isFollowing,
    postsCount,
  };
};


export const updateUserProfile = async (
  userId: string,
  updates: UpdateProfileInput
) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid User ID format");
  }

  const sanitizedUpdates = { ...updates };
  if (sanitizedUpdates.username) {
    sanitizedUpdates.username = sanitizedUpdates.username.trim().toLowerCase();
    const existingUser = await User.findOne({
      username: sanitizedUpdates.username,
      _id: { $ne: userId },
    });
    if (existingUser) {
      throw new Error("Username is already taken");
    }
  }

  const user = await User.findByIdAndUpdate(userId, sanitizedUpdates, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) {
    throw new Error("User not found");
  }

  const key = `user:${userId}`;
  await redisClient.del(key);
  console.log("CACHE DELETED (INVALIDATED):", key);

  return user;
};

export const searchUsersService = async (
  query: string,
  currentUserId: string
) => {
  const search = query.trim().toLowerCase();
  const escapedSearch = search.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
  const regex = new RegExp(
    `^${escapedSearch}`,
    "i"
  );

  const users = await User.find({
    _id: { $ne: currentUserId },
    $or: [
      { username: regex },
      { name: regex }
    ]
  })
    .select("_id username name followersCount")
    .limit(10);

  const followedUsers = await Follow.find({
    follower: currentUserId,
    following: { $in: users.map((u) => u._id) },
  }).select("following");

  const followedSet = new Set(
    followedUsers.map((f) => f.following.toString())
  );

  return users.map((u) => {
    const userObj = u.toObject();
    return {
      ...userObj,
      isFollowing: followedSet.has(u._id.toString()),
    };
  });
};

