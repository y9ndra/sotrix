import { Request, Response, NextFunction } from "express";
import { toggleLike as toggleLikeService } from "../services/like.service";
import { PostIdParam } from "../schemas/common.schema";
import { addNotificationJob } from "../jobs/notification.job";
import { removeNotification } from "../services/notification.service";

export const toggleLike = async (
  req: Request<PostIdParam>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { postId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await toggleLikeService(userId, postId);

    if (
      result.liked &&
      result.postAuthorId !== userId
    ) {
      await addNotificationJob({
        recipientId: result.postAuthorId,
        actorId: userId,
        type: "like",
        postId,
      });
    } else if (
      !result.liked &&
      result.postAuthorId !== userId
    ) {
      await removeNotification(result.postAuthorId, userId, "like", postId);
    }

    return res.status(200).json({
      success: true,
      liked: result.liked,
      likeCount: result.likeCount,
    });
  } catch (error) {
    next(error);
  }
};
