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
