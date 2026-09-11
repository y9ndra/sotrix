import { createClient } from "redis";
import { logger } from "./logger";

const rawRedisUrl = (process.env.REDIS_URL || "redis://localhost:6379")
  .trim()
  .replace(/^["']|["']$/g, "");

if (rawRedisUrl.startsWith("https://") || rawRedisUrl.startsWith("http://")) {
  throw new Error(
    "Invalid REDIS_URL: Detected an HTTP/HTTPS protocol. " +
      "If using Upstash, do NOT use the REST API URL (https://...). " +
      "Instead, copy the Redis connection URI (rediss://default:<password>@<host>.upstash.io:6379) from the 'Connect' / 'ioredis' tab in Upstash."
  );
}

const redisClient = createClient({
  url: rawRedisUrl,
});

redisClient.on("error", (err) => {
  logger.error(err, "Redis Client Error");
});

export const connectRedis = async () => {
  await redisClient.connect();
  logger.info("Redis connected successfully");
};

export default redisClient;
