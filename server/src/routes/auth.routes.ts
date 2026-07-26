import { Router } from "express";
import { login, signup, getMe } from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", authenticate, getMe);

export default router;
