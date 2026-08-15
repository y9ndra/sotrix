import { Request, Response, NextFunction } from "express";
import {
  createComment as createCommentService,
  getCommentsForPost as getCommentsForPostService,
  updateComment as updateCommentService,
  deleteComment as deleteCommentService,
} from "../services/comment.service";
import { CreateCommentInput, UpdateCommentInput } from "../schemas/comment.schema";
import { IdParam, PostIdParam, PaginationQuery } from "../schemas/common.schema";

export const createComment = async (
  req: Request<PostIdParam, {}, CreateCommentInput>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const author = req.user?.id;

    if (!author) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const comment = await createCommentService({
      content,
      author,
      post: postId,
    });

    return res.status(201).json({
      success: true,
      data: comment,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Post not found") {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const getCommentsForPost = async (
  req: Request<PostIdParam, {}, {}, any>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { postId } = req.params;
    const { limit, cursor } = req.query as PaginationQuery;

    const result = await getCommentsForPostService(postId, limit, cursor);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Post not found") {
      return res.status(404).json({ message: error.message });
    }
    next(error);
  }
};

export const updateComment = async (
  req: Request<IdParam, {}, UpdateCommentInput>,
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

    if (!content) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const updatedComment = await updateCommentService(id, userId, content);

    return res.status(200).json({
      success: true,
      data: updatedComment,
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Comment not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("not authorized")) {
        return res.status(403).json({ message: error.message });
      }
    }
    next(error);
  }
};

export const deleteComment = async (
  req: Request<IdParam>,
  res: Response,
  next: NextFunction
): Promise<any> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await deleteCommentService(id, userId);

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Comment not found") {
        return res.status(404).json({ message: error.message });
      }
      if (error.message.includes("not authorized")) {
        return res.status(403).json({ message: error.message });
      }
    }
    next(error);
  }
};
