import { useState, useEffect } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import Navbar from "../components/Navbar";
import PostCard from "../components/PostCard";
import UserCard from "../components/UserCard";
import {
  getExplorePosts,
  getSuggestedUsers,
} from "../services/explore.service";
import type { SuggestedUser } from "../services/explore.service";
import type { Post, PostsResponse } from "../types/post";
import { searchUsers } from "../services/user.service";
import { searchPosts } from "../services/post.service";
import { queryKeys } from "../lib/queryKeys";

const Explore = () => {
  const [activeTab, setActiveTab] = useState<"posts" | "users">("posts");

  const queryClient = useQueryClient();

  // Query for Explore Posts
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
    fetchNextPage: loadMoreExplorePosts,
    hasNextPage: postsHasMore,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.posts.explore,
    queryFn: ({ pageParam }) => getExplorePosts(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
  });

  const posts = postsData?.pages.flatMap((page) => page.data) ?? [];

  // State for Suggested Users
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [usersNextCursor, setUsersNextCursor] = useState<string | null>(null);
  const [usersHasMore, setUsersHasMore] = useState(true);

  // State for Searching Users
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SuggestedUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearched, setIsSearched] = useState(false);

  // State for Searching Posts
  const [postSearchQuery, setPostSearchQuery] = useState("");
  const [postSearchResults, setPostSearchResults] = useState<Post[]>([]);
  const [postSearchLoading, setPostSearchLoading] = useState(false);
  const [postSearchError, setPostSearchError] = useState<string | null>(null);
  const [isPostSearched, setIsPostSearched] = useState(false);



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

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      setSearchLoading(true);
      setSearchError(null);
      setIsSearched(true);
      const response = await searchUsers(searchQuery);
      setSearchResults(response.data);
    } catch (err) {
      setSearchError("Failed to search users. Please try again.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSearchError(null);
    setIsSearched(false);
  };

  const handlePostSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postSearchQuery.trim()) return;

    try {
      setPostSearchLoading(true);
      setPostSearchError(null);
      setIsPostSearched(true);
      const response = await searchPosts(postSearchQuery);
      setPostSearchResults(response.data);
    } catch (err) {
      setPostSearchError("Failed to search posts. Please try again.");
    } finally {
      setPostSearchLoading(false);
    }
  };

  const handleClearPostSearch = () => {
    setPostSearchQuery("");
    setPostSearchResults([]);
    setPostSearchError(null);
    setIsPostSearched(false);
  };

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  const handleFollowToggleInCache = (authorId: string) => {
    queryClient.setQueryData<InfiniteData<PostsResponse>>(queryKeys.posts.explore, (oldData) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        pages: oldData.pages.map((page) => ({
          ...page,
          data: page.data.filter((p) => p.author?._id !== authorId),
        })),
      };
    });
  };

  const handleUserFollowChange = (userId: string, isFollowing: boolean) => {
    if (isFollowing) {
      // Filter out user from suggested users list once followed
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      // Also filter out their posts from discover feed
      handleFollowToggleInCache(userId);
    }
  };

  return (
    <div style={{ backgroundColor: "#f9fafb", minHeight: "100vh" }}>
      <Navbar />

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
            {/* Search Input Form for Posts */}
            <form
              onSubmit={handlePostSearch}
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "20px",
                position: "relative",
              }}
            >
              <div style={{ position: "relative", flex: 1 }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    fontSize: "18px",
                    pointerEvents: "none",
                  }}
                >
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search posts by content..."
                  value={postSearchQuery}
                  onChange={(e) => setPostSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px 12px 42px",
                    borderRadius: "24px",
                    border: "1px solid #d1d5db",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#4f46e5";
                    e.target.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
                  }}
                />
                {postSearchQuery && (
                  <button
                    type="button"
                    onClick={handleClearPostSearch}
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#9ca3af",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "4px",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={postSearchLoading}
                style={{
                  padding: "12px 24px",
                  borderRadius: "24px",
                  backgroundColor: "#4f46e5",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: postSearchLoading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)",
                  opacity: postSearchLoading ? 0.7 : 1,
                }}
              >
                {postSearchLoading ? "Searching..." : "Search"}
              </button>
            </form>

            {isPostSearched ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#374151" }}>
                    Search Results
                  </h3>
                  <button
                    onClick={handleClearPostSearch}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4f46e5",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Clear search
                  </button>
                </div>

                {postSearchError && <p style={{ color: "#dc2626" }}>{postSearchError}</p>}
                {postSearchLoading && <p style={{ color: "#6b7280" }}>Searching posts...</p>}

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {postSearchResults.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      onFollowToggle={(authorId, isFollowing) => {
                        if (isFollowing) {
                          setPostSearchResults((prev) => prev.filter((p) => p.author?._id !== authorId));
                          handleFollowToggleInCache(authorId);
                          setUsers((prev) => prev.filter((u) => u._id !== authorId));
                        }
                      }}
                    />
                  ))}
                </div>

                {postSearchResults.length === 0 && !postSearchLoading && !postSearchError && (
                  <p style={{ color: "#6b7280", textAlign: "center", marginTop: "32px" }}>
                    No posts found matching "{postSearchQuery}"
                  </p>
                )}
              </div>
            ) : (
              <div>
                {postsError && <p style={{ color: "#dc2626" }}>{postsError.message}</p>}

                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {posts.map((post) => (
                    <PostCard
                      key={post._id}
                      post={post}
                      onFollowToggle={(authorId, isFollowing) => {
                        if (isFollowing) {
                          handleFollowToggleInCache(authorId);
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

                {postsLoading && !isFetchingNextPage && <p style={{ marginTop: "16px", color: "#6b7280" }}>Loading posts...</p>}

                {posts.length > 0 && postsHasMore && (
                  <button
                    onClick={() => loadMoreExplorePosts()}
                    disabled={postsLoading || isFetchingNextPage}
                    style={{
                      marginTop: "24px",
                      padding: "10px 20px",
                      fontSize: "15px",
                      cursor: postsLoading || isFetchingNextPage ? "not-allowed" : "pointer",
                      backgroundColor: "#4f46e5",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 600,
                      opacity: postsLoading || isFetchingNextPage ? 0.6 : 1,
                      width: "100%",
                    }}
                  >
                    {postsLoading || isFetchingNextPage ? "Loading..." : "Load More Posts"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div>
            {/* Search Input Form */}
            <form
              onSubmit={handleSearch}
              style={{
                display: "flex",
                gap: "10px",
                marginBottom: "20px",
                position: "relative",
              }}
            >
              <div style={{ position: "relative", flex: 1 }}>
                <span
                  style={{
                    position: "absolute",
                    left: "14px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    fontSize: "18px",
                    pointerEvents: "none",
                  }}
                >
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search users by name or username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 16px 12px 42px",
                    borderRadius: "24px",
                    border: "1px solid #d1d5db",
                    fontSize: "15px",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#4f46e5";
                    e.target.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.15)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#d1d5db";
                    e.target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    style={{
                      position: "absolute",
                      right: "14px",
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#9ca3af",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "4px",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={searchLoading}
                style={{
                  padding: "12px 24px",
                  borderRadius: "24px",
                  backgroundColor: "#4f46e5",
                  color: "#ffffff",
                  border: "none",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: searchLoading ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)",
                  opacity: searchLoading ? 0.7 : 1,
                }}
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </form>

            {isSearched ? (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#374151" }}>
                    Search Results
                  </h3>
                  <button
                    onClick={handleClearSearch}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#4f46e5",
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Clear search
                  </button>
                </div>

                {searchError && <p style={{ color: "#dc2626" }}>{searchError}</p>}
                {searchLoading && <p style={{ color: "#6b7280" }}>Searching users...</p>}

                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {searchResults.map((user) => (
                    <UserCard
                      key={user._id}
                      user={user}
                      onFollowStateChange={handleUserFollowChange}
                    />
                  ))}
                </div>

                {searchResults.length === 0 && !searchLoading && !searchError && (
                  <p style={{ color: "#6b7280", textAlign: "center", marginTop: "32px" }}>
                    No users found matching "{searchQuery}"
                  </p>
                )}
              </div>
            ) : (
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
        )}
      </div>
    </div>
  );
};

export default Explore;
