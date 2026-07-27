import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { createPost, getPosts } from "../controllers/post.controller";

const router = Router();

router.post("/", authenticate, createPost);
router.get("/", getPosts);

export default router;
