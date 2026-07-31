import { Router } from "express";
import { getUserProfile, updateMyProfile } from "../controllers/user.controller";
import { toggleFollow } from "../controllers/follow.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.patch("/me", authenticate, updateMyProfile);
router.post("/:id/follow", authenticate, toggleFollow);
router.get("/:id", authenticate, getUserProfile);

export default router;

