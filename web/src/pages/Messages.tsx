import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { usePresenceStore } from "../store/presenceStore";
import { getSocket } from "../services/socket.service";
import { queryKeys } from "../lib/queryKeys";
import {
  getConversations,
  getConversation,
  getMessages,
  markConversationAsRead,
} from "../services/chat.service";
import type { Conversation, ChatMessage, MessagesResponse } from "../types/chat.types";
import EmojiPicker from "../components/EmojiPicker";
import { convertEmojiShortcodes, insertEmojiAtCursor } from "../utils/emoji";
import { playMessageChime } from "../utils/sound";

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
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  // Smart scrolling state: track whether user is at the bottom or reading older messages
  const isAtBottomRef = useRef(true);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);
  const hasInitialScrolledRef = useRef<Record<string, boolean>>({});
  const prevMessagesLengthRef = useRef(0);

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

  // Fetch messages for selected conversation
  const { data: messagesResponse, isLoading: messagesLoading } = useQuery({
    queryKey: queryKeys.conversations.messages(selectedConversationId || ""),
    queryFn: () => getMessages(selectedConversationId!),
    enabled: !!selectedConversationId,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Messages are returned newest-first from backend: reverse for natural bottom-up chat display
  const rawMessages: ChatMessage[] = messagesResponse?.data ?? [];
  const displayMessages = [...rawMessages].reverse();

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

  // Monitor user scrolling to detect if they are reading older messages
  const handleMessagesScroll = () => {
    const container = chatMessagesContainerRef.current;
    if (!container) return;

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

  // Initial scroll to bottom when opening/switching a conversation
  useEffect(() => {
    if (
      selectedConversationId &&
      displayMessages.length > 0 &&
      !hasInitialScrolledRef.current[selectedConversationId]
    ) {
      hasInitialScrolledRef.current[selectedConversationId] = true;
      isAtBottomRef.current = true;
      setShowScrollBottom(false);
      setUnreadBelowCount(0);
      const container = chatMessagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [selectedConversationId, displayMessages.length]);

  // Handle incoming messages: ONLY auto-scroll if the user is ALREADY at the bottom
  useEffect(() => {
    const container = chatMessagesContainerRef.current;
    if (!container) return;

    const lengthDiff = displayMessages.length - prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = displayMessages.length;

    if (lengthDiff > 0) {
      if (isAtBottomRef.current) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      } else {
        // User is reading older messages: DO NOT SCROLL. Count new message below.
        setUnreadBelowCount((prev) => prev + lengthDiff);
      }
    }
  }, [displayMessages.length]);

  // When remote user starts typing: NEVER scroll if user is reading older messages!
  useEffect(() => {
    if (remoteTypingUserId && isAtBottomRef.current) {
      const container = chatMessagesContainerRef.current;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    }
  }, [remoteTypingUserId]);

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

  // Real-time Chat Room (Join/Leave), Message & Typing Listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !selectedConversationId) return;

    // Join the conversation room
    socket.emit("conversation:join", selectedConversationId);

    // Re-join room on socket reconnection
    const handleSocketConnect = () => {
      if (selectedConversationId) {
        socket.emit("conversation:join", selectedConversationId);
      }
    };
    socket.on("connect", handleSocketConnect);

    // Handle new incoming canonical message
    const handleNewMessage = (newMsg: ChatMessage) => {
      const isCurrentConversation = newMsg.conversation === selectedConversationId;
      const senderId =
        typeof newMsg.sender === "string"
          ? newMsg.sender
          : newMsg.sender?._id || (newMsg.sender as any)?.id;
      const isSentByMe = senderId === currentUserId;

      queryClient.setQueryData<MessagesResponse>(
        queryKeys.conversations.messages(newMsg.conversation),
        (oldData) => {
          if (!oldData) {
            return {
              success: true,
              data: [newMsg],
              nextCursor: null,
              hasMore: false,
            };
          }
          if (oldData.data.some((m) => m._id === newMsg._id)) {
            return oldData;
          }
          return {
            ...oldData,
            data: [newMsg, ...oldData.data],
          };
        }
      );

      // Update conversations list cache: bump to top and update hasUnread & lastMessage
      queryClient.setQueryData<Conversation[]>(
        queryKeys.conversations.all,
        (old = []) => {
          return old
            .map((conv) => {
              if (conv._id === newMsg.conversation) {
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

      // If we are actively viewing this conversation, mark as read on backend
      if (isCurrentConversation) {
        markConversationAsRead(newMsg.conversation).catch(console.error);
        socket.emit("conversation:read", { conversationId: newMsg.conversation });
      }

      // Play soft synthesized chime for incoming message from other user
      if (!isSentByMe) {
        playMessageChime();
      }
    };

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

    socket.on("message:new", handleNewMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      // Leave room on cleanup
      socket.emit("conversation:leave", selectedConversationId);
      socket.off("connect", handleSocketConnect);
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      setRemoteTypingUserId(null);
    };
  }, [selectedConversationId, currentUserId, queryClient]);

  // Sync active remote typing indicator when selected conversation changes
  useEffect(() => {
    if (selectedConversationId && typingConversations[selectedConversationId]) {
      setRemoteTypingUserId(typingConversations[selectedConversationId]);
    } else {
      setRemoteTypingUserId(null);
    }
  }, [selectedConversationId, typingConversations]);

  // Debounced Typing input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Send message handler
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputContent.trim();
    const socket = getSocket();

    if (!content || !socket || !selectedConversationId) return;

    // Send to server
    socket.emit("message:send", {
      conversationId: selectedConversationId,
      content,
    });

    // Reset typing state immediately
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    socket.emit("typing:stop", { conversationId: selectedConversationId });
    isTypingEmittedRef.current = false;

    setInputContent("");
    setTimeout(() => {
      scrollToBottom("smooth");
    }, 50);
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setSearchParams({ conversationId: id });
    isAtBottomRef.current = true;
    setShowScrollBottom(false);
    setUnreadBelowCount(0);

    // Mark as read in local cache immediately
    queryClient.setQueryData<Conversation[]>(
      queryKeys.conversations.all,
      (old = []) =>
        old.map((c) => (c._id === id ? { ...c, hasUnread: false } : c))
    );

    // Call backend API and emit socket event
    markConversationAsRead(id).catch(console.error);
    const socket = getSocket();
    if (socket) {
      socket.emit("conversation:read", { conversationId: id });
    }
  };

  // Auto-mark selected conversation as read if it has unread messages
  useEffect(() => {
    if (selectedConversationId) {
      const activeConv = conversations.find((c) => c._id === selectedConversationId);
      if (activeConv?.hasUnread) {
        queryClient.setQueryData<Conversation[]>(
          queryKeys.conversations.all,
          (old = []) =>
            old.map((c) =>
              c._id === selectedConversationId ? { ...c, hasUnread: false } : c
            )
        );
        markConversationAsRead(selectedConversationId).catch(console.error);
        const socket = getSocket();
        if (socket) {
          socket.emit("conversation:read", { conversationId: selectedConversationId });
        }
      }
    }
  }, [selectedConversationId, conversations, queryClient]);

  const handleBackToList = () => {
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
            <p className="chat-loading-label">loading conversations...</p>
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

              return (
                <div
                  key={conv._id}
                  onClick={() => handleSelectConversation(conv._id)}
                  className={`chat-inbox-item ${isSelected ? "selected" : ""}`}
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
                        {conv.hasUnread && (
                          <span className="chat-unread-dot" title="Unread message" />
                        )}
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
            </header>

            {/* Message History Feed */}
            <div
              ref={chatMessagesContainerRef}
              className="chat-messages-container"
              onScroll={handleMessagesScroll}
            >
              {messagesLoading ? (
                <div className="chat-loading-wrap">
                  <p className="chat-loading-label">loading messages...</p>
                </div>
              ) : displayMessages.length === 0 ? (
                <div className="chat-empty-conversation">
                  <p className="chat-empty-title">No messages yet</p>
                  <small className="chat-empty-subtitle">Send a message to start the conversation.</small>
                </div>
              ) : (
                displayMessages.map((msg, idx) => {
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
                      <div
                        className={`chat-message-bubble-row ${isSender ? "outgoing" : "incoming"}`}
                      >
                        <div className={`chat-message-bubble ${isSender ? "mine" : "theirs"}`}>
                          <p className="chat-message-text">{msg.content}</p>
                          <span
                            className="chat-message-timestamp"
                            title={fullTimestampTooltip}
                          >
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
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
                    <span>new message</span>
                    <span className="chat-scroll-unread-badge">
                      {unreadBelowCount}
                    </span>
                  </>
                ) : (
                  <span>latest</span>
                )}
              </button>
            )}

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <EmojiPicker onSelect={handleEmojiSelect} placement="top-left" />
              <input
                ref={chatInputRef}
                type="text"
                value={inputContent}
                onChange={handleInputChange}
                placeholder={`message ${otherParticipant.name || otherParticipant.username}...`}
                className="chat-input-field"
              />
              <button
                type="submit"
                disabled={!inputContent.trim()}
                className="chat-send-btn"
              >
                Send
              </button>
            </form>
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
      </main>
    </div>
  );
};

export default Messages;
