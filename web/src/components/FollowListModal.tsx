import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  getFollowers,
  getFollowing,
  toggleFollowUser,
  type FollowUserItem,
} from "../services/follow.service";
import { useAuthStore } from "../store/authStore";
import { invalidateFollowQueries, updateUserInAllUserCaches } from "../lib/queryCache";
import RubiksLoader from "./RubiksLoader";
import { isDemoUser } from "../utils/demo";
import { useDemoModalStore } from "../store/demoModalStore";

interface FollowListModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  initialTab?: "followers" | "following";
  followersCount?: number;
  followingCount?: number;
  onFollowStateChange?: (targetUserId: string, isFollowing: boolean) => void;
}

export const FollowListModal: React.FC<FollowListModalProps> = ({
  isOpen,
  onClose,
  userId,
  initialTab = "followers",
  onFollowStateChange,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?._id || (currentUser as any)?.id;

  const [activeTab, setActiveTab] = useState<"followers" | "following">(initialTab);
  const [users, setUsers] = useState<FollowUserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Sync tab and search when initialTab changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setSearchQuery("");
      setDebouncedQuery("");
    }
  }, [isOpen, initialTab]);

  // Debounce search query input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch users from server when tab, userId, or debouncedQuery changes
  const fetchUsers = useCallback(
    async (
      tab: "followers" | "following",
      cursor?: string,
      isAppend = false,
      query?: string
    ) => {
      if (!userId) return;

      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const fetcher = tab === "followers" ? getFollowers : getFollowing;
        const res = await fetcher(userId, 20, cursor, query);

        if (res && res.data) {
          setUsers((prev) => (isAppend ? [...prev, ...res.data] : res.data));
          setHasMore(Boolean(res.pagination?.hasMore));
          setNextCursor(res.pagination?.nextCursor || null);
        }
      } catch (err: any) {
        console.error("Failed to load follow list:", err);
        setError(err?.response?.data?.message || err.message || "Failed to load users");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    if (isOpen) {
      fetchUsers(activeTab, undefined, false, debouncedQuery);
    } else {
      setUsers([]);
      setNextCursor(null);
      setHasMore(false);
    }
  }, [isOpen, activeTab, debouncedQuery, fetchUsers]);

  const handleTabChange = (tab: "followers" | "following") => {
    if (tab !== activeTab) {
      setActiveTab(tab);
      setSearchQuery("");
      setDebouncedQuery("");
    }
  };

  // Handle ESC key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Handle follow / unfollow toggle
  const handleToggleFollow = async (e: React.MouseEvent, targetUser: FollowUserItem) => {
    e.stopPropagation();
    if (isDemoUser(currentUser)) {
      useDemoModalStore.getState().openDemoModal("following creators");
      return;
    }
    if (actionLoadingId) return;

    setActionLoadingId(targetUser._id);
    const prevFollowing = targetUser.isFollowing;

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) =>
        u._id === targetUser._id ? { ...u, isFollowing: !prevFollowing } : u
      )
    );

    try {
      const res = await toggleFollowUser(targetUser._id);
      // Sync with server confirmation
      setUsers((prev) =>
        prev.map((u) =>
          u._id === targetUser._id ? { ...u, isFollowing: res.following } : u
        )
      );

      updateUserInAllUserCaches(queryClient, targetUser._id, res.following, res.followersCount);
      await invalidateFollowQueries(queryClient, targetUser._id);

      if (onFollowStateChange) {
        onFollowStateChange(targetUser._id, res.following);
      }
    } catch (err) {
      console.error("Failed to toggle follow status:", err);
      // Revert on failure
      setUsers((prev) =>
        prev.map((u) =>
          u._id === targetUser._id ? { ...u, isFollowing: prevFollowing } : u
        )
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUserClick = (targetUserId: string) => {
    onClose();
    navigate(`/profile/${targetUserId}`);
  };

  const handleLoadMore = () => {
    if (hasMore && nextCursor && !loadingMore) {
      fetchUsers(activeTab, nextCursor, true, debouncedQuery);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="settings-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="settings-modal-card follow-list-modal-card"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: "480px", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
      >
        {/* Modal Header with Tabs */}
        <div
          className="settings-modal-header"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            padding: "16px 20px 12px 20px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            {/* Tabs */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                onClick={() => handleTabChange("followers")}
                className={`profile-filter-btn ${activeTab === "followers" ? "active" : ""}`}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  background: activeTab === "followers" ? "var(--accent-primary)" : "var(--bg-card)",
                  color: activeTab === "followers" ? "#ffffff" : "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                followers
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("following")}
                className={`profile-filter-btn ${activeTab === "following" ? "active" : ""}`}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "6px 14px",
                  borderRadius: "20px",
                  background: activeTab === "following" ? "var(--accent-primary)" : "var(--bg-card)",
                  color: activeTab === "following" ? "#ffffff" : "var(--text-secondary)",
                  border: "1px solid var(--border-default)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                following
              </button>
            </div>

            <button
              onClick={onClose}
              className="settings-close-btn"
              title="Close modal"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ width: "100%", position: "relative" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              style={{
                width: "100%",
                padding: "8px 14px 8px 34px",
                background: "var(--bg-input, var(--bg-card))",
                border: "1px solid var(--border-default)",
                borderRadius: "8px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <svg
              style={{
                position: "absolute",
                left: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "14px",
                height: "14px",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setDebouncedQuery("");
                }}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Modal List Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 0",
            minHeight: "220px",
          }}
        >
          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "44px 20px",
              }}
            >
              <RubiksLoader
                size="sm"
                text={`FETCHING ${activeTab.toUpperCase()}`}
              />
            </div>
          )}

          {error && !loading && (
            <div
              style={{
                padding: "24px 20px",
                textAlign: "center",
                color: "var(--color-danger, #ef4444)",
                fontSize: "13px",
              }}
            >
              {error}
            </div>
          )}

          {!loading && !error && users.length === 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px 20px",
                textAlign: "center",
                color: "var(--text-muted)",
                gap: "8px",
              }}
            >
              <svg
                style={{ width: "36px", height: "36px", stroke: "currentColor", opacity: 0.5 }}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              <span style={{ fontSize: "14px", fontWeight: 500 }}>
                {debouncedQuery || searchQuery
                  ? `no matches for "${searchQuery}"`
                  : activeTab === "followers"
                  ? "no followers yet"
                  : "not following anyone yet"}
              </span>
            </div>
          )}

          {!loading &&
            users.map((item) => {
              const isMe = currentUserId === item._id;
              const initialLetter = (item.name || item.username || "U").charAt(0).toUpperCase();

              return (
                <div
                  key={item._id}
                  onClick={() => handleUserClick(item._id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 20px",
                    gap: "12px",
                    cursor: "pointer",
                    transition: "background 0.15s ease",
                  }}
                  className="follow-user-row"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {/* Avatar & User Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        flexShrink: 0,
                        backgroundColor: "var(--bg-card)",
                        border: "1px solid var(--border-default)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 600,
                        fontSize: "16px",
                        color: "var(--text-primary)",
                      }}
                    >
                      {item.profilePicUrl ? (
                        <img
                          src={item.profilePicUrl}
                          alt={item.username}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        initialLetter
                      )}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {item.name || item.username}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        @{item.username}
                      </div>
                      {item.bio && (
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--text-secondary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            marginTop: "2px",
                          }}
                        >
                          {item.bio}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Follow Button */}
                  {!isMe && (
                    <button
                      type="button"
                      onClick={(e) => handleToggleFollow(e, item)}
                      disabled={actionLoadingId === item._id}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        flexShrink: 0,
                        border: item.isFollowing
                          ? "1px solid var(--border-default)"
                          : "1px solid transparent",
                        backgroundColor: item.isFollowing
                          ? "transparent"
                          : "var(--accent-primary, #6366f1)",
                        color: item.isFollowing ? "var(--text-primary)" : "#ffffff",
                        opacity: actionLoadingId === item._id ? 0.6 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (item.isFollowing) {
                          e.currentTarget.style.borderColor = "var(--color-danger, #ef4444)";
                          e.currentTarget.style.color = "var(--color-danger, #ef4444)";
                          e.currentTarget.innerText = "unfollow";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (item.isFollowing) {
                          e.currentTarget.style.borderColor = "var(--border-default)";
                          e.currentTarget.style.color = "var(--text-primary)";
                          e.currentTarget.innerText = "following";
                        }
                      }}
                    >
                      {item.isFollowing ? "following" : "follow"}
                    </button>
                  )}
                </div>
              );
            })}

          {/* Load More Button / Indicator */}
          {hasMore && !loading && (
            <div style={{ textAlign: "center", padding: "16px 20px" }}>
              {loadingMore ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
                  <RubiksLoader size="sm" text="LOADING MORE" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleLoadMore}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "20px",
                    background: "var(--bg-hover)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-secondary)",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    cursor: "pointer",
                  }}
                >
                  load more
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default FollowListModal;
