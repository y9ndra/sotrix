import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  createPost,
  getPosts,
  getPostById,
  updatePost,
  deletePost,
} from "../controllers/post.controller";

const router = Router();

// Create post (Authenticated)
router.post("/", authenticate, createPost);

// Get all posts (Public)
router.get("/", getPosts);

// Get single post by ID (Public)
router.get("/:id", getPostById);

// Update own post (Authenticated + Authorized)
router.patch("/:id", authenticate, updatePost);

// Delete own post (Authenticated + Authorized)
router.delete("/:id", authenticate, deletePost);

export default router;
