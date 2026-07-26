import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config/env";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const decodedToken = jwt.verify(token, config.jwtSecret);

    req.user = decodedToken as { id: string };

    next();
  } catch (error: any) {
    return res.status(401).json({ message: error.message || "Internal server error" });
  }
};
