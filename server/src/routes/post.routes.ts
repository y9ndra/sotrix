import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import upload from "../middleware/upload.middleware";
import { validate } from "../middleware/validate";
import { createPostSchema, updatePostSchema } from "../schemas/post.schema";
import { idParamSchema, paginationQuerySchema, searchQuerySchema } from "../schemas/common.schema";
import {
  createPost,
  getPosts,
  getMyPosts,
  getUserPosts,
  getPostById,
  updatePost,
  deletePost,
  searchPosts,
} from "../controllers/post.controller";

const router = Router();

// Create post (Authenticated)
router.post("/", authenticate, upload.single("image"), validate(createPostSchema, "body"), createPost);

// Get authenticated user's posts (Authenticated)
router.get("/me", authenticate, validate(paginationQuerySchema, "query"), getMyPosts);

// Get a specific user's posts (Authenticated)
router.get("/user/:userId", authenticate, validate(paginationQuerySchema, "query"), getUserPosts);

// Get all posts (Authenticated)
router.get("/", authenticate, validate(paginationQuerySchema, "query"), getPosts);

// Search posts (Authenticated)
router.get("/search", authenticate, validate(searchQuerySchema, "query"), searchPosts);

// Get single post by ID (Authenticated)
router.get("/:id", authenticate, validate(idParamSchema, "params"), getPostById);

// Update own post (Authenticated + Authorized)
router.patch("/:id", authenticate, validate(idParamSchema, "params"), validate(updatePostSchema, "body"), updatePost);

// Delete own post (Authenticated + Authorized)
router.delete("/:id", authenticate, validate(idParamSchema, "params"), deletePost);

export default router;
