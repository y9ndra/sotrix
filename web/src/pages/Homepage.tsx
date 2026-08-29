import { useState, useEffect } from "react";
import CreatePost from "../components/CreatePost";
import PostCard from "../components/PostCard";
import { useAuthStore } from "../store/authStore";
import { getHomeFeed } from "../services/feed.service";
import type { Post } from "../types/post";

function Homepage() {
  const user = useAuthStore((state) => state.user);

  const [posts, setPosts] = useState<Post[]>([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

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

  useEffect(() => {
    if (user) {
      fetchFeed();
    }
  }, [user]);

  const handlePostCreated = (newPost: Post) => {
    setPosts((prev) => [newPost, ...prev]);
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
