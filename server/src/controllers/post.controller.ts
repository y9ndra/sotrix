import { Request, Response, NextFunction } from "express";
import {
  createPost as createPostService,
  getPosts as getPostsService,
  getMyPosts as getMyPostsService,
  getPostById as getPostByIdService,
  updatePost as updatePostService,
  deletePost as deletePostService,
} from "../services/post.service";

interface CreatePostBody {
  content?: string;
}

interface UpdatePostBody {
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

export const getPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      50
    );
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    const result = await getPostsService(limit, cursor);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const limit = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      50
    );
    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    const result = await getMyPostsService(userId, limit, cursor);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
};

export const getPostById = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;

    const post = await getPostByIdService(id);

    return res.status(200).json({
      success: true,
      data: post,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Post not found") {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const updatePost = async (
  req: Request<{ id: string }, {}, UpdatePostBody>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Content is required" });
    }

    const updatedPost = await updatePostService(id, userId, content.trim());

    return res.status(200).json({
      success: true,
      data: updatedPost,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Post not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("not authorized")) {
        return res.status(403).json({ message: error.message });
      }
    }
    next(error);
  }
};

export const deletePost = async (
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await deletePostService(id, userId);

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Post not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("not authorized")) {
        return res.status(403).json({ message: error.message });
      }
    }
    next(error);
  }
};
