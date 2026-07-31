import { useState } from "react";
import { toggleFollowUser } from "../services/follow.service";
import type { SuggestedUser } from "../services/explore.service";

interface UserCardProps {
  user: SuggestedUser;
  onFollowStateChange?: (userId: string, isFollowing: boolean) => void;
}

const UserCard = ({ user, onFollowStateChange }: UserCardProps) => {
  const [isFollowing, setIsFollowing] = useState(user.isFollowing || false);
  const [followersCount, setFollowersCount] = useState(user.followersCount || 0);
  const [loading, setLoading] = useState(false);

  const handleFollowToggle = async () => {
    if (loading) return;

    try {
      setLoading(true);
      const result = await toggleFollowUser(user._id);
      setIsFollowing(result.following);
      setFollowersCount(result.followersCount);
      if (onFollowStateChange) {
        onFollowStateChange(user._id, result.following);
      }
    } catch (err) {
      console.error("Failed to toggle follow status", err);
    } finally {
      setLoading(false);
    }
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + "M";
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + "k";
    }
    return count.toString();
  };

  const initialLetter = (user.name || user.username || "U").charAt(0).toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        gap: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            backgroundColor: "#6366f1",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: "18px",
            flexShrink: 0,
          }}
        >
          {initialLetter}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "8px" }}>
            <h4
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 600,
                color: "#111827",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.name || user.username}
            </h4>
            <span style={{ fontSize: "13px", color: "#6b7280" }}>
              @{user.username}
            </span>
          </div>
          {user.bio && (
            <p
              style={{
                margin: "4px 0 0 0",
                fontSize: "14px",
                color: "#4b5563",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.bio}
            </p>
          )}
          <span
            style={{
              display: "inline-block",
              marginTop: "4px",
              fontSize: "12px",
              color: "#9ca3af",
              fontWeight: 500,
            }}
          >
            {formatFollowers(followersCount)} {followersCount === 1 ? "Follower" : "Followers"}
          </span>
        </div>
      </div>

      <button
        onClick={handleFollowToggle}
        disabled={loading}
        style={{
          padding: "8px 18px",
          borderRadius: "20px",
          border: isFollowing ? "1px solid #d1d5db" : "none",
          backgroundColor: isFollowing ? "#f3f4f6" : "#4f46e5",
          color: isFollowing ? "#374151" : "#ffffff",
          fontWeight: 600,
          fontSize: "14px",
          cursor: loading ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          opacity: loading ? 0.6 : 1,
          flexShrink: 0,
        }}
      >
        {loading ? "..." : isFollowing ? "Following" : "Follow"}
      </button>
    </div>
  );
};

export default UserCard;
