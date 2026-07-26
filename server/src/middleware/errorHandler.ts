import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  console.error("Unhandled error:", err);

  const message = err instanceof Error ? err.message : "Internal server error";

  return res.status(500).json({
    message,
  });
};
