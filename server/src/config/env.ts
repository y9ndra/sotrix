import dotenv from "dotenv";

dotenv.config();

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  throw new Error("FATAL: JWT_SECRET environment variable is missing!");
}

const jwtAccessSecret = process.env.JWT_ACCESS_SECRET || jwtSecret;
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || jwtSecret;

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  mongoUrl: process.env.DATABASE_URL || "mongodb://localhost:27017/sotrix",
  jwtSecret: jwtSecret,
  JWT_ACCESS_SECRET: jwtAccessSecret,
  JWT_REFRESH_SECRET: jwtRefreshSecret,
  NODE_ENV: process.env.NODE_ENV || "development",
  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",
};

// Validate that important database URL exists
if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is not set in environment variables. Falling back to localhost.");
}

