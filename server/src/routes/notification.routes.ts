import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import { getNotificationsQuerySchema, markReadParamsSchema } from "../schemas/notification.schema";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "../controllers/notification.controller";

const router = Router();

// Get paginated notifications (Authenticated)
router.get(
  "/notifications",
  authenticate,
  validate(getNotificationsQuerySchema, "query"),
  getNotifications
);

// Get unread notification count (Authenticated)
router.get("/notifications/unread-count", authenticate, getUnreadCount);

// Mark all notifications as read (Authenticated)
router.patch("/notifications/read-all", authenticate, markAllAsRead);

// Mark specific notification as read (Authenticated)
router.patch(
  "/notifications/:id/read",
  authenticate,
  validate(markReadParamsSchema, "params"),
  markAsRead
);

export default router;
