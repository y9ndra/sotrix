import { Router } from "express";
import { validate } from "../middleware/validate";
import { updateProfileSchema } from "../schemas/user.schema";
import { idParamSchema, searchQuerySchema } from "../schemas/common.schema";
import { getUserProfile, updateMyProfile, searchUsers } from "../controllers/user.controller";
import { toggleFollow } from "../controllers/follow.controller";
import { authenticate } from "../middleware/authenticate";
import upload from "../middleware/upload.middleware";

const router = Router();

router.patch("/me", authenticate, upload.single("profilePic"), validate(updateProfileSchema, "body"), updateMyProfile);
router.post("/:id/follow", authenticate, validate(idParamSchema, "params"), toggleFollow);
router.get("/search", authenticate, validate(searchQuerySchema, "query"), searchUsers);
router.get("/:id", authenticate, validate(idParamSchema, "params"), getUserProfile);

export default router;

