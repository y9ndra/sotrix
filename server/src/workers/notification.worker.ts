import "dotenv/config";
import { connectDB } from "../config/db";
import { Worker } from "bullmq";
import { bullMQConnection } from "../config/bullmq-redis";
import { logger } from "../config/logger";
import { createNotification } from "../services/notification.service";
import type { NotificationJobData } from "../queues/notification.queue";

// Connect to MongoDB
connectDB().catch((err) => {
  logger.error(err, "Failed to connect to MongoDB in worker process");
  process.exit(1);
});

export const notificationWorker = new Worker<NotificationJobData>(
  "notifications",
  async (job) => {
    logger.debug({ jobId: job.id }, "Processing notification job");
    const { recipientId, actorId, type, postId } = job.data;

    const notification = await createNotification({
      recipientId,
      actorId,
      type,
      postId,
    });

    if (notification) {
      logger.info({ notificationId: notification._id }, "Notification created and emitted");
    }

    return notification;
  },
  {
    connection: bullMQConnection,
    concurrency: 5,
  }
);

notificationWorker.on("completed", (job) => {
  logger.info({ jobId: job.id }, "Notification job completed ✅");
});

notificationWorker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, err: error }, "Notification job failed ❌");
});

logger.info("Notification worker started 🚀");
