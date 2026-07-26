import { Request, Response, NextFunction } from "express";
import * as authService from "../services/auth.service";

interface SignupBody {
  username?: string;
  email?: string;
  password?: string;
}

interface LoginBody {
  identifier?: string;
  password?: string;
}

export const signup = async (
  req: Request<{}, {}, SignupBody>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

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
  req: Request<{}, {}, LoginBody>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const result = await authService.loginUser({ identifier, password });

    return res.status(200).json({
      success: true,
      message: "User logged in successfully",
      token: result.token,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message.includes("does not exist") ||
        error.message === "Invalid password"
      ) {
        return res.status(400).json({ message: error.message });
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