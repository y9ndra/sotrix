import { notificationQueue } from "../queues/notification.queue";
import type { NotificationJobData } from "../queues/notification.queue";

export const addNotificationJob = async (
  data: NotificationJobData
) => {
  return notificationQueue.add("send-notification", data);
};
