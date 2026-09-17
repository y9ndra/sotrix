import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import {
  createOrGetConversation,
  getUserConversations,
  getConversation,
  getConversationMessages,
  markAsRead,
  editMessageController,
  deleteMessageController,
  batchDeleteMessagesController,
  sendMessageController,
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

// Send a new message (HTTP channel fallback)
router.post("/:conversationId/messages", sendMessageController);

// Edit a message
router.patch("/:conversationId/messages/:messageId", editMessageController);

// Batch delete messages
router.post("/:conversationId/messages/batch-delete", batchDeleteMessagesController);

// Delete a single message
router.delete("/:conversationId/messages/:messageId", deleteMessageController);

export default router;
