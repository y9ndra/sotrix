import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  createComment,
  getCommentsForPost,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller";

const router = Router();

// Create comment for a post (Authenticated)
router.post("/posts/:postId/comments", authenticate, createComment);

// Get comments for a post
router.get("/posts/:postId/comments", getCommentsForPost);

// Update comment (Authenticated + Authorized)
router.patch("/comments/:id", authenticate, updateComment);

// Delete comment (Authenticated + Authorized)
router.delete("/comments/:id", authenticate, deleteComment);

export default router;
