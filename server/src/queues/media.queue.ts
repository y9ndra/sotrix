import { Queue } from "bullmq";
import { bullMQConnection } from "../config/bullmq-redis";

export interface ProcessMediaJobData {
  mediaId: string;
}

export const mediaQueue = new Queue<ProcessMediaJobData>(
  "media",
  {
    connection: bullMQConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: {
        count: 1000,
      },
      removeOnFail: {
        count: 5000,
      },
    },
  }
);

export const addMediaProcessingJob = (mediaId: string) => {
  return mediaQueue.add(
    "process-media",
    { mediaId },
    {
      jobId: `process-media-${mediaId}`,
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    }
  );
};
