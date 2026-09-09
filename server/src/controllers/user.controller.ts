import { Request, Response, NextFunction } from "express";
import { getUserById, updateUserProfile, searchUsersService } from "../services/user.service";
import { UpdateProfileInput } from "../schemas/user.schema";
import { IdParam, SearchUsersQuery } from "../schemas/common.schema";

export const getUserProfile = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;

    const user = await getUserById(id, currentUserId);

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMyProfile = async (
  req: Request<{}, {}, UpdateProfileInput>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const file = req.file;
    const updatedUser = await updateUserProfile(userId, req.body, file?.buffer);

    return res.status(200).json({
      message: "Profile updated successfully",
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};

export const searchUsers = async (
  req: Request<{}, {}, {}, any>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { q, limit, cursor } = req.query as SearchUsersQuery;
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const result = await searchUsersService(q, currentUserId, limit, cursor);

    return res.status(200).json({
      success: true,
      data: result.data || result,
      pagination: result.pagination,
      users: result.data || result,
    });
  } catch (error) {
    next(error);
  }
};
