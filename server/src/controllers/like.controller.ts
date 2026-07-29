import { Request, Response, NextFunction } from "express";
import { toggleLike as toggleLikeService } from "../services/like.service";

export const toggleLike = async (
  req: Request<{ postId: string }>,
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

    return res.status(200).json({
      success: true,
      liked: result.liked,
      likeCount: result.likeCount,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Post not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message === "Invalid post ID") {
        return res.status(400).json({ message: error.message });
      }
    }
    next(error);
  }
};
