import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { getHomeFeed } from "../controllers/feed.controller";

const router = Router();

// GET /api/feed -> Posts from followed users only (Authenticated)
router.get("/", authenticate, getHomeFeed);

export default router;
