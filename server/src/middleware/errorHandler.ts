import { Request, Response, NextFunction } from "express";
import multer from "multer";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  console.error("Unhandled error:", err);

  // Handle Multer specific errors
  if (err instanceof multer.MulterError) {
    let message = err.message;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File is too large. Maximum size is 5MB.";
    }
    return res.status(400).json({
      message,
    });
  }

  // Handle custom upload errors
  if (err instanceof Error && err.message === "Only image files are allowed") {
    return res.status(400).json({
      message: err.message,
    });
  }

  const message = err instanceof Error ? err.message : "Internal server error";

  return res.status(500).json({
    message,
  });
};
