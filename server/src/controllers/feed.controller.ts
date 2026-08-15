import { Request, Response, NextFunction } from "express";
import { getHomeFeed as getHomeFeedService } from "../services/feed.service";
import { PaginationQuery } from "../schemas/common.schema";

export const getHomeFeed = async (
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

    const result = await getHomeFeedService(currentUserId, limit, cursor);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};
