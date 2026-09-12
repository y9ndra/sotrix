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
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        count: 50,
        age: 3600,
      },
      removeOnFail: {
        count: 100,
        age: 86400,
      },
    },
  }
);
