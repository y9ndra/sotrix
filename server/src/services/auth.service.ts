import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Session from "../models/session.model";
import { userRepository } from "../repositories";
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
  const { name, username, email, password } = input;

  if (!password) {
    throw new Error("Password is required");
  }

  const normalizedUsername = username.trim().toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  const displayName = name?.trim() || normalizedUsername;

  // Check if username or email already exists
  const existingUser = await userRepository.findByEmailOrUsername(
    normalizedEmail,
    normalizedUsername
  );

  if (existingUser) {
    throw new Error("User with this email or username already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await userRepository.create({
    name: displayName,
    username: normalizedUsername,
    email: normalizedEmail,
    password: hashedPassword,
  });

  return {
    user: {
      id: (newUser._id as any).toString(),
      name: newUser.name,
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

  const user = await userRepository.findByEmailOrUsername(normalizedIdentifier);

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

  const isDemo = Boolean(
    user.isDemo ||
    user.email === "demo@sotrix.dev" ||
    user.username === "demo"
  );

  if (isDemo && !user.isDemo) {
    user.isDemo = true;
    await user.save();
  }

  const accessToken = generateAccessToken(userId, isDemo);

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
      isDemo,
    },
  };
};

export const getUserProfile = async (userId: string): Promise<AuthUser> => {
  const user = await userRepository.findById(userId, { select: "-password" });

  if (!user) {
    throw new Error("User not found");
  }

  const isDemo = Boolean(
    user.isDemo ||
    user.email === "demo@sotrix.dev" ||
    user.username === "demo"
  );

  return {
    id: (user._id as any).toString(),
    username: user.username,
    email: user.email,
    name: user.name,
    bio: user.bio,
    profilePicUrl: user.profilePicUrl,
    profilePicPublicId: user.profilePicPublicId,
    isDemo,
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

  const user = await userRepository.findById(payload.userId, { select: "isDemo email username" });
  const isDemo = user
    ? Boolean(user.isDemo || user.email === "demo@sotrix.dev" || user.username === "demo")
    : false;

  const accessToken = generateAccessToken(payload.userId, isDemo);

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
