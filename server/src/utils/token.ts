import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config/env";

interface RefreshTokenPayload {
  userId: string;
  sessionId: string;
}

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
    config.JWT_ACCESS_SECRET,
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
      jti: crypto.randomUUID(),
    },
    config.JWT_REFRESH_SECRET,
    {
      expiresIn: "7d",
    }
  );
};

export const verifyRefreshToken = (
  token: string
): RefreshTokenPayload => {
  return jwt.verify(
    token,
    config.JWT_REFRESH_SECRET
  ) as RefreshTokenPayload;
};
