import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/user.model";
import Session from "../models/session.model";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  verifyRefreshToken,
} from "../utils/token";
import { config } from "../config/env";
import { SignupInput, LoginInput } from "../schemas/auth.schema";
import {
  LoginServiceResult,
  SignupServiceResult,
  AuthUser,
} from "../types/auth.types";

export const signupUser = async (input: SignupInput): Promise<SignupServiceResult> => {
  const { username, email, password } = input;

  if (!password) {
    throw new Error("Password is required");
  }

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();

  // Check if username or email already exists
  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  });

  if (existingUser) {
    throw new Error("User with this email or username already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    password: hashedPassword,
  });

  return {
    user: {
      id: (newUser._id as any).toString(),
      username: newUser.username,
      email: newUser.email,
    },
  };
};

export const loginUser = async (input: LoginInput): Promise<LoginServiceResult> => {
  const { identifier, password } = input;

  if (!password) {
    throw new Error("Password is required");
  }

  const normalizedIdentifier = identifier.trim().toLowerCase();

  const user = await User.findOne({
    $or: [{ email: normalizedIdentifier }, { username: normalizedIdentifier }],
  });

  if (!user) {
    throw new Error("User with this email or username does not exist");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password!);

  if (!isPasswordValid) {
    throw new Error("Invalid password");
  }

  const userId = (user._id as any).toString();
  const sessionId = new mongoose.Types.ObjectId();

  const refreshToken = generateRefreshToken(userId, sessionId.toString());
  const refreshTokenHash = hashToken(refreshToken);

  await Session.create({
    _id: sessionId,
    user: user._id,
    refreshTokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    absoluteExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days absolute lifetime
  });

  const accessToken = generateAccessToken(userId);

  return {
    token: accessToken,
    refreshToken,
    user: {
      id: userId,
      username: user.username,
      email: user.email,
      name: user.name,
      bio: user.bio,
      profilePicUrl: user.profilePicUrl,
      profilePicPublicId: user.profilePicPublicId,
    },
  };
};

export const getUserProfile = async (userId: string): Promise<AuthUser> => {
  const user = await User.findById(userId).select("-password");

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: (user._id as any).toString(),
    username: user.username,
    email: user.email,
    name: user.name,
    bio: user.bio,
    profilePicUrl: user.profilePicUrl,
    profilePicPublicId: user.profilePicPublicId,
  };
};

export interface RefreshServiceResult {
  accessToken: string;
  refreshToken: string;
}

export const refreshAccessToken = async (
  refreshToken: string
): Promise<RefreshServiceResult> => {
  const payload = verifyRefreshToken(refreshToken);

  const incomingTokenHash = hashToken(refreshToken);

  // 1. Find the session to check its existence and expiration first
  const session = await Session.findOne({
    _id: payload.sessionId,
    user: payload.userId,
  });

  if (!session) {
    throw new Error("Invalid refresh token");
  }

  if (session.expiresAt <= new Date()) {
    await Session.findByIdAndDelete(session._id);
    throw new Error("Refresh session expired");
  }

  // Generate new token & hash for potential rotation
  const newRefreshToken = generateRefreshToken(
    payload.userId,
    session._id.toString()
  );
  const newRefreshTokenHash = hashToken(newRefreshToken);

  // Compute sliding expiration: +7 days, capped at absoluteExpiresAt
  const newExpiresAt = new Date(
    Math.min(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
      session.absoluteExpiresAt.getTime()
    )
  );

  // 2. Perform atomic compare-and-swap
  const updatedSession = await Session.findOneAndUpdate(
    {
      _id: payload.sessionId,
      user: payload.userId,
      refreshTokenHash: incomingTokenHash, // Only update if current hash matches incoming
    },
    {
      $set: {
        refreshTokenHash: newRefreshTokenHash,
        previousRefreshTokenHash: incomingTokenHash,
        expiresAt: newExpiresAt,
      },
    },
    {
      returnDocument: "after",
    }
  );

  // 3. Handle failure (potential concurrent request or reuse)
  if (!updatedSession) {
    const latestSession = await Session.findOne({
      _id: payload.sessionId,
      user: payload.userId,
    });

    if (!latestSession) {
      throw new Error("Invalid refresh token");
    }

    if (latestSession.previousRefreshTokenHash === incomingTokenHash) {
      throw new Error("Refresh token already used");
    }

    throw new Error("Invalid refresh token");
  }

  const accessToken = generateAccessToken(payload.userId);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};

export const logoutUser = async (
  refreshToken: string
): Promise<void> => {
  try {
    const payload = verifyRefreshToken(refreshToken);

    await Session.findOneAndDelete({
      _id: payload.sessionId,
      user: payload.userId,
    });
  } catch {
    /*
      Logout should be idempotent.
      Even if the refresh token is already
      invalid/expired, we still consider the
      user logged out.
    */
  }
};
