import "dotenv/config";
import { Worker } from "bullmq";
import { bullMQConnection } from "../config/bullmq-redis";
import type { NotificationJobData } from "../queues/notification.queue";

const notificationWorker = new Worker<NotificationJobData>(
  "notifications",
  async (job) => {
    console.log("Processing job:", job.id);

    console.log("Notification data:", job.data);

    // Simulate background work
    console.log(
      `Sending ${job.data.type} notification to ${job.data.recipientId}`
    );
  },
  {
    connection: bullMQConnection,
  }
);

notificationWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed ✅`);
});

notificationWorker.on("failed", (job, error) => {
  console.error(
    `Job ${job?.id} failed ❌`,
    error
  );
});

console.log("Notification worker started 🚀");
