import { Request, Response, NextFunction } from "express";
import {
  toggleFollow as toggleFollowService,
  followService,
} from "../services/follow.service";
import { IdParam, PaginationQuery, FollowListQuery } from "../schemas/common.schema";
import { addNotificationJob } from "../jobs/notification.job";
import { removeNotification } from "../services/notification.service";

export const toggleFollow = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const targetUserId = req.params.id;
    const followerId = req.user?.id;

    if (!followerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await toggleFollowService(followerId, targetUserId);

    if (result.following) {
      await addNotificationJob({
        recipientId: targetUserId,
        actorId: followerId,
        type: "follow",
      }).catch((err) => {
        console.error("Failed to queue follow notification job:", err);
      });
    } else {
      await removeNotification(targetUserId, followerId, "follow").catch((err) => {
        console.error("Failed to remove follow notification:", err);
      });
    }

    return res.status(200).json({
      success: true,
      message: result.following
        ? "Successfully followed user"
        : "Successfully unfollowed user",
      data: result,
      following: result.following,
      followersCount: result.followersCount,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: error.message });
      }
      if (
        error.message === "You cannot follow yourself" ||
        error.message === "Invalid User ID format"
      ) {
        return res.status(400).json({ message: error.message });
      }
    }
    return next(error);
  }
};

export const getFollowers = async (
  req: Request<IdParam, {}, {}, any>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const targetUserId = req.params.id;
    const viewerId = req.user?.id;
    const { limit, cursor, q } = req.query as FollowListQuery;

    const result = await followService.getFollowers(
      targetUserId,
      viewerId,
      limit ? Number(limit) : 10,
      cursor,
      q
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Invalid User ID format") {
        return res.status(400).json({ message: error.message });
      }
    }
    return next(error);
  }
};

export const getFollowing = async (
  req: Request<IdParam, {}, {}, any>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const targetUserId = req.params.id;
    const viewerId = req.user?.id;
    const { limit, cursor, q } = req.query as FollowListQuery;

    const result = await followService.getFollowing(
      targetUserId,
      viewerId,
      limit ? Number(limit) : 10,
      cursor,
      q
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Invalid User ID format") {
        return res.status(400).json({ message: error.message });
      }
    }
    return next(error);
  }
};

