import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { paginationQuerySchema } from "../schemas/common.schema";
import { getHomeFeed } from "../controllers/feed.controller";

const router = Router();

// GET /api/feed -> Posts from followed users and self (Authenticated)
router.get("/", authenticate, validate(paginationQuerySchema, "query"), getHomeFeed);

export default router;
