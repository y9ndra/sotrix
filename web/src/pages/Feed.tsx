import { useState } from "react";
import { getPosts } from "../services/post.service";
import type { Post } from "../types/post";
import PostCard from "../components/PostCard";

const Feed = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getPosts();

      setPosts(response.data);
      setNextCursor(response.pagination.nextCursor);
      setHasMore(response.pagination.hasMore);
    } catch (err) {
      setError("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const loadMorePosts = async () => {
    if (!nextCursor || !hasMore) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await getPosts(nextCursor);

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
    <div className="feed-container" style={{ maxWidth: "600px", margin: "20px auto", padding: "16px" }}>
      <h2>Feed</h2>

      {posts.length === 0 && !loading && (
        <button
          onClick={fetchPosts}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            cursor: "pointer",
            marginBottom: "20px",
          }}
        >
          Fetch Posts
        </button>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="posts-list" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {posts.map((post) => (
          <PostCard key={post._id} post={post} />
        ))}
      </div>

      {loading && <p>Loading...</p>}

      {posts.length > 0 && hasMore && (
        <button
          onClick={loadMorePosts}
          disabled={loading}
          style={{
            marginTop: "20px",
            padding: "10px 20px",
            fontSize: "16px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading..." : "Load More"}
        </button>
      )}
    </div>
  );
};

export default Feed;
