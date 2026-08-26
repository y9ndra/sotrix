import { Router } from "express";
import { login, signup, getMe, refresh } from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { signupSchema, loginSchema } from "../schemas/auth.schema";

const router = Router();

router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.get("/me", authenticate, getMe);

export default router;
