import { Request, Response, NextFunction } from "express";
import {
  getNotifications as getNotificationsService,
  getUnreadCount as getUnreadCountService,
  markNotificationAsRead as markNotificationAsReadService,
  markAllNotificationsAsRead as markAllNotificationsAsReadService,
} from "../services/notification.service";
import { PaginationQuery, IdParam } from "../schemas/common.schema";

export const getNotifications = async (
  req: Request<{}, {}, {}, any>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { limit, cursor } = req.query as PaginationQuery;
    const result = await getNotificationsService(userId, limit, cursor);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getUnreadCount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const count = await getUnreadCountService(userId);

    return res.status(200).json({
      success: true,
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id: notificationId } = req.params;
    const notification = await markNotificationAsReadService(
      notificationId,
      userId
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.status(200).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await markAllNotificationsAsReadService(userId);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    next(error);
  }
};
