import IORedis from "ioredis";

const rawRedisUrl = (process.env.REDIS_URL || "redis://localhost:6379")
  .trim()
  .replace(/^["']|["']$/g, "");

export const bullMQConnection = new IORedis(
  rawRedisUrl,
  {
    maxRetriesPerRequest: null,
  }
);
