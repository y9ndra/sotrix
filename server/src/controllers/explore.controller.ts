import { Request, Response, NextFunction } from "express";
import {
  getExplorePosts as getExplorePostsService,
  getSuggestedUsers as getSuggestedUsersService,
} from "../services/explore.service";
import { PaginationQuery } from "../schemas/common.schema";

export const getExplorePosts = async (
  req: Request<{}, {}, {}, any>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { limit, cursor } = req.query as PaginationQuery;

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
  req: Request<{}, {}, {}, any>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const currentUserId = req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { limit, cursor } = req.query as PaginationQuery;

    const result = await getSuggestedUsersService(currentUserId, limit, cursor);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
