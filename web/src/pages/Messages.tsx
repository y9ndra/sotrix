import React, { useState, useEffect, useRef, useMemo, useLayoutEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useQuery, useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { usePresenceStore } from "../store/presenceStore";
import { getSocket, connectSocket } from "../services/socket.service";
import { queryKeys } from "../lib/queryKeys";
import {
  getConversations,
  getConversation,
  getMessages,
  markConversationAsRead,
  editMessage,
  deleteMessage,
  batchDeleteMessages,
  sendMessageApi,
} from "../services/chat.service";
import type { Conversation, ChatMessage, MessagesResponse } from "../types/chat.types";
import EmojiPicker from "../components/EmojiPicker";
import { convertEmojiShortcodes, insertEmojiAtCursor } from "../utils/emoji";
import { playMessageChime } from "../utils/sound";
import RubiksLoader from "../components/RubiksLoader";

const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const formatDateDivider = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (targetDate.getTime() === today.getTime()) {
    return "TODAY";
  }

  if (targetDate.getTime() === yesterday.getTime()) {
    return "YESTERDAY";
  }

  const weekday = date.toLocaleDateString(undefined, { weekday: "short" }).toUpperCase();
  const month = date.toLocaleDateString(undefined, { month: "short" }).toUpperCase();
  const day = String(date.getDate()).padStart(2, "0");

  if (date.getFullYear() === now.getFullYear()) {
    return `${weekday}, ${month} ${day}`;
  }

  return `${month} ${day}, ${date.getFullYear()}`;
};

const formatSidebarTimestamp = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (targetDate.getTime() === today.getTime()) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (targetDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  }

  const diffDays = Math.round((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 7 && diffDays > 0) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface ChatMessageRowProps {
  msg: ChatMessage;
  isSender: boolean;
  isSelected: boolean;
  isSelectMode: boolean;
  isEditing: boolean;
  editingContent: string;
  editInputRef: React.RefObject<HTMLTextAreaElement | null>;
  currentUserId: string;
  fullTimestampTooltip: string;
  onStartEditing: (msg: ChatMessage) => void;
  onCancelEditing: () => void;
  onSubmitEdit: (id: string) => void;
  onSetEditingContent: (val: string) => void;
  onStartReplying: (msg: ChatMessage) => void;
  onOpenDeleteModal: (msg: ChatMessage) => void;
  onToggleSelectMessage: (id: string) => void;
  onScrollToMessage: (id: string) => void;
}

const ChatMessageRow: React.FC<ChatMessageRowProps> = ({
  msg,
  isSender,
  isSelected,
  isSelectMode,
  isEditing,
  editingContent,
  editInputRef,
  currentUserId,
  fullTimestampTooltip,
  onStartEditing,
  onCancelEditing,
  onSubmitEdit,
  onSetEditingContent,
  onStartReplying,
  onOpenDeleteModal,
  onToggleSelectMessage,
  onScrollToMessage,
}) => {
  // Mobile swipe to reply state
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const directionLockedRef = useRef<"h" | "v" | null>(null);
  const hasVibratedRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isSelectMode || isEditing || e.touches.length > 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    directionLockedRef.current = null;
    hasVibratedRef.current = false;
    setIsSwiping(false);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || isSelectMode || isEditing) return;
    const diffX = e.touches[0].clientX - touchStartRef.current.x;
    const diffY = e.touches[0].clientY - touchStartRef.current.y;

    if (!directionLockedRef.current) {
      if (Math.abs(diffY) > 7 && Math.abs(diffY) >= Math.abs(diffX)) {
        directionLockedRef.current = "v";
        return;
      }
      if (Math.abs(diffX) > 7 && Math.abs(diffX) > Math.abs(diffY)) {
        // Only allow swiping right (diffX > 0)
        if (diffX > 0) {
          directionLockedRef.current = "h";
          setIsSwiping(true);
        } else {
          directionLockedRef.current = "v";
          return;
        }
      }
    }

    if (directionLockedRef.current === "h" && diffX > 0) {
      const clamped = Math.min(60, diffX * 0.45);
      setSwipeOffset(clamped);

      if (clamped >= 35 && !hasVibratedRef.current) {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(15);
          } catch (_) {}
        }
        hasVibratedRef.current = true;
      } else if (clamped < 35 && hasVibratedRef.current) {
        hasVibratedRef.current = false;
      }
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset >= 35) {
      onStartReplying(msg);
    }
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartRef.current = null;
    directionLockedRef.current = null;
    hasVibratedRef.current = false;
  };

  const handleTouchCancel = () => {
    setSwipeOffset(0);
    setIsSwiping(false);
    touchStartRef.current = null;
    directionLockedRef.current = null;
    hasVibratedRef.current = false;
  };

  return (
    <div
      id={`chat-message-${msg._id}`}
      className={`chat-message-bubble-row ${
        isSender ? "outgoing" : "incoming"
      } ${isSelectMode ? "in-select-mode" : ""} ${isSelected ? "selected" : ""}`}
      onClick={isSelectMode ? () => onToggleSelectMessage(msg._id) : undefined}
    >
      {/* Mobile Swipe Reply indicator behind bubble */}
      <div
        className={`chat-swipe-reply-indicator ${
          swipeOffset >= 35 ? "threshold-passed" : ""
        }`}
        style={{
          opacity: Math.min(1, swipeOffset / 20),
          transform: `scale(${Math.min(1, 0.4 + (swipeOffset / 35) * 0.6)})`,
        }}
        aria-hidden="true"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 17 4 12 9 7" />
          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
      </div>

      {/* Selection checkbox for incoming message (on left) */}
      {!isSender && isSelectMode && (
        <button
          type="button"
          className={`chat-message-select-btn ${isSelected ? "selected" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelectMessage(msg._id);
          }}
          aria-label={isSelected ? "Deselect message" : "Select message"}
        >
          <div className="chat-select-checkbox">
            {isSelected && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </button>
      )}

      {/* Message actions for outgoing message: Reply, Edit, Delete */}
      {isSender && !isSelectMode && !isEditing && (
        <div className="chat-message-actions">
          <button
            type="button"
            className="chat-action-btn reply"
            onClick={() => onStartReplying(msg)}
            title="Reply to message"
            aria-label="Reply to message"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          </button>
          <button
            type="button"
            className="chat-action-btn edit"
            onClick={() => onStartEditing(msg)}
            title="Edit message"
            aria-label="Edit message"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
          <button
            type="button"
            className="chat-action-btn delete"
            onClick={() => onOpenDeleteModal(msg)}
            title="Delete message"
            aria-label="Delete message"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      )}

      {/* Message Bubble with Touch Handlers */}
      <div
        className={`chat-message-bubble ${
          isSender ? "mine" : "theirs"
        } ${isEditing ? "is-editing" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        style={{
          transform: swipeOffset > 0 ? `translateX(${swipeOffset}px)` : undefined,
          transition: isSwiping
            ? "none"
            : "transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)",
        }}
      >
        {isEditing ? (
          <div className="chat-message-inline-edit">
            <textarea
              ref={editInputRef}
              value={editingContent}
              onChange={(e) =>
                onSetEditingContent(convertEmojiShortcodes(e.target.value))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSubmitEdit(msg._id);
                } else if (e.key === "Escape") {
                  onCancelEditing();
                }
              }}
              className="chat-inline-edit-input"
              rows={1}
            />
            <div className="chat-inline-edit-footer">
              <span className="chat-inline-edit-hint">
                esc to{" "}
                <button
                  type="button"
                  onClick={onCancelEditing}
                  className="chat-inline-link"
                >
                  cancel
                </button>{" "}
                • enter to{" "}
                <button
                  type="button"
                  onClick={() => onSubmitEdit(msg._id)}
                  className="chat-inline-link save"
                >
                  save
                </button>
              </span>
              <div className="chat-inline-edit-actions">
                <button
                  type="button"
                  onClick={onCancelEditing}
                  className="chat-inline-btn cancel"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => onSubmitEdit(msg._id)}
                  disabled={
                    !editingContent.trim() ||
                    editingContent.trim() === msg.content
                  }
                  className="chat-inline-btn save"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Quoted Message Card */}
            {msg.replyTo && (
              <div
                className="chat-quoted-card"
                onClick={(e) => {
                  e.stopPropagation();
                  onScrollToMessage(msg.replyTo!._id);
                }}
                title="Jump to quoted message"
              >
                <div className="chat-quoted-inner">
                  <div className="chat-quoted-header">
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="9 17 4 12 9 7" />
                      <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                    </svg>
                    <span className="chat-quoted-sender">
                      {(msg.replyTo.sender?._id === currentUserId ||
                        (typeof msg.replyTo.sender === "string" &&
                          msg.replyTo.sender === currentUserId))
                        ? "You"
                        : msg.replyTo.sender?.name ||
                          msg.replyTo.sender?.username ||
                          "user"}
                    </span>
                  </div>
                  <p className="chat-quoted-text">
                    {msg.replyTo.content || "[Original message deleted]"}
                  </p>
                </div>
              </div>
            )}

            <p className="chat-message-text">{msg.content}</p>
            <div className="chat-message-footer">
              {msg.isEdited && (
                <span
                  className="chat-message-edited-tag"
                  title={
                    msg.editedAt
                      ? `Edited ${new Date(msg.editedAt).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}`
                      : "Edited"
                  }
                >
                  (edited)
                </span>
              )}
              <span
                className="chat-message-timestamp"
                title={fullTimestampTooltip}
              >
                {new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {isSender && (
                <span
                  className={`chat-message-receipt ${msg.isRead ? "read" : "delivered"}`}
                  title={
                    msg.isRead
                      ? msg.readAt
                        ? `Read ${new Date(msg.readAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : "Read"
                      : "Delivered"
                  }
                  aria-label={msg.isRead ? "Read" : "Delivered"}
                >
                  {msg.isRead ? (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M18 6L7 17l-5-5" />
                      <path d="M22 10l-7.5 7.5-2-2" />
                    </svg>
                  ) : (
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  )}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Message actions for incoming message: Reply, Delete */}
      {!isSender && !isSelectMode && (
        <div className="chat-message-actions">
          <button
            type="button"
            className="chat-action-btn reply"
            onClick={() => onStartReplying(msg)}
            title="Reply to message"
            aria-label="Reply to message"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          </button>
          <button
            type="button"
            className="chat-action-btn delete"
            onClick={() => onOpenDeleteModal(msg)}
            title="Delete message for me"
            aria-label="Delete message for me"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      )}

      {/* Selection checkbox for outgoing message (on right) */}
      {isSender && isSelectMode && (
        <button
          type="button"
          className={`chat-message-select-btn ${isSelected ? "selected" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelectMessage(msg._id);
          }}
          aria-label={isSelected ? "Deselect message" : "Select message"}
        >
          <div className="chat-select-checkbox">
            {isSelected && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </button>
      )}
    </div>
  );
};

const Messages: React.FC = () => {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?._id || (currentUser as any)?.id || "";
  const onlineUserIds = usePresenceStore((state) => state.onlineUserIds);

  const [searchParams, setSearchParams] = useSearchParams();
  const activeConversationId = searchParams.get("conversationId");

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    activeConversationId
  );
  const [inputContent, setInputContent] = useState("");
  const [remoteTypingUserId, setRemoteTypingUserId] = useState<string | null>(null);
  const [typingConversations, setTypingConversations] = useState<Record<string, string>>({});

  const isTypingEmittedRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Smart scrolling state: track whether user is at the bottom or reading older messages
  const isAtBottomRef = useRef(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);
  const initialPositionedConvIdRef = useRef<string | null>(null);
  const prevMessagesLengthRef = useRef(0);
  const prevScrollHeightRef = useRef<number | null>(null);
  const prevLastMessageIdRef = useRef<string | null>(null);

  // Message edit and delete state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const editInputRef = useRef<HTMLTextAreaElement | null>(null);

  // Message reply state
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);

  // Selection mode & Selective Delete state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    targetMessage?: ChatMessage | null;
    isBatch?: boolean;
  } | null>(null);

  // Unread divider tracking ref: keeps the captured unread cutoff stable throughout
  // the conversation session so that background DB updates do not wipe out the divider
  const unreadCutoffRef = useRef<{
    convId: string;
    messageId: string | null;
    initialUnreadCount: number;
  }>({
    convId: "",
    messageId: null,
    initialUnreadCount: 0,
  });

  // Auto-focus and position cursor at end when entering edit mode
  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.selectionStart = editInputRef.current.value.length;
      editInputRef.current.selectionEnd = editInputRef.current.value.length;
    }
  }, [editingMessageId]);

  // Reset selection, reply, modal state on conversation switch
  useEffect(() => {
    setIsSelectMode(false);
    setSelectedMessageIds(new Set());
    setDeleteModal(null);
    setEditingMessageId(null);
    setReplyingToMessage(null);
    prevLastMessageIdRef.current = null;
    initialPositionedConvIdRef.current = null;
  }, [selectedConversationId]);

  // Close delete modal, cancel select mode, cancel edit, or cancel reply on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteModal?.isOpen) {
          setDeleteModal(null);
        } else if (isSelectMode) {
          setIsSelectMode(false);
          setSelectedMessageIds(new Set());
        } else if (editingMessageId) {
          setEditingMessageId(null);
          setEditingContent("");
        } else if (replyingToMessage) {
          setReplyingToMessage(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteModal, isSelectMode, editingMessageId, replyingToMessage]);

  const startReplying = (msg: ChatMessage) => {
    setReplyingToMessage(msg);
    setEditingMessageId(null);
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  const cancelReplying = () => {
    setReplyingToMessage(null);
  };

  const scrollToMessage = (targetId: string) => {
    if (!targetId) return;
    const el = document.getElementById(`chat-message-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.remove("pulse-highlight");
      void el.offsetWidth;
      el.classList.add("pulse-highlight");
      setTimeout(() => {
        el.classList.remove("pulse-highlight");
      }, 2000);
    } else {
      if (hasNextPage && !isFetchingNextPage) {
        handleLoadEarlier();
      }
    }
  };

  const toggleSelectMode = () => {
    setIsSelectMode((prev) => {
      if (prev) {
        setSelectedMessageIds(new Set());
      }
      return !prev;
    });
    setEditingMessageId(null);
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedMessageIds(new Set());
  };

  const toggleSelectMessage = (messageId: string) => {
    setSelectedMessageIds((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const openSingleDeleteModal = (msg: ChatMessage) => {
    setDeleteModal({
      isOpen: true,
      targetMessage: msg,
      isBatch: false,
    });
  };

  const openBatchDeleteModal = () => {
    if (selectedMessageIds.size === 0) return;
    setDeleteModal({
      isOpen: true,
      isBatch: true,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal(null);
  };

  const startEditing = (msg: ChatMessage) => {
    setEditingMessageId(msg._id);
    setEditingContent(msg.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingContent("");
  };

  const submitEdit = async (messageId: string) => {
    const trimmed = editingContent.trim();
    if (!trimmed || !selectedConversationId) return;

    // Optimistically update React Query messages cache
    queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
      queryKeys.conversations.messages(selectedConversationId),
      (oldData) => {
        if (!oldData) return oldData;
        if ("pages" in oldData) {
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              data: page.data.map((m) =>
                m._id === messageId
                  ? {
                      ...m,
                      content: trimmed,
                      isEdited: true,
                      editedAt: new Date().toISOString(),
                    }
                  : m
              ),
            })),
          };
        }
        if ("data" in oldData && Array.isArray(oldData.data)) {
          return {
            ...oldData,
            data: oldData.data.map((m) =>
              m._id === messageId
                ? {
                    ...m,
                    content: trimmed,
                    isEdited: true,
                    editedAt: new Date().toISOString(),
                  }
                : m
            ),
          };
        }
        return oldData;
      }
    );

    // Update conversation lastMessage in sidebar if applicable
    queryClient.setQueryData<Conversation[]>(
      queryKeys.conversations.all,
      (old = []) => {
        return old.map((conv) => {
          if (conv._id === selectedConversationId && conv.lastMessage) {
            return {
              ...conv,
              lastMessage: {
                ...conv.lastMessage,
                content: trimmed,
              },
            };
          }
          return conv;
        });
      }
    );

    // Emit via Socket.IO
    const socket = getSocket();
    if (socket) {
      socket.emit("message:edit", {
        conversationId: selectedConversationId,
        messageId,
        content: trimmed,
      });
    }

    // Call REST endpoint as reliable fallback
    try {
      await editMessage(selectedConversationId, messageId, trimmed);
    } catch (err) {
      console.error("Failed to edit message via API:", err);
    }

    cancelEditing();
  };

  const handleEmojiSelect = (emoji: string) => {
    const input = chatInputRef.current;
    if (!input) {
      setInputContent((prev) => prev + emoji);
      return;
    }

    const { newText, newCursor } = insertEmojiAtCursor(
      inputContent,
      emoji,
      input.selectionStart,
      input.selectionEnd
    );
    setInputContent(newText);
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  // Sync selected conversation from URL search params if present
  useEffect(() => {
    if (activeConversationId) {
      setSelectedConversationId(activeConversationId);
    }
  }, [activeConversationId]);

  // Fetch all user conversations
  const { data: conversations = [], isLoading: conversationsLoading } = useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: getConversations,
    enabled: !!currentUserId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Automatically select the first conversation on desktop screens if none selected.
  // On mobile screens (<= 768px), keep inbox list visible by default.
  useEffect(() => {
    if (activeConversationId) {
      setSelectedConversationId(activeConversationId);
    } else if (!selectedConversationId && conversations.length > 0) {
      const isMobile = window.innerWidth <= 768;
      if (!isMobile) {
        setSelectedConversationId(conversations[0]._id);
      }
    }
  }, [conversations, selectedConversationId, activeConversationId]);

  // Fetch messages for selected conversation with infinite scrolling (cursor pagination)
  const {
    data: messagesData,
    isLoading: messagesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.conversations.messages(selectedConversationId || ""),
    queryFn: ({ pageParam }) =>
      getMessages(selectedConversationId!, pageParam as string | undefined, 30),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage?.hasMore && lastPage?.nextCursor ? lastPage.nextCursor : undefined,
    enabled: !!selectedConversationId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // Flatten and deduplicate all messages across pages (newest-first)
  const rawMessages: ChatMessage[] = useMemo(() => {
    if (!messagesData?.pages) return [];
    const seen = new Set<string>();
    const list: ChatMessage[] = [];
    for (const page of messagesData.pages) {
      if (Array.isArray(page?.data)) {
        for (const msg of page.data) {
          if (msg?._id && !seen.has(msg._id)) {
            seen.add(msg._id);
            list.push(msg);
          }
        }
      }
    }
    return list;
  }, [messagesData]);

  // Messages are returned newest-first from backend: reverse for natural bottom-up chat display
  const displayMessages = useMemo(() => [...rawMessages].reverse(), [rawMessages]);

  // Synchronously compute unread cutoff message ID for the active conversation
  // so the divider is rendered in the DOM on the very first render pass without layout delay.
  // Persists throughout the active conversation session even when messages are marked read in DB.
  const unreadCutoffMessageId = useMemo(() => {
    if (!selectedConversationId || displayMessages.length === 0) return null;

    if (
      unreadCutoffRef.current.convId === selectedConversationId &&
      unreadCutoffRef.current.messageId !== null
    ) {
      return unreadCutoffRef.current.messageId;
    }

    // 1. Primary check: first incoming message explicitly marked !isRead
    const firstUnread = displayMessages.find((m) => {
      const sId =
        typeof m.sender === "string"
          ? m.sender
          : m.sender?._id || (m.sender as any)?.id;
      return String(sId) !== String(currentUserId) && !m.isRead;
    });

    if (firstUnread) {
      unreadCutoffRef.current = {
        convId: selectedConversationId,
        messageId: firstUnread._id,
        initialUnreadCount: unreadCutoffRef.current.initialUnreadCount || 1,
      };
      return firstUnread._id;
    }

    // 2. Fallback check: if DB already had isRead: true, but conversation had unread count on entry
    const count = unreadCutoffRef.current.initialUnreadCount || 0;
    if (count > 0) {
      const incomingMsgs = displayMessages.filter((m) => {
        const sId =
          typeof m.sender === "string"
            ? m.sender
            : m.sender?._id || (m.sender as any)?.id;
        return String(sId) !== String(currentUserId);
      });

      if (incomingMsgs.length > 0) {
        const cutoffMsg =
          incomingMsgs[Math.max(0, incomingMsgs.length - count)];
        if (cutoffMsg) {
          unreadCutoffRef.current = {
            convId: selectedConversationId,
            messageId: cutoffMsg._id,
            initialUnreadCount: count,
          };
          return cutoffMsg._id;
        }
      }
    }

    // No unread messages
    unreadCutoffRef.current = {
      convId: selectedConversationId,
      messageId: null,
      initialUnreadCount: 0,
    };
    return null;
  }, [selectedConversationId, displayMessages, currentUserId]);

  const handleToggleSelectAll = () => {
    if (selectedMessageIds.size === displayMessages.length && displayMessages.length > 0) {
      setSelectedMessageIds(new Set());
    } else {
      setSelectedMessageIds(new Set(displayMessages.map((m) => m._id)));
    }
  };

  // Determine if all target messages can be deleted for everyone (i.e. all authored by currentUser)
  const canDeleteForEveryone = useMemo(() => {
    if (!deleteModal) return false;
    if (deleteModal.isBatch) {
      if (selectedMessageIds.size === 0) return false;
      return Array.from(selectedMessageIds).every((id) => {
        const msg = displayMessages.find((m) => m._id === id);
        if (!msg) return false;
        const sId =
          typeof msg.sender === "string"
            ? msg.sender
            : msg.sender?._id || (msg.sender as any)?.id;
        return sId === currentUserId;
      });
    }
    if (deleteModal.targetMessage) {
      const sId =
        typeof deleteModal.targetMessage.sender === "string"
          ? deleteModal.targetMessage.sender
          : deleteModal.targetMessage.sender?._id ||
            (deleteModal.targetMessage.sender as any)?.id;
      return sId === currentUserId;
    }
    return false;
  }, [deleteModal, selectedMessageIds, displayMessages, currentUserId]);

  const handleConfirmDelete = async (mode: "for_me" | "for_everyone") => {
    if (!deleteModal || !selectedConversationId) return;

    if (deleteModal.isBatch) {
      const idsToDelete = Array.from(selectedMessageIds);
      closeDeleteModal();
      exitSelectMode();

      const idSet = new Set(idsToDelete);

      // Optimistically remove from React Query messages cache
      queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
        queryKeys.conversations.messages(selectedConversationId),
        (oldData) => {
          if (!oldData) return oldData;
          if ("pages" in oldData) {
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                data: page.data.filter((m) => !idSet.has(m._id)),
              })),
            };
          }
          if ("data" in oldData && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.filter((m) => !idSet.has(m._id)),
            };
          }
          return oldData;
        }
      );

      // Invalidate conversation list to update lastMessage
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
        exact: true,
      });

      // Emit via Socket.IO
      const socket = getSocket();
      if (socket) {
        socket.emit("message:batch-delete", {
          conversationId: selectedConversationId,
          messageIds: idsToDelete,
          mode,
        });
      }

      // Reliable REST fallback
      try {
        await batchDeleteMessages(selectedConversationId, idsToDelete, mode);
      } catch (err) {
        console.error("Failed to batch delete messages via API:", err);
      }
    } else if (deleteModal.targetMessage) {
      const msgId = deleteModal.targetMessage._id;
      closeDeleteModal();

      // Optimistically remove from React Query messages cache
      queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
        queryKeys.conversations.messages(selectedConversationId),
        (oldData) => {
          if (!oldData) return oldData;
          if ("pages" in oldData) {
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                data: page.data.filter((m) => m._id !== msgId),
              })),
            };
          }
          if ("data" in oldData && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.filter((m) => m._id !== msgId),
            };
          }
          return oldData;
        }
      );

      // Invalidate conversation list to update lastMessage
      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
        exact: true,
      });

      // Emit via Socket.IO
      const socket = getSocket();
      if (socket) {
        socket.emit("message:delete", {
          conversationId: selectedConversationId,
          messageId: msgId,
          mode,
        });
      }

      // Reliable REST fallback
      try {
        await deleteMessage(selectedConversationId, msgId, mode);
      } catch (err) {
        console.error("Failed to delete message via API:", err);
      }
    }
  };

  // Fetch active conversation details directly if selected
  const { data: directConversation } = useQuery({
    queryKey: queryKeys.conversations.detail(selectedConversationId || ""),
    queryFn: () => getConversation(selectedConversationId!),
    enabled: !!selectedConversationId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Selected conversation object (prioritizes direct conversation query, falls back to list)
  const currentConversation =
    directConversation ||
    conversations.find((c) => c._id === selectedConversationId);

  // Other participant in the active conversation
  const otherParticipant = currentConversation?.participants?.find(
    (p) => (p?._id || (p as any)?.id) !== currentUserId
  );

  // Sync direct conversation into conversations list cache so inbox highlights immediately
  useEffect(() => {
    if (directConversation) {
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations.all,
        (old = []) => {
          if (old.some((c) => c._id === directConversation._id)) {
            return old;
          }
          return [directConversation, ...old];
        }
      );
    }
  }, [directConversation, queryClient]);

  // Capture unread count if opening via direct URL parameter and not yet captured
  useEffect(() => {
    if (!selectedConversationId) return;
    if (unreadCutoffRef.current.convId !== selectedConversationId) {
      const conv =
        directConversation ||
        conversations.find((c) => c._id === selectedConversationId);
      if (conv) {
        const unreadCount = conv.unreadCount || (conv.hasUnread ? 1 : 0);
        unreadCutoffRef.current = {
          convId: selectedConversationId,
          messageId: null,
          initialUnreadCount: unreadCount,
        };
      }
    }
  }, [selectedConversationId, conversations, directConversation]);

  // Preserve scroll position when older messages are prepended at the top
  useLayoutEffect(() => {
    const container = chatMessagesContainerRef.current;
    if (!container || prevScrollHeightRef.current === null) return;

    const diff = container.scrollHeight - prevScrollHeightRef.current;
    if (diff > 0) {
      container.scrollTop = container.scrollTop + diff;
    }
    prevScrollHeightRef.current = null;
  }, [displayMessages.length]);

  // Monitor user scrolling to detect if they are reading older messages or reached top to load more
  const handleMessagesScroll = () => {
    const container = chatMessagesContainerRef.current;
    if (!container) return;

    // Check if scrolled near top to auto-load older messages
    if (container.scrollTop < 80 && hasNextPage && !isFetchingNextPage) {
      prevScrollHeightRef.current = container.scrollHeight;
      fetchNextPage();
    }

    // Threshold of 120px from bottom is considered "at the bottom"
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    const isAtBottom = distanceFromBottom <= 120;

    isAtBottomRef.current = isAtBottom;
    setShowScrollBottom(!isAtBottom);

    if (isAtBottom) {
      setUnreadBelowCount(0);
    }
  };

  const handleLoadEarlier = () => {
    if (hasNextPage && !isFetchingNextPage) {
      const container = chatMessagesContainerRef.current;
      if (container) {
        prevScrollHeightRef.current = container.scrollHeight;
      }
      fetchNextPage();
    }
  };

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const container = chatMessagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior });
      isAtBottomRef.current = true;
      setShowScrollBottom(false);
      setUnreadBelowCount(0);
    }
  };

  // Initial positioning when opening/switching a conversation:
  // If there are unread messages, start at the unread convo (divider/first unread message).
  // Otherwise, pop directly in at the end of the convo (bottom) with zero animated scroll!
  useLayoutEffect(() => {
    if (
      !selectedConversationId ||
      displayMessages.length === 0 ||
      initialPositionedConvIdRef.current === selectedConversationId
    ) {
      return;
    }

    const container = chatMessagesContainerRef.current;
    if (!container) return;

    const lastMsg = displayMessages[displayMessages.length - 1];
    if (lastMsg) {
      prevLastMessageIdRef.current = lastMsg._id;
    }
    prevMessagesLengthRef.current = displayMessages.length;

    if (unreadCutoffMessageId) {
      const dividerEl = container.querySelector(
        ".chat-unread-divider-row"
      ) as HTMLElement | null;
      const messageEl = document.getElementById(
        `chat-message-${unreadCutoffMessageId}`
      );
      // Target the unread messages divider tag so it lands right at the top of the display!
      const targetEl = dividerEl || messageEl;

      if (!targetEl) {
        // Wait until target element is mounted in DOM
        return;
      }

      initialPositionedConvIdRef.current = selectedConversationId;

      const containerRect = container.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      const maxScrollTop = Math.max(
        0,
        container.scrollHeight - container.clientHeight
      );
      // Ideal scroll position to put the NEW MESSAGES divider right at the top of the display:
      const idealScrollTop =
        targetRect.top - containerRect.top + container.scrollTop - 8;

      // Check if there are enough unread messages below to place divider at top of display:
      // If idealScrollTop is near or past maxScrollTop, there are NOT enough messages below it,
      // so land at the last (end of conversation) with the divider and unread messages visible!
      if (idealScrollTop < maxScrollTop - 25) {
        container.scrollTop = Math.max(0, idealScrollTop);
        isAtBottomRef.current = false;
        const firstUnreadIndex = displayMessages.findIndex(
          (m) => m._id === unreadCutoffMessageId
        );
        const countBelow =
          firstUnreadIndex !== -1
            ? displayMessages.length - 1 - firstUnreadIndex
            : 0;
        setShowScrollBottom(countBelow > 0);
        setUnreadBelowCount(Math.max(0, countBelow));
      } else {
        // Land at last!
        container.scrollTop = container.scrollHeight;
        isAtBottomRef.current = true;
        setShowScrollBottom(false);
        setUnreadBelowCount(0);
      }

      // Re-affirm position in case sub-elements or images settle without animated scroll
      requestAnimationFrame(() => {
        if (
          container &&
          initialPositionedConvIdRef.current === selectedConversationId
        ) {
          const dEl = container.querySelector(
            ".chat-unread-divider-row"
          ) as HTMLElement | null;
          const mEl = document.getElementById(
            `chat-message-${unreadCutoffMessageId}`
          );
          const tEl = dEl || mEl;
          if (tEl) {
            const maxScroll = Math.max(
              0,
              container.scrollHeight - container.clientHeight
            );
            const cRect = container.getBoundingClientRect();
            const tRect = tEl.getBoundingClientRect();
            const idealTop =
              tRect.top - cRect.top + container.scrollTop - 8;

            if (idealTop < maxScroll - 25) {
              container.scrollTop = Math.max(0, idealTop);
            } else {
              container.scrollTop = container.scrollHeight;
            }
          }
        }
      });
    } else {
      initialPositionedConvIdRef.current = selectedConversationId;

      // No unread messages: POP IN AT THE END OF THE CONVO IMMEDIATELY!
      container.scrollTop = container.scrollHeight;
      isAtBottomRef.current = true;
      setShowScrollBottom(false);
      setUnreadBelowCount(0);

      // Re-affirm position in case sub-elements or images settle
      requestAnimationFrame(() => {
        if (
          container &&
          initialPositionedConvIdRef.current === selectedConversationId
        ) {
          container.scrollTop = container.scrollHeight;
        }
      });
    }
  }, [selectedConversationId, displayMessages, unreadCutoffMessageId]);

  // Mark conversation as read on backend and in socket room when viewing
  useEffect(() => {
    if (!selectedConversationId || displayMessages.length === 0) return;

    // 1. Call API to mark conversation as read in MongoDB
    markConversationAsRead(selectedConversationId).catch((err) =>
      console.warn("[MESSAGES] Failed to mark conversation as read via API:", err)
    );

    // 2. Broadcast via socket to room and participants
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit("conversation:read", { conversationId: selectedConversationId });
    }

    // 3. Mark conversation in sidebar list cache as read immediately
    queryClient.setQueryData<Conversation[]>(
      queryKeys.conversations.all,
      (old = []) =>
        old.map((c) =>
          c._id === selectedConversationId
            ? { ...c, hasUnread: false, unreadCount: 0 }
            : c
        )
    );
  }, [selectedConversationId, displayMessages.length, queryClient]);

  // Handle incoming messages: ONLY auto-scroll if the user is ALREADY at the bottom
  // and initial positioning for this conversation has already completed
  useEffect(() => {
    const container = chatMessagesContainerRef.current;
    if (!container) return;

    if (initialPositionedConvIdRef.current !== selectedConversationId) return;

    const currentLastMessage = displayMessages[displayMessages.length - 1];
    const currentLastId = currentLastMessage?._id || null;
    const isNewMessageAtBottom =
      currentLastId !== null &&
      prevLastMessageIdRef.current !== null &&
      currentLastId !== prevLastMessageIdRef.current &&
      displayMessages.length > prevMessagesLengthRef.current;

    prevLastMessageIdRef.current = currentLastId;
    prevMessagesLengthRef.current = displayMessages.length;

    if (isNewMessageAtBottom) {
      if (isAtBottomRef.current) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      } else {
        // User is reading older messages: DO NOT SCROLL. Count new message below.
        setUnreadBelowCount((prev) => prev + 1);
      }
    }
  }, [displayMessages, selectedConversationId]);

  // When remote user starts typing: NEVER scroll if user is reading older messages!
  useEffect(() => {
    if (remoteTypingUserId && isAtBottomRef.current) {
      const container = chatMessagesContainerRef.current;
      if (container && initialPositionedConvIdRef.current === selectedConversationId) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    }
  }, [remoteTypingUserId, selectedConversationId]);

  // Request fresh presence list and attach real-time presence listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit("presence:get");

    const handlePresenceList = (data: { users: (string | { userId?: string; id?: string })[] }) => {
      usePresenceStore.getState().setOnlineUsers(data?.users || []);
    };
    const handlePresenceOnline = (data: string | { userId?: string; id?: string }) => {
      usePresenceStore.getState().addUser(data);
    };
    const handlePresenceOffline = (data: string | { userId?: string; id?: string }) => {
      usePresenceStore.getState().removeUser(data);
    };

    socket.on("presence:list", handlePresenceList);
    socket.on("presence:online", handlePresenceOnline);
    socket.on("presence:offline", handlePresenceOffline);

    return () => {
      socket.off("presence:list", handlePresenceList);
      socket.off("presence:online", handlePresenceOnline);
      socket.off("presence:offline", handlePresenceOffline);
    };
  }, []);

  // Handle new incoming canonical message (from Socket or HTTP fallback)
  const handleNewMessage = useCallback(
    (newMsg: ChatMessage) => {
      const convId =
        typeof newMsg.conversation === "string"
          ? newMsg.conversation
          : (newMsg.conversation as any)?._id || (newMsg.conversation as any)?.id;

      const isCurrentConversation = convId === selectedConversationId;
      const senderId =
        typeof newMsg.sender === "string"
          ? newMsg.sender
          : newMsg.sender?._id || (newMsg.sender as any)?.id;
      const isSentByMe = senderId === currentUserId;

      queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
        queryKeys.conversations.messages(convId),
        (oldData) => {
          if (!oldData) {
            return {
              pages: [
                {
                  success: true,
                  data: [newMsg],
                  nextCursor: null,
                  hasMore: false,
                },
              ],
              pageParams: [undefined],
            };
          }

          if ("pages" in oldData) {
            const alreadyExists = oldData.pages.some((page) =>
              page?.data?.some((m) => m._id === newMsg._id)
            );
            if (alreadyExists) return oldData;

            const firstPage = oldData.pages[0] || {
              success: true,
              data: [],
              nextCursor: null,
              hasMore: false,
            };
            const updatedFirstPage = {
              ...firstPage,
              data: [newMsg, ...(firstPage.data || [])],
            };
            return {
              ...oldData,
              pages: [updatedFirstPage, ...oldData.pages.slice(1)],
            };
          }

          if ("data" in oldData && Array.isArray(oldData.data)) {
            if (oldData.data.some((m) => m._id === newMsg._id)) {
              return oldData;
            }
            return {
              ...oldData,
              data: [newMsg, ...oldData.data],
            };
          }

          return oldData;
        }
      );

      // Update conversations list cache: bump to top and update hasUnread & lastMessage
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations.all,
        (old = []) => {
          return old
            .map((conv) => {
              if (conv._id === convId) {
                // Prevent duplicate counting if this message was already applied
                if (
                  conv.lastMessage &&
                  conv.lastMessage.createdAt === newMsg.createdAt &&
                  conv.lastMessage.content === newMsg.content
                ) {
                  return conv;
                }

                return {
                  ...conv,
                  updatedAt: newMsg.createdAt,
                  lastMessage: {
                    content: newMsg.content,
                    sender: newMsg.sender,
                    createdAt: newMsg.createdAt,
                  },
                  hasUnread: isSentByMe
                    ? false
                    : isCurrentConversation
                    ? false
                    : true,
                  unreadCount: isSentByMe
                    ? 0
                    : isCurrentConversation
                    ? 0
                    : ((conv.unreadCount || 0) + 1),
                };
              }
              return conv;
            })
            .sort(
              (a, b) =>
                new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
            );
        }
      );

      // If we are actively viewing this conversation and it's from another user, mark as read on backend
      if (isCurrentConversation && !isSentByMe) {
        markConversationAsRead(convId).catch(console.error);
        const socket = getSocket();
        if (socket && socket.connected) {
          socket.emit("conversation:read", { conversationId: convId });
        }
      }

      // Play soft synthesized chime for incoming message from other user
      if (!isSentByMe) {
        playMessageChime();
      }
    },
    [selectedConversationId, currentUserId, queryClient]
  );

  // Real-time Chat Room (Join/Leave), Message & Typing Listeners
  useEffect(() => {
    let socket = getSocket();
    if (!socket || !socket.connected) {
      socket = connectSocket();
    }
    if (!socket || !selectedConversationId) return;

    // Join the conversation room immediately if already connected
    if (socket.connected) {
      socket.emit("conversation:join", selectedConversationId);
    }

    // Re-join room on socket reconnection
    const handleSocketConnect = () => {
      if (selectedConversationId) {
        socket?.emit("conversation:join", selectedConversationId);
      }
    };
    socket.on("connect", handleSocketConnect);

    const handleChatError = (err: any) => {
      console.warn("[SOCKET chat:error]:", err);
    };
    socket.on("chat:error", handleChatError);


    // Handle typing events
    const handleTypingStart = ({
      conversationId,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => {
      if (userId !== currentUserId) {
        setTypingConversations((prev) => ({
          ...prev,
          [conversationId]: userId,
        }));
        if (conversationId === selectedConversationId) {
          setRemoteTypingUserId(userId);
        }
      }
    };

    const handleTypingStop = ({
      conversationId,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => {
      if (userId !== currentUserId) {
        setTypingConversations((prev) => {
          const next = { ...prev };
          delete next[conversationId];
          return next;
        });
        if (conversationId === selectedConversationId) {
          setRemoteTypingUserId(null);
        }
      }
    };

    // Handle message edited event
    const handleMessageEdited = (editedMsg: ChatMessage) => {
      queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
        queryKeys.conversations.messages(editedMsg.conversation),
        (oldData) => {
          if (!oldData) return oldData;
          if ("pages" in oldData) {
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                data: page.data.map((m) =>
                  m._id === editedMsg._id ? { ...m, ...editedMsg } : m
                ),
              })),
            };
          }
          if ("data" in oldData && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.map((m) =>
                m._id === editedMsg._id ? { ...m, ...editedMsg } : m
              ),
            };
          }
          return oldData;
        }
      );

      // Update conversations list preview
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations.all,
        (old = []) => {
          return old.map((conv) => {
            if (conv._id === editedMsg.conversation && conv.lastMessage) {
              return {
                ...conv,
                lastMessage: {
                  ...conv.lastMessage,
                  content: editedMsg.content,
                },
              };
            }
            return conv;
          });
        }
      );
    };

    // Handle message deleted event
    const handleMessageDeleted = ({
      conversationId,
      messageId,
    }: {
      conversationId: string;
      messageId: string;
    }) => {
      queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
        queryKeys.conversations.messages(conversationId),
        (oldData) => {
          if (!oldData) return oldData;
          if ("pages" in oldData) {
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                data: page.data.filter((m) => m._id !== messageId),
              })),
            };
          }
          if ("data" in oldData && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.filter((m) => m._id !== messageId),
            };
          }
          return oldData;
        }
      );

      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
        exact: true,
      });
    };

    // Handle batch messages deleted event
    const handleMessageBatchDeleted = ({
      conversationId,
      messageIds,
    }: {
      conversationId: string;
      messageIds: string[];
    }) => {
      const idSet = new Set(messageIds);
      queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
        queryKeys.conversations.messages(conversationId),
        (oldData) => {
          if (!oldData) return oldData;
          if ("pages" in oldData) {
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                data: page.data.filter((m) => !idSet.has(m._id)),
              })),
            };
          }
          if ("data" in oldData && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.filter((m) => !idSet.has(m._id)),
            };
          }
          return oldData;
        }
      );

      queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
        exact: true,
      });
    };

    const handleConversationRead = ({
      conversationId,
      readerId,
      readAt,
    }: {
      conversationId: string;
      readerId: string;
      readAt?: string | Date;
    }) => {
      if (readerId !== currentUserId) {
        queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
          queryKeys.conversations.messages(conversationId),
          (oldData) => {
            if (!oldData) return oldData;
            const markMsgRead = (m: ChatMessage) => {
              const sId =
                typeof m.sender === "string"
                  ? m.sender
                  : m.sender?._id || (m.sender as any)?.id;
              if (sId === currentUserId && !m.isRead) {
                return {
                  ...m,
                  isRead: true,
                  readAt:
                    typeof readAt === "string"
                      ? readAt
                      : readAt
                      ? new Date(readAt).toISOString()
                      : new Date().toISOString(),
                };
              }
              return m;
            };

            if ("pages" in oldData) {
              return {
                ...oldData,
                pages: oldData.pages.map((page) => ({
                  ...page,
                  data: page.data.map(markMsgRead),
                })),
              };
            }
            if ("data" in oldData && Array.isArray(oldData.data)) {
              return {
                ...oldData,
                data: oldData.data.map(markMsgRead),
              };
            }
            return oldData;
          }
        );
      }

      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations.all,
        (old = []) =>
          old.map((c) => {
            if (c._id === conversationId && readerId === currentUserId) {
              return { ...c, hasUnread: false, unreadCount: 0 };
            }
            return c;
          })
      );
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:edited", handleMessageEdited);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("message:batch-deleted", handleMessageBatchDeleted);
    socket.on("conversation:read", handleConversationRead);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      // Leave room on cleanup
      socket.off("connect", handleSocketConnect);
      socket.off("chat:error", handleChatError);
      socket.off("message:new", handleNewMessage);
      socket.off("message:edited", handleMessageEdited);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("message:batch-deleted", handleMessageBatchDeleted);
      socket.off("conversation:read", handleConversationRead);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      setRemoteTypingUserId(null);
    };
  }, [selectedConversationId, currentUserId, queryClient, handleNewMessage]);

  // Sync active remote typing indicator when selected conversation changes
  useEffect(() => {
    if (selectedConversationId && typingConversations[selectedConversationId]) {
      setRemoteTypingUserId(typingConversations[selectedConversationId]);
    } else {
      setRemoteTypingUserId(null);
    }
  }, [selectedConversationId, typingConversations]);

  // Debounced Typing input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawVal = e.target.value;
    const converted = convertEmojiShortcodes(rawVal);
    setInputContent(converted);

    const socket = getSocket();
    if (!socket || !selectedConversationId) return;

    if (!isTypingEmittedRef.current) {
      socket.emit("typing:start", { conversationId: selectedConversationId });
      isTypingEmittedRef.current = true;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing:stop", { conversationId: selectedConversationId });
      isTypingEmittedRef.current = false;
    }, 500);
  };

  // Keyboard shortcut: Shift + Enter for multiline / Enter to send
  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter") {
      if (e.shiftKey) {
        // Shift + Enter: Allow natural newline in textarea
        return;
      }

      // Check if on touch-only mobile screen (virtual keyboard without physical shift key)
      const isTouchOnly =
        typeof window !== "undefined" &&
        window.matchMedia("(hover: none) and (pointer: coarse)").matches;

      if (isTouchOnly) {
        // Soft keyboards on mobile phones can use Return to add new lines;
        // user can tap the dedicated Send button to submit.
        return;
      }

      // Hardware/Desktop keyboard: Enter sends the message!
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize chat textarea to fit multiline content up to max-height (140px)
  useEffect(() => {
    const textarea = chatInputRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const computedHeight = Math.min(Math.max(textarea.scrollHeight, 40), 140);
    textarea.style.height = `${computedHeight}px`;
  }, [inputContent]);

  // Send message handler (Socket with automatic HTTP fallback)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = inputContent.trim();
    if (!content || !selectedConversationId) return;

    const targetConvId = selectedConversationId;
    const replyId = replyingToMessage?._id || undefined;

    // Reset input fields immediately so user experiences zero latency
    setInputContent("");
    setReplyingToMessage(null);
    if (chatInputRef.current) {
      chatInputRef.current.style.height = "auto";
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    isTypingEmittedRef.current = false;

    let socket = getSocket();
    if (!socket || !socket.connected) {
      socket = connectSocket();
    }

    if (socket && socket.connected) {
      socket.emit("typing:stop", { conversationId: targetConvId });
      socket.emit("message:send", {
        conversationId: targetConvId,
        content,
        replyToId: replyId,
      });
    } else {
      // Fallback: If socket is connecting or offline, send via HTTP endpoint
      try {
        const savedMsg = await sendMessageApi(targetConvId, content, replyId);
        if (savedMsg) {
          handleNewMessage(savedMsg);
        }
      } catch (httpErr) {
        console.error("[MESSAGES] Failed to send message via HTTP API:", httpErr);
      }
    }

    setTimeout(() => {
      scrollToBottom("smooth");
    }, 50);
  };

  const handleSelectConversation = (id: string) => {
    if (id === selectedConversationId) {
      // Re-clicking the same conversation: clear unread divider and scroll to bottom
      queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
        queryKeys.conversations.messages(id),
        (oldData) => {
          if (!oldData) return oldData;
          const markRead = (m: ChatMessage) => ({ ...m, isRead: true });
          if ("pages" in oldData) {
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                data: page.data.map(markRead),
              })),
            };
          }
          if ("data" in oldData && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.map(markRead),
            };
          }
          return oldData;
        }
      );
      unreadCutoffRef.current = { convId: id, messageId: null, initialUnreadCount: 0 };
      scrollToBottom("smooth");
      return;
    }

    // When switching away from a previously selected conversation, mark its messages in cache as read
    // so that opening it a second time shows zero unread messages!
    if (selectedConversationId) {
      queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
        queryKeys.conversations.messages(selectedConversationId),
        (oldData) => {
          if (!oldData) return oldData;
          const markRead = (m: ChatMessage) => ({ ...m, isRead: true });
          if ("pages" in oldData) {
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                data: page.data.map(markRead),
              })),
            };
          }
          if ("data" in oldData && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.map(markRead),
            };
          }
          return oldData;
        }
      );
    }

    // Capture unread count before updating sidebar state
    const targetConv = conversations.find((c) => c._id === id);
    const unreadCount = targetConv?.unreadCount || (targetConv?.hasUnread ? 1 : 0);

    initialPositionedConvIdRef.current = null;
    unreadCutoffRef.current = {
      convId: id,
      messageId: null,
      initialUnreadCount: unreadCount,
    };

    setSelectedConversationId(id);
    setSearchParams({ conversationId: id });
    setShowScrollBottom(false);
    setUnreadBelowCount(0);

    // Mark as read in local cache immediately for fast responsive UI
    queryClient.setQueryData<Conversation[]>(
      queryKeys.conversations.all,
      (old = []) =>
        old.map((c) =>
          c._id === id ? { ...c, hasUnread: false, unreadCount: 0 } : c
        )
    );
  };

  // Keep selected conversation unread state cleared in sidebar
  useEffect(() => {
    if (selectedConversationId) {
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations.all,
        (old = []) =>
          old.map((c) =>
            c._id === selectedConversationId
              ? { ...c, hasUnread: false, unreadCount: 0 }
              : c
          )
      );
    }
  }, [selectedConversationId, queryClient]);

  const handleBackToList = () => {
    if (selectedConversationId) {
      queryClient.setQueryData<InfiniteData<MessagesResponse> | MessagesResponse>(
        queryKeys.conversations.messages(selectedConversationId),
        (oldData) => {
          if (!oldData) return oldData;
          const markRead = (m: ChatMessage) => ({ ...m, isRead: true });
          if ("pages" in oldData) {
            return {
              ...oldData,
              pages: oldData.pages.map((page) => ({
                ...page,
                data: page.data.map(markRead),
              })),
            };
          }
          if ("data" in oldData && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: oldData.data.map(markRead),
            };
          }
          return oldData;
        }
      );
    }
    initialPositionedConvIdRef.current = null;
    unreadCutoffRef.current = { convId: "", messageId: null, initialUnreadCount: 0 };
    setSelectedConversationId(null);
    setSearchParams({});
  };

  const otherParticipantId =
    otherParticipant?._id?.toString() || (otherParticipant as any)?.id?.toString() || "";
  const isFollowingOther = Boolean(otherParticipant?.isFollowing);
  const isOtherUserOnline = Boolean(
    isFollowingOther && otherParticipantId && onlineUserIds.has(otherParticipantId)
  );

  return (
    <div
      className={`chat-page-layout ${
        selectedConversationId ? "has-active-chat" : "no-active-chat"
      }`}
    >
      {/* Sidebar: Conversation List */}
      <aside className="chat-sidebar">
        <div className="chat-sidebar-header">
          <h3 className="chat-sidebar-title">MESSAGES</h3>
        </div>

        <div className="chat-inbox-list">
          {conversationsLoading ? (
            <div style={{ padding: "48px 16px", display: "flex", justifyContent: "center" }}>
              <RubiksLoader text="SYNCING COMMS" size="sm" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="chat-empty-inbox">
              <p>no conversations yet.</p>
              <small>explore creators and click 'message' to connect.</small>
            </div>
          ) : (
            conversations.map((conv) => {
              const other = conv.participants?.find(
                (p) => (p?._id || (p as any)?.id) !== currentUserId
              );
              const otherId = other?._id?.toString() || (other as any)?.id?.toString() || "";
              const isSelected = conv._id === selectedConversationId;
              const isFollowing = Boolean(other?.isFollowing);
              const isOnline = Boolean(isFollowing && otherId && onlineUserIds.has(otherId));
              const isTypingHere = Boolean(typingConversations[conv._id]);

              const isUnread =
                Boolean(conv.unreadCount && conv.unreadCount > 0) ||
                Boolean(conv.hasUnread);

              return (
                <div
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv._id)}
                  className={`chat-inbox-item ${isSelected ? "selected" : ""} ${
                    isUnread ? "unread" : ""
                  }`}
                >
                  <div className="chat-avatar-wrapper">
                    {other?.profilePicUrl ? (
                      <img
                        src={other.profilePicUrl}
                        alt={other.username}
                        className="chat-avatar-img"
                      />
                    ) : (
                      <div className="chat-avatar-fallback">
                        {(other?.name || other?.username || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isFollowing && (
                      <span
                        className={`chat-presence-dot ${isOnline ? "online" : "offline"}`}
                        title={isOnline ? "Online" : "Offline"}
                      />
                    )}
                  </div>

                  <div className="chat-inbox-info">
                    <div className="chat-inbox-top">
                      <span className="chat-inbox-name">
                        {other?.name || other?.username || "Unknown"}
                      </span>
                      <div className="chat-inbox-meta">
                        {isTypingHere ? (
                          <span className="chat-inbox-typing-status" title="Typing...">
                            typing
                            <span className="chat-typing-dots mini">
                              <span className="typing-dot" />
                              <span className="typing-dot" />
                              <span className="typing-dot" />
                            </span>
                          </span>
                        ) : (
                          <span className="chat-inbox-time">
                            {formatSidebarTimestamp(conv.updatedAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="chat-inbox-bottom">
                      <span
                        className={`chat-inbox-preview ${isUnread ? "unread" : ""}`}
                      >
                        {conv.lastMessage?.content
                          ? conv.lastMessage.content
                          : "Start a conversation"}
                      </span>
                      {isUnread && (
                        <span
                          className="chat-unread-badge"
                          title={`${conv.unreadCount || 1} unread messages`}
                        >
                          {conv.unreadCount && conv.unreadCount > 99
                            ? "99+"
                            : conv.unreadCount || 1}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main-panel">
        {selectedConversationId && otherParticipant ? (
          <>
            {/* Chat Header */}
            <header className="chat-header">
              <div className="chat-header-user">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="chat-back-btn"
                  aria-label="Back to conversations list"
                  title="Back to conversations"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
                <div className="chat-avatar-wrapper">
                  {otherParticipant.profilePicUrl ? (
                    <img
                      src={otherParticipant.profilePicUrl}
                      alt={otherParticipant.username}
                      className="chat-avatar-img"
                    />
                  ) : (
                    <div className="chat-avatar-fallback">
                      {(otherParticipant.name || otherParticipant.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                  {isFollowingOther && (
                    <span
                      className={`chat-presence-dot ${isOtherUserOnline ? "online" : "offline"}`}
                      title={isOtherUserOnline ? "Online" : "Offline"}
                    />
                  )}
                </div>

                <div className="chat-header-details">
                  <Link
                    to={`/profile/${otherParticipantId}`}
                    className="chat-header-name"
                  >
                    {otherParticipant.name || otherParticipant.username}
                  </Link>
                  {isFollowingOther && (
                    <div className="chat-header-status">
                      <span className={`status-indicator ${isOtherUserOnline ? "online" : "offline"}`}>
                        {isOtherUserOnline ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="chat-header-actions">
                <button
                  type="button"
                  className={`chat-header-select-btn ${isSelectMode ? "active" : ""}`}
                  onClick={toggleSelectMode}
                  title={isSelectMode ? "Exit selection mode" : "Select messages"}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 11 12 14 22 4" />
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  <span>{isSelectMode ? "Cancel" : "Select"}</span>
                </button>
              </div>
            </header>

            {/* Message History Feed */}
            <div
              ref={chatMessagesContainerRef}
              className="chat-messages-container"
              onScroll={handleMessagesScroll}
            >
              {messagesLoading ? (
                <div className="chat-loading-wrap" style={{ padding: "48px 0" }}>
                  <RubiksLoader text="DECRYPTING TRANSMISSIONS" size="sm" />
                </div>
              ) : displayMessages.length === 0 ? (
                <div className="chat-empty-conversation">
                  <p className="chat-empty-title">No messages yet</p>
                  <small className="chat-empty-subtitle">Send a message to start the conversation.</small>
                </div>
              ) : (
                <>
                  {hasNextPage && (
                    <div className="chat-load-older-wrap">
                      <button
                        type="button"
                        onClick={handleLoadEarlier}
                        disabled={isFetchingNextPage}
                        className="chat-load-older-btn"
                        aria-label="Load earlier messages"
                      >
                        {isFetchingNextPage ? (
                          <span className="chat-load-older-loading">
                            <span>Loading earlier messages</span>
                            <span className="chat-typing-dots">
                              <span className="typing-dot" />
                              <span className="typing-dot" />
                              <span className="typing-dot" />
                            </span>
                          </span>
                        ) : (
                          <span>↑ Load earlier messages</span>
                        )}
                      </button>
                    </div>
                  )}

                  {!hasNextPage && displayMessages.length >= 10 && (
                    <div className="chat-conversation-start-pill">
                      <span>Beginning of conversation history</span>
                    </div>
                  )}

                  {displayMessages.map((msg, idx) => {
                    const isSender =
                      msg.sender?._id === currentUserId ||
                      (typeof msg.sender === "string" && msg.sender === currentUserId);

                    const prevMsg = idx > 0 ? displayMessages[idx - 1] : null;
                    const showDateDivider =
                      !prevMsg ||
                      !isSameDay(new Date(prevMsg.createdAt), new Date(msg.createdAt));

                    const fullTimestampTooltip = new Date(msg.createdAt).toLocaleString(
                      undefined,
                      {
                        dateStyle: "full",
                        timeStyle: "short",
                      }
                    );

                    return (
                      <React.Fragment key={msg._id}>
                        {showDateDivider && (
                          <div className="chat-date-divider-row">
                            <span className="chat-date-divider-line" />
                            <span className="chat-date-divider-pill">
                              {formatDateDivider(msg.createdAt)}
                            </span>
                            <span className="chat-date-divider-line" />
                          </div>
                        )}
                        {unreadCutoffMessageId === msg._id && (
                          <div id="chat-unread-divider" className="chat-unread-divider-row">
                            <span className="chat-unread-divider-line" />
                            <span className="chat-unread-divider-pill">
                              <svg
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M12 5v14" />
                                <path d="M19 12l-7 7-7-7" />
                              </svg>
                              NEW MESSAGES
                            </span>
                            <span className="chat-unread-divider-line" />
                          </div>
                        )}
                        <ChatMessageRow
                          msg={msg}
                          isSender={isSender}
                          isSelected={selectedMessageIds.has(msg._id)}
                          isSelectMode={isSelectMode}
                          isEditing={editingMessageId === msg._id}
                          editingContent={editingContent}
                          editInputRef={editInputRef}
                          currentUserId={currentUserId}
                          fullTimestampTooltip={fullTimestampTooltip}
                          onStartEditing={startEditing}
                          onCancelEditing={cancelEditing}
                          onSubmitEdit={submitEdit}
                          onSetEditingContent={setEditingContent}
                          onStartReplying={startReplying}
                          onOpenDeleteModal={openSingleDeleteModal}
                          onToggleSelectMessage={toggleSelectMessage}
                          onScrollToMessage={scrollToMessage}
                        />
                      </React.Fragment>
                    );
                  })}
                </>
              )}

              {/* Real-time Typing Indicator Bubble */}
              {remoteTypingUserId && (
                <div className="chat-message-bubble-row incoming">
                  <div className="chat-typing-indicator-bubble">
                    <span className="chat-typing-text">
                      {otherParticipant.name || otherParticipant.username} is typing
                    </span>
                    <span className="chat-typing-dots">
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                      <span className="typing-dot" />
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Scroll to Bottom Floating Pill */}
            {showScrollBottom && (
              <button
                type="button"
                onClick={() => scrollToBottom("smooth")}
                className={`chat-scroll-to-bottom-btn ${
                  unreadBelowCount > 0 ? "has-unread" : ""
                }`}
                title="Scroll to newest messages"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 5v14M19 12l-7 7-7-7" />
                </svg>
                {unreadBelowCount > 0 ? (
                  <>
                    <span>{unreadBelowCount > 1 ? "new messages" : "new message"}</span>
                    <span className="chat-scroll-unread-badge">
                      {unreadBelowCount}
                    </span>
                  </>
                ) : (
                  <span>latest</span>
                )}
              </button>
            )}

            {/* Multi-Select Action Dock or Input Form */}
            {isSelectMode ? (
              <div className="chat-select-dock">
                <div className="chat-select-dock-info">
                  <span className="chat-select-count">
                    {selectedMessageIds.size} message{selectedMessageIds.size === 1 ? "" : "s"} selected
                  </span>
                  <button
                    type="button"
                    className="chat-select-dock-link"
                    onClick={handleToggleSelectAll}
                  >
                    {selectedMessageIds.size === displayMessages.length && displayMessages.length > 0
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
                <div className="chat-select-dock-actions">
                  <button
                    type="button"
                    className="chat-select-dock-btn cancel"
                    onClick={exitSelectMode}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="chat-select-dock-btn delete"
                    disabled={selectedMessageIds.size === 0}
                    onClick={openBatchDeleteModal}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete ({selectedMessageIds.size})
                  </button>
                </div>
              </div>
            ) : (
              <div className="chat-input-container">
                {replyingToMessage && (
                  <div className="chat-reply-dock-bar">
                    <div className="chat-reply-dock-main">
                      <div className="chat-reply-dock-meta">
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="9 17 4 12 9 7" />
                          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
                        </svg>
                        <span>
                          Replying to{" "}
                          <strong>
                            {(replyingToMessage.sender?._id === currentUserId ||
                              (typeof replyingToMessage.sender === "string" &&
                                replyingToMessage.sender === currentUserId))
                              ? "yourself"
                              : replyingToMessage.sender?.name ||
                                replyingToMessage.sender?.username ||
                                "user"}
                          </strong>
                        </span>
                      </div>
                      <p className="chat-reply-dock-text">
                        {replyingToMessage.content}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={cancelReplying}
                      className="chat-reply-dock-cancel"
                      title="Cancel reply (Esc)"
                      aria-label="Cancel reply"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="chat-input-bar">
                  <EmojiPicker onSelect={handleEmojiSelect} placement="top-left" />
                  <textarea
                    ref={chatInputRef}
                    rows={1}
                    value={inputContent}
                    onChange={handleInputChange}
                    onKeyDown={handleChatKeyDown}
                    placeholder={
                      replyingToMessage
                        ? "Type your reply..."
                        : `message ${otherParticipant.name || otherParticipant.username}...`
                    }
                    className="chat-input-field"
                  />
                  <button
                    type="submit"
                    disabled={!inputContent.trim()}
                    className="chat-send-btn"
                    title="Send message (Enter)"
                    aria-label="Send message"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="chat-placeholder-state">
            <div className="chat-placeholder-box">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="chat-placeholder-svg"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <h3 className="chat-placeholder-title">[ select conversation ]</h3>
              <p className="chat-placeholder-desc">
                Choose an ongoing channel from the sidebar or message a creator to begin communication.
              </p>
            </div>
          </div>
        )}

        {/* Delete Message Confirmation Modal (portalled to body to escape DeckLayout transform) */}
        {deleteModal?.isOpen &&
          createPortal(
            <div className="chat-delete-modal-overlay" onClick={closeDeleteModal}>
              <div
                className="chat-delete-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="chat-delete-modal-header">
                  <h4 className="chat-delete-modal-title">
                    [ DELETE MESSAGE{deleteModal.isBatch ? "S" : ""} ]
                  </h4>
                </div>
                <p className="chat-delete-modal-body">
                  {deleteModal.isBatch ? (
                    canDeleteForEveryone ? (
                      `Are you sure you want to delete ${selectedMessageIds.size} selected message${
                        selectedMessageIds.size === 1 ? "" : "s"
                      }?`
                    ) : (
                      `You have selected ${selectedMessageIds.size} message${
                        selectedMessageIds.size === 1 ? "" : "s"
                      }, including incoming messages. You can delete them for yourself.`
                    )
                  ) : canDeleteForEveryone ? (
                    "Choose whether you want to delete this message only for yourself or for everyone in the conversation."
                  ) : (
                    "This message will be removed from your view. Other participants will still be able to see it."
                  )}
                </p>
                <div className="chat-delete-modal-options">
                  {canDeleteForEveryone && (
                    <button
                      type="button"
                      onClick={() => handleConfirmDelete("for_everyone")}
                      className="chat-modal-btn delete-everyone"
                    >
                      Delete for Everyone
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleConfirmDelete("for_me")}
                    className="chat-modal-btn delete-me"
                  >
                    Delete for Me
                  </button>
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    className="chat-modal-btn cancel"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </main>
    </div>
  );
};

export default Messages;
