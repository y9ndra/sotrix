import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, signup, getMe, refresh } from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { signupSchema, loginSchema } from "../schemas/auth.schema";

const router = Router();

// Strict limiter for brute-forceable credential endpoints
const loginSignupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Max 10 attempts per 15 minutes per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many login or signup attempts. Please try again in 15 minutes." },
});

// Relaxed limiter for token refreshes (authenticated by HTTP cookie)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Max 100 refresh requests per 15 minutes per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many session refresh requests. Please try again later." },
});

router.post("/signup", loginSignupLimiter, validate(signupSchema), signup);
router.post("/login", loginSignupLimiter, validate(loginSchema), login);
router.post("/refresh", refreshLimiter, refresh);
router.get("/me", authenticate, getMe);

export default router;
