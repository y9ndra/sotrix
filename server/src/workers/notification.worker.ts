import "dotenv/config";
import { connectDB } from "../config/db";
import { Worker } from "bullmq";
import { bullMQConnection } from "../config/bullmq-redis";
import { createNotification } from "../services/notification.service";
import type { NotificationJobData } from "../queues/notification.queue";

// Connect to MongoDB
connectDB().catch((err) => {
  console.error("Failed to connect to MongoDB in worker process:", err);
  process.exit(1);
});

export const notificationWorker = new Worker<NotificationJobData>(
  "notifications",
  async (job) => {
    console.log("Processing job:", job.id);
    const { recipientId, actorId, type, postId } = job.data;

    const notification = await createNotification({
      recipientId,
      actorId,
      type,
      postId,
    });

    if (notification) {
      console.log(`Notification created & emitted: ${notification._id}`);
    }

    return notification;
  },
  {
    connection: bullMQConnection,
    concurrency: 5,
  }
);

notificationWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed ✅`);
});

notificationWorker.on("failed", (job, error) => {
  console.error(`Job ${job?.id} failed ❌`, error);
});

console.log("Notification worker started 🚀");
