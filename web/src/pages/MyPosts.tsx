import { useState, useEffect } from "react";
import { getMyPosts, updatePost, deletePost } from "../services/post.service";
import type { Post } from "../types/post";
import PostCard from "../components/PostCard";
import CreatePost from "../components/CreatePost";
import Navbar from "../components/Navbar";

interface MyPostsProps {
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

const MyPosts = ({ isAuthenticated = true, onLogout = () => {} }: MyPostsProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchMyPosts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await getMyPosts();

      setPosts(response.data);
      setNextCursor(response.pagination.nextCursor);
      setHasMore(response.pagination.hasMore);
    } catch (err) {
      setError("Failed to load your posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyPosts();
  }, []);

  const loadMorePosts = async () => {
    if (!nextCursor || !hasMore) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await getMyPosts(nextCursor);

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

  const handlePostCreated = (newPost: Post) => {
    setPosts((previousPosts) => [newPost, ...previousPosts]);
    setShowCreateForm(false);
  };

  const handleEditPost = async (postId: string, newContent: string) => {
    const updatedResponse = await updatePost(postId, newContent);
    setPosts((previousPosts) =>
      previousPosts.map((p) => (p._id === postId ? updatedResponse.data : p))
    );
  };

  const handleDeletePost = async (postId: string) => {
    await deletePost(postId);
    setPosts((previousPosts) => previousPosts.filter((p) => p._id !== postId));
  };

  return (
    <div>
      <Navbar isAuthenticated={isAuthenticated} onLogout={onLogout} />

      <div
        className="my-posts-container"
        style={{ maxWidth: "600px", margin: "20px auto", padding: "16px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ margin: 0, color: "#111827" }}>My Posts</h2>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{
              padding: "8px 16px",
              backgroundColor: showCreateForm ? "#e5e7eb" : "#4f46e5",
              color: showCreateForm ? "#374151" : "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            {showCreateForm ? "Cancel" : "+ Create Post"}
          </button>
        </div>

        {showCreateForm && <CreatePost onPostCreated={handlePostCreated} />}

        {error && <p style={{ color: "#dc2626" }}>{error}</p>}

        <div
          className="posts-list"
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
          {posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              isOwner={true}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
            />
          ))}
        </div>

        {posts.length === 0 && !loading && !error && (
          <p style={{ color: "#6b7280", textAlign: "center", marginTop: "20px" }}>
            You haven't created any posts yet.
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

export default MyPosts;
