import mongoose from "mongoose";
import User from "../models/user.model";
import Follow from "../models/follow.model";

export interface UpdateProfileInput {
  name?: string;
  username?: string;
  bio?: string;
}

export const getUserById = async (userId: string, currentUserId?: string) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid User ID format");
  }

  const user = await User.findById(userId).select("-password");

  if (!user) {
    throw new Error("User not found");
  }

  const userObj: any = user.toObject();
  let isFollowing = false;

  if (currentUserId && currentUserId !== userId) {
    const existingFollow = await Follow.exists({
      follower: currentUserId,
      following: userId,
    });
    isFollowing = !!existingFollow;
  }

  return {
    ...userObj,
    isFollowing,
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

  return user;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const searchUsers = async (search: string, currentUserId?: string) => {
  const cleanSearch = escapeRegex(search.trim().toLowerCase());

  if (!cleanSearch) {
    return [];
  }

  const users = await User.find({
    $or: [
      {
        usernameLower: {
          $regex: `^${cleanSearch}`,
        },
      },
      {
        nameLower: {
          $regex: `^${cleanSearch}`,
        },
      },
    ],
  })
    .select("_id name username followersCount bio")
    .limit(10);

  const userIds = users.map((u) => u._id);
  const followedIds = new Set<string>();

  if (currentUserId && userIds.length > 0) {
    const follows = await Follow.find({
      follower: currentUserId,
      following: { $in: userIds },
    }).select("following");
    
    follows.forEach((f) => followedIds.add(f.following.toString()));
  }

  return users.map((u) => ({
    ...u.toObject(),
    isFollowing: followedIds.has(u._id.toString()),
  }));
};

