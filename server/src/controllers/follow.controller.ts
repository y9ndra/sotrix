import { Request, Response, NextFunction } from "express";
import { toggleFollow as toggleFollowService } from "../services/follow.service";
import { IdParam } from "../schemas/common.schema";
import { addNotificationJob } from "../jobs/notification.job";

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

    if (!targetUserId) {
      return res.status(400).json({ message: "Target user ID is required" });
    }

    const result = await toggleFollowService(followerId, targetUserId);

    if (result.following) {
      await addNotificationJob({
        recipientId: targetUserId,
        actorId: followerId,
        type: "follow",
      });
    }

    return res.status(200).json({
      success: true,
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
