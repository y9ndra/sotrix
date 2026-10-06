import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import * as verificationService from "../services/verification.service";
import { SignupInput, LoginInput, VerifyEmailInput, ChangeEmailInput } from "../schemas/auth.schema";
import { userRepository } from "../repositories";
import EmailOtp from "../models/email-otp.model";
import { config } from "../config/env";
import { logger } from "../config/logger";

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: (config.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

export const signup = async (
  req: Request<{}, {}, SignupInput>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { name, username, email, password } = req.body;

    const result = await authService.signupUser({ name, username, email, password });

    logger.info(
      { userId: (result.user as any)._id || result.user.id, email: result.user.email },
      "User registered successfully"
    );

    return res.status(201).json({
      message: "User registered successfully",
      user: result.user,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return res.status(400).json({ message: error.message });
      }
    }
    return next(error);
  }
};

export const login = async (
  req: Request<{}, {}, LoginInput>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await authService.loginUser({ identifier, password });

    logger.info(
      { userId: (result.user as any)._id || result.user.id },
      "User logged in successfully"
    );

    res.cookie(
      "refreshToken",
      result.refreshToken,
      refreshTokenCookieOptions
    );

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      token: result.token,
      user: result.user,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message.includes("does not exist") ||
        error.message === "Invalid password"
      ) {
        return res.status(401).json({ message: error.message });
      }
    }
    return next(error);
  }
};

export const getMe = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No user identifier in token" });
    }

    const userProfile = await authService.getUserProfile(userId);

    return res.status(200).json({
      success: true,
      user: userProfile,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        return res.status(404).json({ message: error.message });
      }
    }
    return next(error);
  }
};

export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res
        .status(401)
        .json({ message: "Refresh token missing" });
    }

    const result =
      await authService.refreshAccessToken(refreshToken);

    logger.info("Access token refreshed successfully");

    res.cookie(
      "refreshToken",
      result.refreshToken,
      refreshTokenCookieOptions
    );

    return res.status(200).json({
      success: true,
      token: result.accessToken,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message === "Invalid refresh token" ||
        error.message === "Refresh session expired" ||
        error.message === "Refresh token reuse detected" ||
        error.message === "Refresh token already used"
      ) {
        return res
          .status(401)
          .json({ message: error.message });
      }
    }

    return next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await authService.logoutUser(refreshToken);
    }

    logger.info("User logged out successfully");

    res.clearCookie("refreshToken", {
      httpOnly: refreshTokenCookieOptions.httpOnly,
      secure: refreshTokenCookieOptions.secure,
      sameSite: refreshTokenCookieOptions.sameSite,
      path: refreshTokenCookieOptions.path,
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const verifyEmail = async (
  req: Request<{}, {}, VerifyEmailInput>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { otp } = req.body;
    const result = await verificationService.verifyOtp(userId, otp);

    logger.info({ userId }, "User email verified successfully");

    return res.status(200).json({
      success: true,
      message: result.message,
      user: result.user,
    });
  } catch (error: any) {
    if (
      error.message.includes("Invalid verification code") ||
      error.message.includes("expired") ||
      error.message.includes("Too many")
    ) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
};

export const resendOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    // Check if there is an active pending email in an existing OTP record
    const existingOtp = await EmailOtp.findOne({ userId });
    const targetEmail = existingOtp?.targetEmail || user.email;

    if (!targetEmail) {
      return res.status(400).json({ message: "No email address found to send verification code." });
    }

    await verificationService.generateAndSendOtp(userId, targetEmail, user.username);

    logger.info({ userId, targetEmail }, "Verification OTP resent");

    return res.status(200).json({
      success: true,
      message: `A new verification code has been sent to ${targetEmail}`,
      email: targetEmail,
    });
  } catch (error: any) {
    if (error.message.includes("Please wait")) {
      return res.status(429).json({ message: error.message });
    }
    return next(error);
  }
};

export const changeEmail = async (
  req: Request<{}, {}, ChangeEmailInput>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { newEmail, currentPassword } = req.body;
    const result = await verificationService.requestEmailUpdate(userId, currentPassword, newEmail);

    logger.info({ userId, newEmail }, "User requested email update & verification");

    return res.status(200).json({
      success: true,
      message: result.message,
      email: newEmail.trim().toLowerCase(),
    });
  } catch (error: any) {
    if (
      error.message.includes("already in use") ||
      error.message.includes("Incorrect current password") ||
      error.message.includes("valid email") ||
      error.message.includes("already verified") ||
      error.message.includes("Please wait")
    ) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
};