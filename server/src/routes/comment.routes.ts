import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { userCreateContentLimiter } from "../middleware/rateLimiter";
import { validate } from "../middleware/validate";
import { createCommentSchema, updateCommentSchema } from "../schemas/comment.schema";
import { idParamSchema, postIdParamSchema, paginationQuerySchema } from "../schemas/common.schema";
import {
  createComment,
  getCommentsForPost,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller";

const router = Router();

// Create comment for a post (Authenticated + User Rate Limited)
router.post("/posts/:postId/comments", authenticate, userCreateContentLimiter, validate(postIdParamSchema, "params"), validate(createCommentSchema, "body"), createComment);

// Get comments for a post
router.get("/posts/:postId/comments", validate(postIdParamSchema, "params"), validate(paginationQuerySchema, "query"), getCommentsForPost);

// Update comment (Authenticated + Authorized)
router.patch("/comments/:id", authenticate, validate(idParamSchema, "params"), validate(updateCommentSchema, "body"), updateComment);

// Delete comment (Authenticated + Authorized)
router.delete("/comments/:id", authenticate, validate(idParamSchema, "params"), deleteComment);

export default router;
