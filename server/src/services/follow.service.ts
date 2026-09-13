import mongoose from "mongoose";
import {
  IUserRepository,
  userRepository,
  IFollowRepository,
  followRepository,
} from "../repositories";

export interface ToggleFollowResult {
  following: boolean;
  followersCount: number;
}

export class FollowService {
  constructor(
    private userRepo: IUserRepository = userRepository,
    private followRepo: IFollowRepository = followRepository
  ) {}

  async toggleFollowWithoutTransaction(
    followerId: string,
    followingId: string
  ): Promise<ToggleFollowResult> {
    const targetUser = await this.userRepo.findById(followingId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    const existingFollow = await this.followRepo.findFollow(
      followerId,
      followingId
    );

    if (existingFollow) {
      await this.followRepo.deleteById(existingFollow._id);

      const updatedTargetUser = await this.userRepo.incrementFollowers(
        followingId,
        -1
      );

      await this.userRepo.incrementFollowing(followerId, -1);

      return {
        following: false,
        followersCount: updatedTargetUser
          ? Math.max(0, updatedTargetUser.followersCount)
          : 0,
      };
    } else {
      await this.followRepo.create(followerId, followingId);

      const updatedTargetUser = await this.userRepo.incrementFollowers(
        followingId,
        1
      );

      await this.userRepo.incrementFollowing(followerId, 1);

      return {
        following: true,
        followersCount: updatedTargetUser
          ? updatedTargetUser.followersCount
          : 1,
      };
    }
  }

  async toggleFollow(
    followerId: string,
    followingId: string
  ): Promise<ToggleFollowResult> {
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
    await this.followRepo.createIndexes().catch(() => {});

    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let session: mongoose.ClientSession | null = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();

        const targetUser = await this.userRepo.findById(followingId, {
          session,
        });
        if (!targetUser) {
          throw new Error("User not found");
        }

        const existingFollow = await this.followRepo.findFollow(
          followerId,
          followingId,
          session
        );

        let isFollowing = false;
        let updatedTargetUser;

        if (existingFollow) {
          await this.followRepo.deleteById(existingFollow._id, session);

          updatedTargetUser = await this.userRepo.incrementFollowers(
            followingId,
            -1,
            session
          );

          await this.userRepo.incrementFollowing(followerId, -1, session);

          isFollowing = false;
        } else {
          await this.followRepo.create(followerId, followingId, session);

          updatedTargetUser = await this.userRepo.incrementFollowers(
            followingId,
            1,
            session
          );

          await this.userRepo.incrementFollowing(followerId, 1, session);

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
          return this.toggleFollowWithoutTransaction(followerId, followingId);
        }

        throw error;
      }
    }

    return this.toggleFollowWithoutTransaction(followerId, followingId);
  }
}

export const followService = new FollowService();
export const toggleFollow = (followerId: string, followingId: string) =>
  followService.toggleFollow(followerId, followingId);
