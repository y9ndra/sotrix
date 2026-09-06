import rateLimit from "express-rate-limit";
import { Request } from "express";

const isTest = process.env.NODE_ENV === "test" || process.env.DISABLE_RATE_LIMIT === "true";

/**
 * Tier 1: Global IP-based rate limiter
 * Applied globally to all routes.
 * Protects against unauthenticated volumetric floods and bot crawlers.
 * Skips health checks so orchestrators/monitoring aren't blocked.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: isTest ? 100_000 : 1500, // 1,500 req / 15 min per IP (~100 req/min)
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skip: (req: Request) => req.path === "/health" || req.path === "/",
  message: {
    success: false,
    message: "Too many requests from this IP address. Please try again after 15 minutes.",
  },
});

/**
 * Tier 3: User-specific rate limiter for write/mutation actions (Likes, Follows, etc.)
 * Applied AFTER `authenticate` middleware so req.user.id is available.
 * Rate-limits by User ID (not just IP), preventing spammers rotating IPs.
 */
export const userActionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: isTest ? 10_000 : 60, // 60 actions per minute per user
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return req.user?.id || req.ip || "anonymous";
  },
  message: {
    success: false,
    message: "You are performing actions too quickly. Please wait a moment.",
  },
});

/**
 * Tier 3: Strict user-specific limiter for creating new content (Posts, Comments)
 * Prevents spam bots from flooding the feed and database.
 */
export const userCreateContentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: isTest ? 10_000 : 15, // Max 15 posts/comments per minute per user
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    return req.user?.id || req.ip || "anonymous";
  },
  message: {
    success: false,
    message: "You are posting content too quickly. Please wait a minute before posting again.",
  },
});
