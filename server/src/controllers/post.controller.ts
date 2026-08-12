import { Request, Response, NextFunction } from "express";
import { uploadImage, deleteFromCloudinary } from "../services/cloudinary.service";
import {
  createPost as createPostService,
  getPosts as getPostsService,
  getMyPosts as getMyPostsService,
  getPostById as getPostByIdService,
  updatePost as updatePostService,
  deletePost as deletePostService,
  searchPostsService,
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
  const { content } = req.body;
  const author = req.user?.id;
  let imageUrl: string | undefined;
  let imagePublicId: string | undefined;

  if (!author) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ message: "Post content is required" });
  }

  try {
    if (req.file) {
      const uploadResult = await uploadImage(req.file.buffer);
      imageUrl = uploadResult.secure_url;
      imagePublicId = uploadResult.public_id;
    }

    const post = await createPostService({
      content: content.trim(),
      author,
      imageUrl,
      imagePublicId,
    });

    return res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error) {
    if (imagePublicId) {
      try {
        await deleteFromCloudinary(imagePublicId);
      } catch (cloudinaryError) {
        console.error("Failed to delete orphaned image from Cloudinary:", cloudinaryError);
      }
    }
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
    const currentUserId = req.user?.id;

    const result = await getPostsService(limit, cursor, currentUserId);

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

    const result = await getMyPostsService(userId, limit, cursor, userId);

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
    const currentUserId = req.user?.id;

    const post = await getPostByIdService(id, currentUserId);

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

export const searchPosts = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const query = req.query.q;

    if (typeof query !== "string" || !query.trim()) {
      return res.status(400).json({
        message: "Search query is required",
      });
    }

    const currentUserId = req.user?.id;

    const posts = await searchPostsService(
      query.trim(),
      currentUserId
    );

    return res.status(200).json({
      success: true,
      data: posts,
    });
  } catch (error) {
    next(error);
  }
};
