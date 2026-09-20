import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { blockDemoUser } from "../middleware/blockDemo";
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

// Create or get private 1-to-1 conversation (Demo Guard)
router.post("/", blockDemoUser, createOrGetConversation);

// Get user's active conversations list (inbox - view allowed)
router.get("/", getUserConversations);

// Get a specific conversation by ID (view allowed)
router.get("/:id", getConversation);

// Mark conversation messages as read
router.patch("/:id/read", markAsRead);

// Get cursor-paginated messages for a conversation (view allowed)
router.get("/:id/messages", getConversationMessages);

// Send a new message (Demo Guard)
router.post("/:conversationId/messages", blockDemoUser, sendMessageController);

// Edit a message (Demo Guard)
router.patch("/:conversationId/messages/:messageId", blockDemoUser, editMessageController);

// Batch delete messages (Demo Guard)
router.post("/:conversationId/messages/batch-delete", blockDemoUser, batchDeleteMessagesController);

// Delete a single message (Demo Guard)
router.delete("/:conversationId/messages/:messageId", blockDemoUser, deleteMessageController);

export default router;
