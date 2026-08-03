import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import PostCard from "../components/PostCard";
import UserCard from "../components/UserCard";
import {
  getExplorePosts,
  getSuggestedUsers,
} from "../services/explore.service";
import type { SuggestedUser } from "../services/explore.service";
import type { Post } from "../types/post";

interface ExploreProps {
  isAuthenticated?: boolean;
  onLogout?: () => void;
}

const Explore = ({
  isAuthenticated = false,
  onLogout = () => {},
}: ExploreProps) => {
  const [activeTab, setActiveTab] = useState<"posts" | "users">("posts");

  // State for Explore Posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [postsNextCursor, setPostsNextCursor] = useState<string | null>(null);
  const [postsHasMore, setPostsHasMore] = useState(true);

  // State for Suggested Users
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersNextCursor, setUsersNextCursor] = useState<string | null>(null);
  const [usersHasMore, setUsersHasMore] = useState(true);

  const fetchExplorePosts = async () => {
    try {
      setPostsLoading(true);
      setPostsError(null);
      const response = await getExplorePosts();
      setPosts(response.data);
      setPostsNextCursor(response.pagination.nextCursor);
      setPostsHasMore(response.pagination.hasMore);
    } catch (err) {
      setPostsError("Failed to load explore posts");
    } finally {
      setPostsLoading(false);
    }
  };

  const loadMoreExplorePosts = async () => {
    if (!postsNextCursor || !postsHasMore) return;
    try {
      setPostsLoading(true);
      setPostsError(null);
      const response = await getExplorePosts(postsNextCursor);
      setPosts((prev) => [...prev, ...response.data]);
      setPostsNextCursor(response.pagination.nextCursor);
      setPostsHasMore(response.pagination.hasMore);
    } catch (err) {
      setPostsError("Failed to load more posts");
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchSuggestedUsers = async () => {
    try {
      setUsersLoading(true);
      setUsersError(null);
      const response = await getSuggestedUsers();
      setUsers(response.data);
      setUsersNextCursor(response.pagination.nextCursor);
      setUsersHasMore(response.pagination.hasMore);
    } catch (err) {
      setUsersError("Failed to load suggested users");
    } finally {
      setUsersLoading(false);
    }
  };

  const loadMoreSuggestedUsers = async () => {
    if (!usersNextCursor || !usersHasMore) return;
    try {
      setUsersLoading(true);
      setUsersError(null);
      const response = await getSuggestedUsers(usersNextCursor);
      setUsers((prev) => [...prev, ...response.data]);
      setUsersNextCursor(response.pagination.nextCursor);
      setUsersHasMore(response.pagination.hasMore);
    } catch (err) {
      setUsersError("Failed to load more users");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    fetchExplorePosts();
    fetchSuggestedUsers();
  }, []);

  const handleUserFollowChange = (userId: string, isFollowing: boolean) => {
    if (isFollowing) {
      // Filter out user from suggested users list once followed
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      // Also filter out their posts from discover feed
      setPosts((prev) => prev.filter((p) => p.author?._id !== userId));
    }
  };

  return (
    <div style={{ backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      <Navbar isAuthenticated={isAuthenticated} onLogout={onLogout} />

      <div
        style={{
          maxWidth: "640px",
          margin: "24px auto",
          padding: "0 16px 40px 16px",
        }}
      >
        <div style={{ marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 16px 0", color: "#111827", fontSize: "24px", fontWeight: 700 }}>
            Explore
          </h2>

          <div
            style={{
              display: "flex",
              borderBottom: "2px solid #e5e7eb",
              gap: "24px",
            }}
          >
            <button
              onClick={() => setActiveTab("posts")}
              style={{
                background: "none",
                border: "none",
                padding: "12px 4px",
                fontSize: "16px",
                fontWeight: activeTab === "posts" ? 600 : 500,
                color: activeTab === "posts" ? "#4f46e5" : "#6b7280",
                borderBottom: activeTab === "posts" ? "2px solid #4f46e5" : "2px solid transparent",
                marginBottom: "-2px",
                cursor: "pointer",
              }}
            >
              Discover Posts
            </button>
            <button
              onClick={() => setActiveTab("users")}
              style={{
                background: "none",
                border: "none",
                padding: "12px 4px",
                fontSize: "16px",
                fontWeight: activeTab === "users" ? 600 : 500,
                color: activeTab === "users" ? "#4f46e5" : "#6b7280",
                borderBottom: activeTab === "users" ? "2px solid #4f46e5" : "2px solid transparent",
                marginBottom: "-2px",
                cursor: "pointer",
              }}
            >
              Suggested Users
            </button>
          </div>
        </div>

        {activeTab === "posts" && (
          <div>
            {postsError && <p style={{ color: "#dc2626" }}>{postsError}</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {posts.map((post) => (
                <PostCard
                  key={post._id}
                  post={post}
                  onFollowToggle={(authorId, isFollowing) => {
                    if (isFollowing) {
                      setPosts((prev) => prev.filter((p) => p.author?._id !== authorId));
                      setUsers((prev) => prev.filter((u) => u._id !== authorId));
                    }
                  }}
                />
              ))}
            </div>

            {posts.length === 0 && !postsLoading && !postsError && (
              <p style={{ color: "#6b7280", textAlign: "center", marginTop: "32px" }}>
                No new posts to discover right now. Check back soon!
              </p>
            )}

            {postsLoading && <p style={{ marginTop: "16px", color: "#6b7280" }}>Loading posts...</p>}

            {posts.length > 0 && postsHasMore && (
              <button
                onClick={loadMoreExplorePosts}
                disabled={postsLoading}
                style={{
                  marginTop: "24px",
                  padding: "10px 20px",
                  fontSize: "15px",
                  cursor: postsLoading ? "not-allowed" : "pointer",
                  backgroundColor: "#4f46e5",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  opacity: postsLoading ? 0.6 : 1,
                  width: "100%",
                }}
              >
                {postsLoading ? "Loading..." : "Load More Posts"}
              </button>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div>
            {usersError && <p style={{ color: "#dc2626" }}>{usersError}</p>}

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {users.map((user) => (
                <UserCard
                  key={user._id}
                  user={user}
                  onFollowStateChange={handleUserFollowChange}
                />
              ))}
            </div>

            {users.length === 0 && !usersLoading && !usersError && (
              <p style={{ color: "#6b7280", textAlign: "center", marginTop: "32px" }}>
                You're already following everyone available or no suggested users match!
              </p>
            )}

            {usersLoading && <p style={{ marginTop: "16px", color: "#6b7280" }}>Loading users...</p>}

            {users.length > 0 && usersHasMore && (
              <button
                onClick={loadMoreSuggestedUsers}
                disabled={usersLoading}
                style={{
                  marginTop: "24px",
                  padding: "10px 20px",
                  fontSize: "15px",
                  cursor: usersLoading ? "not-allowed" : "pointer",
                  backgroundColor: "#4f46e5",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 600,
                  opacity: usersLoading ? 0.6 : 1,
                  width: "100%",
                }}
              >
                {usersLoading ? "Loading..." : "Load More Users"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Explore;
