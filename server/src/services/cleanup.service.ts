import Notification from "../models/notification.model";

export const cleanupOldNotifications = async (): Promise<number> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  const result = await Notification.deleteMany({
    read: true,
    createdAt: {
      $lt: cutoffDate,
    },
  });

  return result.deletedCount;
};
