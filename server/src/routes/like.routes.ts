import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { postIdParamSchema } from "../schemas/common.schema";
import { toggleLike } from "../controllers/like.controller";

const router = Router();

// Toggle like for a post (Authenticated)
router.post("/posts/:postId/like", authenticate, validate(postIdParamSchema, "params"), toggleLike);

export default router;
