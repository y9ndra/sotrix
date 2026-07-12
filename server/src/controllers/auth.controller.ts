import { Request, Response } from "express";
import User from "../models/user";

interface SignupBody {
  username: string;
  email: string;
  password: string;
}

export const signup = async (req: Request<{}, {}, SignupBody>, res: Response): Promise<any> => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }


    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "User with this email or username already exists" });
    }

    const newUser = await User.create({
      username,
      email,
      password,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ message: error.message || "Internal server error" });
  }
};