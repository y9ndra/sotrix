import { Router } from "express";
import { getUserProfile, updateMyProfile } from "../controllers/user.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.patch("/me", authenticate, updateMyProfile);
router.get("/:id", getUserProfile);

export default router;
