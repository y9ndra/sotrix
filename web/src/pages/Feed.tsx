import { useState, useEffect } from "react";
import { getHomeFeed } from "../services/feed.service";
import type { Post } from "../types/post";
import PostCard from "../components/PostCard";
import Navbar from "../components/Navbar";

interface FeedProps {
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

const Feed = ({ isAuthenticated = false, onLogout = () => {} }: FeedProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getHomeFeed();

      setPosts(response.data);
      setNextCursor(response.pagination.nextCursor);
      setHasMore(response.pagination.hasMore);
    } catch (err) {
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const loadMorePosts = async () => {
    if (!nextCursor || !hasMore) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await getHomeFeed(nextCursor);

      setPosts((previousPosts) => [
        ...previousPosts,
        ...response.data,
      ]);
      setNextCursor(response.pagination.nextCursor);
      setHasMore(response.pagination.hasMore);
    } catch (err) {
      setError("Failed to load more posts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Navbar isAuthenticated={isAuthenticated} onLogout={onLogout} />

      <div
        className="feed-container"
        style={{ maxWidth: "600px", margin: "20px auto", padding: "16px" }}
      >
        <h2 style={{ marginBottom: "20px", color: "#111827" }}>Feed</h2>

        {error && <p style={{ color: "#dc2626" }}>{error}</p>}

        <div
          className="posts-list"
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {posts.map((post) => (
            <PostCard key={post._id} post={post} />
          ))}
        </div>

        {posts.length === 0 && !loading && !error && (
          <p style={{ color: "#6b7280", textAlign: "center", marginTop: "20px" }}>
            No posts found in the feed.
          </p>
        )}

        {loading && <p style={{ marginTop: "16px" }}>Loading...</p>}

        {posts.length > 0 && hasMore && (
          <button
            onClick={loadMorePosts}
            disabled={loading}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              fontSize: "16px",
              cursor: loading ? "not-allowed" : "pointer",
              backgroundColor: "#4f46e5",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        )}
      </div>
    </div>
  );
};

export default Feed;
