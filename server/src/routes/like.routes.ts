import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { userActionLimiter } from "../middleware/rateLimiter";
import { validate } from "../middleware/validate";
import { postIdParamSchema } from "../schemas/common.schema";
import { toggleLike } from "../controllers/like.controller";

const router = Router();

// Toggle like for a post (Authenticated + User Rate Limited)
router.post("/posts/:postId/like", authenticate, userActionLimiter, validate(postIdParamSchema, "params"), toggleLike);

export default router;
