import { Request, Response } from "express";
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
  res: Response
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
  } catch (error: any) {
    const message = error.message || "Internal server error";
    
    // Map specific business validation errors to 400 status code
    if (message.includes("already exists")) {
      return res.status(400).json({ message });
    }
    
    return res.status(500).json({ message });
  }
};

export const login = async (
  req: Request<{}, {}, LoginBody>,
  res: Response
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
  } catch (error: any) {
    const message = error.message || "Internal server error";

    // Map login credentials errors to 400 status code
    if (message.includes("does not exist") || message === "Invalid password") {
      return res.status(400).json({ message });
    }

    return res.status(500).json({ message });
  }
};

export const getMe = async (req: Request, res: Response): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: No user identifier in token" });
    }

    const userProfile = await authService.getUserProfile(userId);

    return res.status(200).json({
      success: true,
      user: userProfile,
    });
  } catch (error: any) {
    const message = error.message || "Internal server error";

    if (message === "User not found") {
      return res.status(404).json({ message });
    }

    return res.status(500).json({ message });
  }
};