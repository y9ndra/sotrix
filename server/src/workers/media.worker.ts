import { Worker } from "bullmq";
import { bullMQConnection } from "../config/bullmq-redis";
import { logger } from "../config/logger";
import Media from "../models/media.model";
import { processMedia } from "../services/media-processing.service";
import type { ProcessMediaJobData } from "../queues/media.queue";

export const mediaWorker = new Worker<ProcessMediaJobData>(
  "media",
  async (job) => {
    const { mediaId } = job.data;
    logger.debug({ jobId: job.id, mediaId }, "Processing media job");

    try {
      const media = await processMedia(mediaId);
      logger.info({ jobId: job.id, mediaId }, "Media processed successfully ✅");
      return { mediaId, status: media.status };
    } catch (error) {
      logger.error({ jobId: job.id, mediaId, err: error }, "Failed to process media");

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
  logger.info({ jobId: job.id }, "Media job completed");
});

mediaWorker.on("failed", (job, error) => {
  logger.error({ jobId: job?.id, err: error }, "Media job failed");
});

logger.info("Media worker started 🚀");
