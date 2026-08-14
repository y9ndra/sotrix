import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { paginationQuerySchema } from "../schemas/common.schema";
import {
  getExplorePosts,
  getSuggestedUsers,
} from "../controllers/explore.controller";

const router = Router();

// GET /api/explore/posts -> Discovery feed excluding self and followed users
router.get("/posts", authenticate, validate(paginationQuerySchema, "query"), getExplorePosts);

// GET /api/explore/users -> Suggested user recommendations
router.get("/users", authenticate, validate(paginationQuerySchema, "query"), getSuggestedUsers);

export default router;
