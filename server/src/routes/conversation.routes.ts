import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  createOrGetConversation,
  getUserConversations,
  getConversation,
  getConversationMessages,
  markAsRead,
} from "../controllers/conversation.controller";

const router = Router();

// All conversation routes require authentication
router.use(authenticate);

// Create or get private 1-to-1 conversation
router.post("/", createOrGetConversation);

// Get user's active conversations list (inbox)
router.get("/", getUserConversations);

// Get a specific conversation by ID (with participant authorization)
router.get("/:id", getConversation);

// Mark conversation messages as read
router.patch("/:id/read", markAsRead);

// Get cursor-paginated messages for a conversation
router.get("/:id/messages", getConversationMessages);

export default router;
