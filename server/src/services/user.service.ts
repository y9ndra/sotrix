import mongoose from "mongoose";
import User from "../models/user.model";
import Follow from "../models/follow.model";
import redisClient from "../config/redis";
import Post from "../models/post.model";
import { uploadImage, deleteFromCloudinary } from "./cloudinary.service";
import { decodeCursor, encodeCursor } from "../utils/cursor";

export interface UpdateProfileInput {
  name?: string;
  username?: string;
  bio?: string;
  profilePicUrl?: string;
  profilePicPublicId?: string;
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
  updates: UpdateProfileInput,
  fileBuffer?: Buffer
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

  if (fileBuffer) {
    const { secure_url, public_id } = await uploadImage(fileBuffer, "sotrix/profiles");
    const existingUserDoc = await User.findById(userId);
    if (existingUserDoc?.profilePicPublicId) {
      try {
        await deleteFromCloudinary(existingUserDoc.profilePicPublicId);
      } catch (cloudinaryError) {
        console.error("Failed to delete old profile picture from Cloudinary:", cloudinaryError);
      }
    }
    sanitizedUpdates.profilePicUrl = secure_url;
    sanitizedUpdates.profilePicPublicId = public_id;
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
  currentUserId: string,
  limit: number = 10,
  cursor?: string
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

  const filter: any = {
    $and: [
      { _id: { $ne: currentUserId } },
      {
        $or: [
          { username: regex },
          { name: regex },
        ],
      },
    ],
  };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      filter.$and.push({
        $or: [
          {
            createdAt: {
              $lt: new Date(decoded.createdAt),
            },
          },
          {
            createdAt: new Date(decoded.createdAt),
            _id: {
              $lt: decoded.id,
            },
          },
        ],
      });
    }
  }

  const users = await User.find(filter)
    .select("_id username name bio followersCount profilePicUrl createdAt")
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .limit(limit + 1);

  const hasMore = users.length > limit;
  const rawData = users.slice(0, limit);

  let nextCursor: string | null = null;
  if (hasMore && rawData.length > 0) {
    const lastUser = rawData[rawData.length - 1];
    const createdAtDate = (lastUser as any).createdAt
      ? new Date((lastUser as any).createdAt)
      : (lastUser._id as any).getTimestamp();
    nextCursor = encodeCursor({
      createdAt: createdAtDate.toISOString(),
      id: lastUser._id.toString(),
    });
  }

  const followedUsers = await Follow.find({
    follower: currentUserId,
    following: { $in: rawData.map((u) => u._id) },
  }).select("following");

  const followedSet = new Set(
    followedUsers.map((f) => f.following.toString())
  );

  const data = rawData.map((u) => {
    const userObj = u.toObject();
    return {
      ...userObj,
      isFollowing: followedSet.has(u._id.toString()),
    };
  });

  const pagination = {
    hasMore,
    nextCursor,
  };

  const result: any = data;
  result.data = data;
  result.pagination = pagination;

  return result;
};

