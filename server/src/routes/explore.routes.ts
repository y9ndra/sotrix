import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  getExplorePosts,
  getSuggestedUsers,
} from "../controllers/explore.controller";

const router = Router();

// GET /api/explore/posts -> Discovery feed excluding self and followed users
router.get("/posts", authenticate, getExplorePosts);

// GET /api/explore/users -> Suggested user recommendations
router.get("/users", authenticate, getSuggestedUsers);

export default router;
