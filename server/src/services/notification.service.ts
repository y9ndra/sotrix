import Notification, { INotification } from "../models/notification.model";
import { decodeCursor, encodeCursor } from "../utils/cursor";
import { emitToUser } from "../socket/socket.manager";

export interface CreateNotificationInput {
  recipientId: string;
  actorId: string;
  type: "like" | "comment" | "follow";
  postId?: string;
}

export const createNotification = async ({
  recipientId,
  actorId,
  type,
  postId,
}: CreateNotificationInput): Promise<INotification | null> => {
  if (recipientId.toString() === actorId.toString()) {
    return null;
  }

  const notification = await Notification.create({
    recipient: recipientId,
    actor: actorId,
    type,
    post: postId,
  });

  await notification.populate("actor", "name username email profilePicUrl");

  try {
    emitToUser(
      recipientId.toString(),
      "notification:new",
      notification
    );
  } catch (error) {
    console.error("Failed to emit real-time notification:", error);
  }

  return notification;
};

export interface PaginatedNotificationsResult {
  data: INotification[];
  pagination: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export const getNotifications = async (
  userId: string,
  limit: number = 10,
  cursor?: string
): Promise<PaginatedNotificationsResult> => {
  const query: any = { recipient: userId };

  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (decoded) {
      const cursorDate = new Date(decoded.createdAt);
      query.$or = [
        {
          createdAt: {
            $lt: cursorDate,
          },
        },
        {
          createdAt: cursorDate,
          _id: {
            $lt: decoded.id,
          },
        },
      ];
    }
  }

  const notifications = await Notification.find(query)
    .populate("actor", "name username email profilePicUrl")
    .sort({
      createdAt: -1,
      _id: -1,
    })
    .limit(limit + 1);

  const hasMore = notifications.length > limit;
  const data = notifications.slice(0, limit);

  let nextCursor: string | null = null;
  if (hasMore && data.length > 0) {
    const lastNotification = data[data.length - 1];
    nextCursor = encodeCursor({
      createdAt: (lastNotification.createdAt as Date).toISOString(),
      id: lastNotification._id.toString(),
    });
  }

  return {
    data,
    pagination: {
      hasMore,
      nextCursor,
    },
  };
};

export const getUnreadCount = async (userId: string): Promise<number> => {
  return Notification.countDocuments({
    recipient: userId,
    read: false,
  });
};

export const markNotificationAsRead = async (
  notificationId: string,
  userId: string
): Promise<INotification | null> => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: userId,
    },
    {
      $set: { read: true },
    },
    {
      returnDocument: "after",
    }
  );

  return notification;
};

export const markAllNotificationsAsRead = async (
  userId: string
): Promise<void> => {
  await Notification.updateMany(
    {
      recipient: userId,
      read: false,
    },
    {
      $set: { read: true },
    }
  );
};
