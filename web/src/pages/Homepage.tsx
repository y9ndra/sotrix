import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import { useAuthStore } from "../store/authStore";
import { getHomeFeed } from "../services/feed.service";
import { getUnreadCount } from "../services/notification.service";
import api from "../services/api";
import type { Post } from "../types/post";

function Homepage() {
  const user = useAuthStore((state) => state.user);
  const currentUserId = user?._id || user?.id || "";

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Stats State
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchFeed = async (cursor?: string) => {
    try {
      setFeedLoading(true);
      setFeedError(null);
      const response = await getHomeFeed(cursor);
      
      if (cursor) {
        setPosts((prev) => [...prev, ...response.data]);
      } else {
        setPosts(response.data);
      }
      setNextCursor(response.pagination.nextCursor);
      setHasMore(response.pagination.hasMore);
    } catch (err) {
      setFeedError("Failed to load feed timeline");
    } finally {
      setFeedLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!currentUserId) return;
    try {
      setStatsLoading(true);
      // Fetch unread count
      const unreadRes = await getUnreadCount();
      setUnreadCount(unreadRes.data.unreadCount);

      // Fetch user profile metrics
      const userRes = await api.get(`/users/${currentUserId}`);
      const profile = userRes.data.data;
      setFollowersCount(profile.followersCount || 0);
      setFollowingCount(profile.followingCount || 0);
    } catch (err) {
      console.error("Failed to load dashboard metrics", err);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFeed();
      fetchStats();
    }
  }, [user]);

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
    fetchStats();
  };

  const loadMorePosts = () => {
    if (nextCursor && hasMore && !feedLoading) {
      fetchFeed(nextCursor);
    }
  };

  if (!user) return null;

  return (
    <div>
      <div className="dashboard-container">
        {/* Welcome Section */}
        <div className="home-welcome">
          <h2>Yo <span className="welcome-highlight">@{user.username}</span>, what we got tdy?</h2>
        </div>

        {/* Create Post composer */}
        <CreatePost onPostCreated={handlePostCreated} />

        {/* Network Snapshot badges */}
        <div className="network-snapshot">
          <Link to="/notifications" className="snapshot-card">
            <span className="snapshot-number">{statsLoading ? ".." : unreadCount}</span>
            <span className="snapshot-label">unread updates</span>
          </Link>
          <Link to={`/profile/${currentUserId}`} className="snapshot-card">
            <span className="snapshot-number">{statsLoading ? ".." : followersCount}</span>
            <span className="snapshot-label">followers</span>
          </Link>
          <Link to={`/profile/${currentUserId}`} className="snapshot-card">
            <span className="snapshot-number">{statsLoading ? ".." : followingCount}</span>
            <span className="snapshot-label">following</span>
          </Link>
        </div>

        {/* Timeline feed */}
        <h3 className="section-title">home feed</h3>

        {feedError && <p style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "13px" }}>{feedError}</p>}

        <div className="posts-list" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>

        {posts.length === 0 && !feedLoading && !feedError && (
          <p style={{ color: "var(--text-muted)", textAlign: "center", marginTop: "20px", fontFamily: "var(--font-mono)", fontSize: "13px" }}>
            [ no posts in your feed yet ]
          </p>
        )}

        {feedLoading && <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px", marginTop: "12px" }}>loading feed...</p>}

        {posts.length > 0 && hasMore && !feedLoading && (
          <button onClick={loadMorePosts} className="btn" style={{ marginTop: "12px" }}>
            show more posts
          </button>
        )}
      </div>
    </div>
  );
}

export default Homepage;
