import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { createPost } from "../controllers/post.controller";

const router = Router();

router.post("/", authenticate, createPost);

export default router;
