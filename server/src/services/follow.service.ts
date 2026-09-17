import mongoose from "mongoose";
import Follow from "../models/follow.model";
import { decodeCursor, encodeCursor } from "../utils/cursor";
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

export interface FollowUserItem {
  _id: string;
  name?: string;
  username: string;
  bio?: string;
  profilePicUrl?: string;
  followersCount: number;
  isFollowing: boolean;
  followedAt: Date;
}

export interface PaginatedFollowUsersResult {
  data: FollowUserItem[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
    totalCount: number;
  };
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

  async getFollowers(
    targetUserId: string,
    viewerId?: string,
    limit: number = 10,
    cursor?: string,
    searchQuery?: string
  ): Promise<PaginatedFollowUsersResult> {
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new Error("Invalid User ID format");
    }

    const targetUser = await this.userRepo.findById(targetUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    let follows: any[];
    let totalCount = 0;
    const trimmedQuery = searchQuery?.trim();

    if (trimmedQuery) {
      const escapedSearch = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedSearch, "i");

      const matchStage: any = {
        following: new mongoose.Types.ObjectId(targetUserId),
      };

      if (cursor) {
        const decoded = decodeCursor(cursor);
        if (decoded) {
          const cursorDate = new Date(decoded.createdAt);
          matchStage.$or = [
            { createdAt: { $lt: cursorDate } },
            {
              createdAt: cursorDate,
              _id: { $lt: new mongoose.Types.ObjectId(decoded.id) },
            },
          ];
        }
      }

      const pipeline: any[] = [
        { $match: matchStage },
        { $sort: { createdAt: -1, _id: -1 } },
        {
          $lookup: {
            from: "users",
            localField: "follower",
            foreignField: "_id",
            as: "follower",
          },
        },
        { $unwind: "$follower" },
        {
          $match: {
            $or: [
              { "follower.username": { $regex: regex } },
              { "follower.name": { $regex: regex } },
            ],
          },
        },
        { $limit: limit + 1 },
      ];

      [follows, totalCount] = await Promise.all([
        Follow.aggregate(pipeline).exec(),
        Follow.countDocuments({ following: targetUserId }),
      ]);
    } else {
      const query: any = { following: targetUserId };

      if (cursor) {
        const decoded = decodeCursor(cursor);
        if (decoded) {
          const cursorDate = new Date(decoded.createdAt);
          query.$or = [
            { createdAt: { $lt: cursorDate } },
            { createdAt: cursorDate, _id: { $lt: decoded.id } },
          ];
        }
      }

      [follows, totalCount] = await Promise.all([
        Follow.find(query)
          .sort({ createdAt: -1, _id: -1 })
          .limit(limit + 1)
          .populate("follower", "name username bio profilePicUrl followersCount")
          .exec(),
        Follow.countDocuments({ following: targetUserId }),
      ]);
    }

    const hasMore = follows.length > limit;
    const items = follows.slice(0, limit);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      const createdAtDate =
        last.createdAt instanceof Date
          ? last.createdAt
          : new Date(last.createdAt);
      nextCursor = encodeCursor({
        createdAt: createdAtDate.toISOString(),
        id: last._id.toString(),
      });
    }

    const followerUsers = items
      .map((item) => ({
        user: item.follower as any,
        followedAt: item.createdAt,
      }))
      .filter((entry) => entry.user && entry.user._id);

    const followerIds = followerUsers.map((entry) => entry.user._id.toString());
    const followedSet = new Set<string>();

    if (viewerId && followerIds.length > 0) {
      const followedDocs = await this.followRepo.findFollowingIn(viewerId, followerIds);
      followedDocs.forEach((doc: any) => {
        followedSet.add(doc.following.toString());
      });
    }

    const data: FollowUserItem[] = followerUsers.map(({ user, followedAt }) => {
      const uObj = user.toObject ? user.toObject() : user;
      const uId = uObj._id.toString();
      return {
        _id: uId,
        name: uObj.name,
        username: uObj.username,
        bio: uObj.bio,
        profilePicUrl: uObj.profilePicUrl,
        followersCount: uObj.followersCount ?? 0,
        isFollowing: viewerId ? (viewerId === uId ? false : followedSet.has(uId)) : false,
        followedAt,
      };
    });

    return {
      data,
      pagination: {
        hasMore,
        nextCursor,
        totalCount,
      },
    };
  }

  async getFollowing(
    targetUserId: string,
    viewerId?: string,
    limit: number = 10,
    cursor?: string,
    searchQuery?: string
  ): Promise<PaginatedFollowUsersResult> {
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new Error("Invalid User ID format");
    }

    const targetUser = await this.userRepo.findById(targetUserId);
    if (!targetUser) {
      throw new Error("User not found");
    }

    let follows: any[];
    let totalCount = 0;
    const trimmedQuery = searchQuery?.trim();

    if (trimmedQuery) {
      const escapedSearch = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(escapedSearch, "i");

      const matchStage: any = {
        follower: new mongoose.Types.ObjectId(targetUserId),
      };

      if (cursor) {
        const decoded = decodeCursor(cursor);
        if (decoded) {
          const cursorDate = new Date(decoded.createdAt);
          matchStage.$or = [
            { createdAt: { $lt: cursorDate } },
            {
              createdAt: cursorDate,
              _id: { $lt: new mongoose.Types.ObjectId(decoded.id) },
            },
          ];
        }
      }

      const pipeline: any[] = [
        { $match: matchStage },
        { $sort: { createdAt: -1, _id: -1 } },
        {
          $lookup: {
            from: "users",
            localField: "following",
            foreignField: "_id",
            as: "following",
          },
        },
        { $unwind: "$following" },
        {
          $match: {
            $or: [
              { "following.username": { $regex: regex } },
              { "following.name": { $regex: regex } },
            ],
          },
        },
        { $limit: limit + 1 },
      ];

      [follows, totalCount] = await Promise.all([
        Follow.aggregate(pipeline).exec(),
        Follow.countDocuments({ follower: targetUserId }),
      ]);
    } else {
      const query: any = { follower: targetUserId };

      if (cursor) {
        const decoded = decodeCursor(cursor);
        if (decoded) {
          const cursorDate = new Date(decoded.createdAt);
          query.$or = [
            { createdAt: { $lt: cursorDate } },
            { createdAt: cursorDate, _id: { $lt: decoded.id } },
          ];
        }
      }

      [follows, totalCount] = await Promise.all([
        Follow.find(query)
          .sort({ createdAt: -1, _id: -1 })
          .limit(limit + 1)
          .populate("following", "name username bio profilePicUrl followersCount")
          .exec(),
        Follow.countDocuments({ follower: targetUserId }),
      ]);
    }

    const hasMore = follows.length > limit;
    const items = follows.slice(0, limit);

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      const last = items[items.length - 1];
      const createdAtDate =
        last.createdAt instanceof Date
          ? last.createdAt
          : new Date(last.createdAt);
      nextCursor = encodeCursor({
        createdAt: createdAtDate.toISOString(),
        id: last._id.toString(),
      });
    }

    const followingUsers = items
      .map((item) => ({
        user: item.following as any,
        followedAt: item.createdAt,
      }))
      .filter((entry) => entry.user && entry.user._id);

    const followingIds = followingUsers.map((entry) => entry.user._id.toString());
    const followedSet = new Set<string>();

    if (viewerId && followingIds.length > 0) {
      const followedDocs = await this.followRepo.findFollowingIn(viewerId, followingIds);
      followedDocs.forEach((doc: any) => {
        followedSet.add(doc.following.toString());
      });
    }

    const data: FollowUserItem[] = followingUsers.map(({ user, followedAt }) => {
      const uObj = user.toObject ? user.toObject() : user;
      const uId = uObj._id.toString();
      return {
        _id: uId,
        name: uObj.name,
        username: uObj.username,
        bio: uObj.bio,
        profilePicUrl: uObj.profilePicUrl,
        followersCount: uObj.followersCount ?? 0,
        isFollowing: viewerId ? (viewerId === uId ? false : followedSet.has(uId)) : false,
        followedAt,
      };
    });

    return {
      data,
      pagination: {
        hasMore,
        nextCursor,
        totalCount,
      },
    };
  }
}

export const followService = new FollowService();
export const toggleFollow = (followerId: string, followingId: string) =>
  followService.toggleFollow(followerId, followingId);
export const getFollowers = (
  targetUserId: string,
  viewerId?: string,
  limit?: number,
  cursor?: string,
  searchQuery?: string
) => followService.getFollowers(targetUserId, viewerId, limit, cursor, searchQuery);
export const getFollowing = (
  targetUserId: string,
  viewerId?: string,
  limit?: number,
  cursor?: string,
  searchQuery?: string
) => followService.getFollowing(targetUserId, viewerId, limit, cursor, searchQuery);

