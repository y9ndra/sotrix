import { Request, Response, NextFunction } from "express";
import { createPost as createPostService } from "../services/post.service";

interface CreatePostBody {
  content?: string;
}

export const createPost = async (
  req: Request<{}, {}, CreatePostBody>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { content } = req.body;
    const author = req.user?.id;

    if (!author) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Post content is required" });
    }

    const post = await createPostService({
      content: content.trim(),
      author,
    });

    return res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error) {
    next(error);
  }
};
