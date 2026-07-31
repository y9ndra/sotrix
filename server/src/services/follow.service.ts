import mongoose from "mongoose";
import Follow from "../models/follow.model";
import User from "../models/user.model";

export interface ToggleFollowResult {
  following: boolean;
  followersCount: number;
}

const toggleFollowWithoutTransaction = async (
  followerId: string,
  followingId: string
): Promise<ToggleFollowResult> => {
  const targetUser = await User.findById(followingId);
  if (!targetUser) {
    throw new Error("User not found");
  }

  const existingFollow = await Follow.findOne({
    follower: followerId,
    following: followingId,
  });

  if (existingFollow) {
    await Follow.findByIdAndDelete(existingFollow._id);

    const updatedTargetUser = await User.findByIdAndUpdate(
      followingId,
      { $inc: { followersCount: -1 } },
      { returnDocument: "after" }
    );

    await User.findByIdAndUpdate(followerId, {
      $inc: { followingCount: -1 },
    });

    return {
      following: false,
      followersCount: updatedTargetUser
        ? Math.max(0, updatedTargetUser.followersCount)
        : 0,
    };
  } else {
    await Follow.create({
      follower: followerId,
      following: followingId,
    });

    const updatedTargetUser = await User.findByIdAndUpdate(
      followingId,
      { $inc: { followersCount: 1 } },
      { returnDocument: "after" }
    );

    await User.findByIdAndUpdate(followerId, {
      $inc: { followingCount: 1 },
    });

    return {
      following: true,
      followersCount: updatedTargetUser ? updatedTargetUser.followersCount : 1,
    };
  }
};

export const toggleFollow = async (
  followerId: string,
  followingId: string
): Promise<ToggleFollowResult> => {
  if (
    !mongoose.Types.ObjectId.isValid(followingId) ||
    !mongoose.Types.ObjectId.isValid(followerId)
  ) {
    throw new Error("Invalid User ID format");
  }

  if (followerId === followingId) {
    throw new Error("You cannot follow yourself");
  }

  // Pre-create indexes to prevent catalog change lock conflicts inside transactions
  await Follow.createIndexes().catch(() => {});

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      const targetUser = await User.findById(followingId).session(session);
      if (!targetUser) {
        throw new Error("User not found");
      }

      const existingFollow = await Follow.findOne({
        follower: followerId,
        following: followingId,
      }).session(session);

      let isFollowing = false;
      let updatedTargetUser;

      if (existingFollow) {
        await Follow.findByIdAndDelete(existingFollow._id).session(session);

        updatedTargetUser = await User.findByIdAndUpdate(
          followingId,
          { $inc: { followersCount: -1 } },
          { returnDocument: "after", session }
        );

        await User.findByIdAndUpdate(
          followerId,
          { $inc: { followingCount: -1 } },
          { session }
        );

        isFollowing = false;
      } else {
        await Follow.create(
          [
            {
              follower: followerId,
              following: followingId,
            },
          ],
          { session }
        );

        updatedTargetUser = await User.findByIdAndUpdate(
          followingId,
          { $inc: { followersCount: 1 } },
          { returnDocument: "after", session }
        );

        await User.findByIdAndUpdate(
          followerId,
          { $inc: { followingCount: 1 } },
          { session }
        );

        isFollowing = true;
      }

      await session.commitTransaction();
      session.endSession();

      return {
        following: isFollowing,
        followersCount: updatedTargetUser
          ? Math.max(0, updatedTargetUser.followersCount)
          : 0,
      };
    } catch (error: any) {
      if (session) {
        await session.abortTransaction().catch(() => {});
        session.endSession();
      }

      const isTransient =
        error?.errorLabels?.includes("TransientTransactionError") ||
        (typeof error?.message === "string" &&
          (error.message.includes("WriteConflict") ||
            error.message.includes("catalog changes")));

      if (isTransient && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
        continue;
      }

      // Fallback for standalone MongoDB deployments without replica set transactions
      if (
        error &&
        typeof error.message === "string" &&
        (error.message.includes("Transaction numbers are only allowed") ||
          error.message.includes("standalone"))
      ) {
        return toggleFollowWithoutTransaction(followerId, followingId);
      }

      throw error;
    }
  }

  return toggleFollowWithoutTransaction(followerId, followingId);
};
