import { Request, Response, NextFunction } from "express";
import multer from "multer";
import { logger } from "../config/logger";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  // 1. Explicit AppError instance
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
    });
  }

  // 2. Multer file size / upload errors
  if (err instanceof multer.MulterError) {
    let message = err.message;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File is too large. Maximum size is 5MB.";
    }
    return res.status(400).json({
      message,
    });
  }

  // 3. Known domain & service error patterns
  if (err instanceof Error) {
    const msg = err.message;

    if (msg === "Only image files are allowed") {
      return res.status(400).json({ message: msg });
    }

    if (
      msg.endsWith("not found") ||
      msg === "Post not found" ||
      msg === "Comment not found" ||
      msg === "User not found"
    ) {
      return res.status(404).json({ message: msg });
    }

    if (
      msg.includes("not authorized") ||
      msg.includes("Unauthorized")
    ) {
      return res.status(403).json({ message: msg });
    }

    if (
      msg.startsWith("Invalid") ||
      msg === "Username is already taken" ||
      msg.includes("already exists") ||
      msg.includes("is required")
    ) {
      return res.status(400).json({ message: msg });
    }
  }

  // 4. Default unhandled server error
  logger.error(err, "Unhandled server error");
  const message = err instanceof Error ? err.message : "Internal server error";

  return res.status(500).json({
    message,
  });
};
