import { Request, Response, NextFunction } from "express";
import {
  getExplorePosts as getExplorePostsService,
  getSuggestedUsers as getSuggestedUsersService,
} from "../services/explore.service";

export const getExplorePosts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      50
    );
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    const result = await getExplorePostsService(currentUserId, limit, cursor);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getSuggestedUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      50
    );
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    const result = await getSuggestedUsersService(currentUserId, limit, cursor);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
