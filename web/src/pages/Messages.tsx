import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { usePresenceStore } from "../store/presenceStore";
import { getSocket } from "../services/socket.service";
import { queryKeys } from "../lib/queryKeys";
import { getConversations, getConversation, getMessages } from "../services/chat.service";
import type { Conversation, ChatMessage, MessagesResponse } from "../types/chat.types";

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

  const isTypingEmittedRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatMessagesContainerRef = useRef<HTMLDivElement | null>(null);

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
  });

  // Messages are returned newest-first from backend: reverse for natural bottom-up chat display
  const rawMessages: ChatMessage[] = messagesResponse?.data ?? [];
  const displayMessages = [...rawMessages].reverse();

  // Fetch active conversation details directly if selected
  const { data: directConversation } = useQuery({
    queryKey: queryKeys.conversations.detail(selectedConversationId || ""),
    queryFn: () => getConversation(selectedConversationId!),
    enabled: !!selectedConversationId,
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

  // Scroll messages container internally without scrolling parent ancestors
  useEffect(() => {
    const container = chatMessagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  }, [displayMessages.length, selectedConversationId, remoteTypingUserId]);

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

    // Handle new incoming canonical message
    const handleNewMessage = (newMsg: ChatMessage) => {
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

      // Invalidate conversations list to bubble up updatedAt timestamp
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
    };

    // Handle typing events
    const handleTypingStart = ({
      conversationId,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => {
      if (conversationId === selectedConversationId && userId !== currentUserId) {
        setRemoteTypingUserId(userId);
      }
    };

    const handleTypingStop = ({
      conversationId,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }) => {
      if (conversationId === selectedConversationId && userId !== currentUserId) {
        setRemoteTypingUserId(null);
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);

    return () => {
      // Leave room on cleanup
      socket.emit("conversation:leave", selectedConversationId);
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
      setRemoteTypingUserId(null);
    };
  }, [selectedConversationId, currentUserId, queryClient]);

  // Debounced Typing input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputContent(e.target.value);

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
  };

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setSearchParams({ conversationId: id });
  };

  const handleBackToList = () => {
    setSelectedConversationId(null);
    setSearchParams({});
  };

  const otherParticipantId =
    otherParticipant?._id?.toString() || (otherParticipant as any)?.id?.toString() || "";
  const isOtherUserOnline = Boolean(
    otherParticipantId && onlineUserIds.has(otherParticipantId)
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
          <span className="chat-sidebar-count">({conversations.length})</span>
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
              const isOnline = Boolean(otherId && onlineUserIds.has(otherId));

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
                    <span
                      className={`chat-presence-dot ${isOnline ? "online" : "offline"}`}
                      title={isOnline ? "Online" : "Offline"}
                    />
                  </div>

                  <div className="chat-inbox-info">
                    <div className="chat-inbox-top">
                      <span className="chat-inbox-name">
                        {other?.name || other?.username || "Unknown"}
                      </span>
                      <span className="chat-inbox-time">
                        {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <span className="chat-inbox-username">@{other?.username}</span>
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
                  <span
                    className={`chat-presence-dot ${isOtherUserOnline ? "online" : "offline"}`}
                  />
                </div>

                <div className="chat-header-details">
                  <Link
                    to={`/profile/${otherParticipantId}`}
                    className="chat-header-name"
                  >
                    {otherParticipant.name || otherParticipant.username}
                  </Link>
                  <div className="chat-header-status">
                    <span className={`status-indicator ${isOtherUserOnline ? "online" : "offline"}`}>
                      {isOtherUserOnline ? "ONLINE" : "OFFLINE"}
                    </span>
                    <span className="chat-header-handle">@{otherParticipant.username}</span>
                  </div>
                </div>
              </div>
            </header>

            {/* Message History Feed */}
            <div ref={chatMessagesContainerRef} className="chat-messages-container">
              {messagesLoading ? (
                <div className="chat-loading-wrap">
                  <p className="chat-loading-label">fetching transmission history...</p>
                </div>
              ) : displayMessages.length === 0 ? (
                <div className="chat-empty-conversation">
                  <p className="chat-empty-title">[ channel with @{otherParticipant.username} ]</p>
                  <small className="chat-empty-subtitle">no messages yet. send a transmission to start the conversation.</small>
                </div>
              ) : (
                displayMessages.map((msg) => {
                  const isSender =
                    msg.sender?._id === currentUserId ||
                    (typeof msg.sender === "string" && msg.sender === currentUserId);

                  return (
                    <div
                      key={msg._id}
                      className={`chat-message-bubble-row ${isSender ? "outgoing" : "incoming"}`}
                    >
                      <div className={`chat-message-bubble ${isSender ? "mine" : "theirs"}`}>
                        <p className="chat-message-text">{msg.content}</p>
                        <span className="chat-message-timestamp">
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Real-time Typing Indicator Bubble */}
              {remoteTypingUserId && (
                <div className="chat-message-bubble-row incoming">
                  <div className="chat-typing-indicator-bubble">
                    <span className="chat-typing-text">
                      @{otherParticipant.username} is typing
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

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <input
                type="text"
                value={inputContent}
                onChange={handleInputChange}
                placeholder={`message @${otherParticipant.username}...`}
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
