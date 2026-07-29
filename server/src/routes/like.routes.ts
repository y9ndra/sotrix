import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { toggleLike } from "../controllers/like.controller";

const router = Router();

// Toggle like for a post (Authenticated)
router.post("/posts/:postId/like", authenticate, toggleLike);

export default router;
