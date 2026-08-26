import jwt from "jsonwebtoken";
import crypto from "crypto";

export const hashToken = (token: string): string => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

export const generateAccessToken = (
  userId: string
): string => {
  return jwt.sign(
    {
      id: userId,
      userId,
    },
    process.env.JWT_ACCESS_SECRET as string,
    {
      expiresIn: "15m",
    }
  );
};

export const generateRefreshToken = (
  userId: string,
  sessionId: string
): string => {
  return jwt.sign(
    {
      userId,
      sessionId,
    },
    process.env.JWT_REFRESH_SECRET as string,
    {
      expiresIn: "7d",
    }
  );
};
