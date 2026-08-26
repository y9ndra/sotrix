import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";
import { SignupInput, LoginInput } from "../schemas/auth.schema";
import { config } from "../config/env";

const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: config.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/auth",
};

export const signup = async (
  req: Request<{}, {}, SignupInput>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { username, email, password } = req.body;

    const result = await authService.signupUser({ username, email, password });

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

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return next(error);
  }
};