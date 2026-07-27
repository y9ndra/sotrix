import mongoose from "mongoose";
import User from "../models/user.model";

export interface UpdateProfileInput {
  name?: string;
  username?: string;
  bio?: string;
}

export const getUserById = async (userId: string) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid User ID format");
  }

  const user = await User.findById(userId).select("-password");

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const updateUserProfile = async (
  userId: string,
  updates: UpdateProfileInput
) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid User ID format");
  }

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  }).select("-password");

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};
