import dotenv from "dotenv";

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("FATAL: JWT_SECRET environment variable is missing!");
}

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || jwtSecret;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;

const mongoUrl =
  process.env.DATABASE_URL ||
  process.env.MONGO_URI ||
  "mongodb://localhost:27017/sotrix";

export const allowedOrigins = Array.from(
  new Set([
    ...(process.env.CLIENT_URL || "")
      .split(",")
      .map((url) => url.trim().replace(/\/+$/, ""))
      .filter(Boolean),
    "http://localhost:3000",
    "http://localhost:5173",
  ])
);

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  mongoUrl: mongoUrl,
  jwtSecret: jwtSecret,
  JWT_ACCESS_SECRET: jwtAccessSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
  allowedOrigins,
};

// Validate that important database URL exists
if (!process.env.DATABASE_URL && !process.env.MONGO_URI) {
  console.warn("WARNING: Neither DATABASE_URL nor MONGO_URI is set in environment variables. Falling back to localhost.");
}

