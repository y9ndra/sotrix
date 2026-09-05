import { Worker } from "bullmq";
import { bullMQConnection } from "../config/bullmq-redis";
import Media from "../models/media.model";
import { processMedia } from "../services/media-processing.service";
import type { ProcessMediaJobData } from "../queues/media.queue";

export const mediaWorker = new Worker<ProcessMediaJobData>(
  "media",
  async (job) => {
    const { mediaId } = job.data;
    console.log(`[MEDIA WORKER] Processing job ${job.id} for media: ${mediaId}`);

    try {
      const media = await processMedia(mediaId);
      console.log(`[MEDIA WORKER] Media ${mediaId} processed successfully ✅`);
      return { mediaId, status: media.status };
    } catch (error) {
      console.error(`[MEDIA WORKER] Failed to process media ${mediaId}:`, error);

      // If all attempts are exhausted, mark media as failed in DB
      const maxAttempts = job.opts.attempts ?? 3;
      if (job.attemptsMade + 1 >= maxAttempts) {
        await Media.findByIdAndUpdate(mediaId, { status: "failed" });
      }

      // Re-throw so BullMQ triggers retry and backoff
      throw error;
    }
  },
  {
    connection: bullMQConnection,
    concurrency: 5,
  }
);

mediaWorker.on("completed", (job) => {
  console.log(`Media job ${job.id} completed`);
});

mediaWorker.on("failed", (job, error) => {
  console.error(`Media job ${job?.id} failed`, error);
});

console.log("Media worker started 🚀");
