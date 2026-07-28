import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  createPost,
  getPosts,
  getMyPosts,
  getPostById,
  updatePost,
  deletePost,
} from "../controllers/post.controller";

const router = Router();

// Create post (Authenticated)
router.post("/", authenticate, createPost);

// Get authenticated user's posts (Authenticated)
router.get("/me", authenticate, getMyPosts);

// Get all posts (Authenticated)
router.get("/", authenticate, getPosts);

// Get single post by ID (Authenticated)
router.get("/:id", authenticate, getPostById);

// Update own post (Authenticated + Authorized)
router.patch("/:id", authenticate, updatePost);

// Delete own post (Authenticated + Authorized)
router.delete("/:id", authenticate, deletePost);

export default router;
