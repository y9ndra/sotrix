import { Router } from "express";
import { validate } from "../middleware/validate";
import { updateProfileSchema } from "../schemas/user.schema";
import { idParamSchema, searchUsersQuerySchema, followListQuerySchema } from "../schemas/common.schema";
import { getUserProfile, updateMyProfile, searchUsers } from "../controllers/user.controller";
import { toggleFollow, getFollowers, getFollowing } from "../controllers/follow.controller";
import { authenticate } from "../middleware/authenticate";
import { blockDemoUser } from "../middleware/blockDemo";
import upload from "../middleware/upload.middleware";

const router = Router();

router.patch("/me", authenticate, blockDemoUser, upload.single("profilePic"), validate(updateProfileSchema, "body"), updateMyProfile);
router.post("/:id/follow", authenticate, blockDemoUser, validate(idParamSchema, "params"), toggleFollow);
router.get("/search", authenticate, validate(searchUsersQuerySchema, "query"), searchUsers);
router.get("/:id/followers", authenticate, validate(idParamSchema, "params"), validate(followListQuerySchema, "query"), getFollowers);
router.get("/:id/following", authenticate, validate(idParamSchema, "params"), validate(followListQuerySchema, "query"), getFollowing);
router.get("/:id", authenticate, validate(idParamSchema, "params"), getUserProfile);

export default router;

