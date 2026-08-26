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
  });

  const accessToken = generateAccessToken(userId);

  return {
    token: accessToken,
    refreshToken,
    user: {
      id: userId,
      username: user.username,
      email: user.email,
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

  // Check reuse of a previously rotated token
  if (session.previousRefreshTokenHash === incomingTokenHash) {
    // Suspected token theft or duplicate reuse -> Revoke/delete the entire session
    await Session.findByIdAndDelete(session._id);
    throw new Error("Refresh token reuse detected");
  }

  // Check if incoming matches the current active token
  if (session.refreshTokenHash !== incomingTokenHash) {
    throw new Error("Invalid refresh token");
  }

  /*
    Generate a NEW refresh token.
    This is refresh token rotation.
  */
  const newRefreshToken = generateRefreshToken(
    payload.userId,
    session._id.toString()
  );

  const newRefreshTokenHash = hashToken(newRefreshToken);

  /*
    Replace the old hash and save the previous one to allow reuse detection.
  */
  session.previousRefreshTokenHash = session.refreshTokenHash;
  session.refreshTokenHash = newRefreshTokenHash;

  await session.save();

  const accessToken = generateAccessToken(payload.userId);

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
};
