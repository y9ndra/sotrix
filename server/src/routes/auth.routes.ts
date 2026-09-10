import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, signup, getMe, refresh, logout } from "../controllers/auth.controller";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { signupSchema, loginSchema } from "../schemas/auth.schema";

const router = Router();

const isTest = process.env.NODE_ENV === "test";

// Limiter for signup endpoint (50 attempts per 15 mins per IP, ignores successful signups)
const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: isTest ? 1000 : 50, // Max 50 attempts per 15 minutes per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many signup attempts from this IP. Please try again in 15 minutes." },
});

// Limiter for login endpoint (50 attempts per 15 mins per IP, ignores successful logins)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: isTest ? 1000 : 50, // Max 50 attempts per 15 minutes per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { message: "Too many login attempts from this IP. Please try again in 15 minutes." },
});

// Relaxed limiter for token refreshes (authenticated by HTTP cookie)
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: isTest ? 5000 : 100, // Max 100 refresh requests per 15 minutes per IP (relaxed in tests)
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { message: "Too many session refresh requests. Please try again later." },
});

router.post("/signup", signupLimiter, validate(signupSchema), signup);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", logout);
router.get("/me", authenticate, getMe);

export default router;
