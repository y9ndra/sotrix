import { Request, Response, NextFunction } from "express";
import { getUserById, updateUserProfile, searchUsersService } from "../services/user.service";
import { UpdateProfileInput } from "../schemas/user.schema";
import { IdParam, SearchQuery } from "../schemas/common.schema";

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
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Invalid User ID format") {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === "User not found") {
        return res.status(404).json({ message: error.message });
      }
    }
    return next(error);
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

    const updatedUser = await updateUserProfile(userId, req.body);

    return res.status(200).json({
      success: true,
      data: updatedUser,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Invalid User ID format") {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === "Username is already taken") {
        return res.status(400).json({ message: error.message });
      }
      if (error.message === "User not found") {
        return res.status(404).json({ message: error.message });
      }
    }
    return next(error);
  }
};

export const searchUsers = async (
  req: Request<{}, {}, {}, SearchQuery>,
  res: Response
): Promise<any> => {
  try {
    const { q } = req.query;
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const users = await searchUsersService(
      q,
      currentUserId
    );

    return res.status(200).json({
      users,
      success: true,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to search users",
    });
  }
};

