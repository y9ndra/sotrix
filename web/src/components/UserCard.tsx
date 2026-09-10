import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toggleFollowUser } from "../services/follow.service";
import type { SuggestedUser } from "../services/explore.service";
import { queryKeys } from "../lib/queryKeys";

interface UserCardProps {
  user: SuggestedUser;
  onFollowStateChange?: (userId: string, isFollowing: boolean) => void;
}

const UserCard = ({ user, onFollowStateChange }: UserCardProps) => {
  const queryClient = useQueryClient();
  const targetUserId = user._id || (user as any).id || "";
  const [isFollowing, setIsFollowing] = useState(Boolean(user.isFollowing));
  const [followersCount, setFollowersCount] = useState(user.followersCount || 0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsFollowing(Boolean(user.isFollowing));
    setFollowersCount(user.followersCount || 0);
  }, [user.isFollowing, user.followersCount]);

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading || !targetUserId) return;

    try {
      setLoading(true);
      const result = await toggleFollowUser(targetUserId);
      setIsFollowing(result.following);
      setFollowersCount(result.followersCount);
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed });
      if (onFollowStateChange) {
        onFollowStateChange(targetUserId, result.following);
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
    <div className="user-card">
      <div className="user-card-left">
        <div style={{ position: "relative", display: "inline-block" }}>
          <Link to={`/profile/${targetUserId}`} className="user-avatar" style={{ textDecoration: "none", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {user.profilePicUrl ? (
              <img
                src={user.profilePicUrl}
                alt={user.username}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              initialLetter
            )}
          </Link>
        </div>
        <div className="user-details">
          <div className="user-meta-row">
            <Link to={`/profile/${targetUserId}`} className="user-display-name" style={{ textDecoration: "none" }}>
              {user.name || user.username}
            </Link>
            <span className="user-username-tag">
              @{user.username}
            </span>
          </div>
          {user.bio && (
            <p className="user-card-bio">
              {user.bio}
            </p>
          )}
          <span className="user-card-stats">
            {formatFollowers(followersCount)} {followersCount === 1 ? "follower" : "followers"}
          </span>
        </div>
      </div>

      <button
        onClick={handleFollowToggle}
        disabled={loading}
        className={`user-follow-btn ${isFollowing ? "following" : "unfollowed"}`}
      >
        {loading ? "..." : isFollowing ? "following" : "follow"}
      </button>
    </div>
  );
};

export default UserCard;
