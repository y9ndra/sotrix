import { Queue } from "bullmq";
import { bullMQConnection } from "../config/bullmq-redis";

export interface NotificationJobData {
  recipientId: string;
  actorId: string;
  type: "like" | "comment" | "follow";
  postId?: string;
}

export const notificationQueue = new Queue<NotificationJobData>(
  "notifications",
  {
    connection: bullMQConnection,
  }
);
