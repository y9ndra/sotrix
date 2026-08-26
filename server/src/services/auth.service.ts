import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/user.model";
import Session from "../models/session.model";
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
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
