import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  mongoUrl: process.env.DATABASE_URL || "mongodb://localhost:27017/sotrix",
  jwtSecret: process.env.JWT_SECRET || "supersecretjwtkeyforauth",
};

// Validate that important variables exist
if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is not set in environment variables. Falling back to localhost.");
}

if (!process.env.JWT_SECRET) {
  console.warn("WARNING: JWT_SECRET is not set in environment variables. Falling back to default secret.");
}
