import { useState } from "react";
import { Link } from "react-router-dom";
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

  const handleFollowToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div className="user-card">
      <div className="user-card-left">
        <Link to={`/profile/${user._id}`} className="user-avatar" style={{ textDecoration: "none" }}>
          {initialLetter}
        </Link>
        <div className="user-details">
          <div className="user-meta-row">
            <Link to={`/profile/${user._id}`} className="user-display-name" style={{ textDecoration: "none" }}>
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
