import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import api from "../services/api";
import { toggleFollowUser } from "../services/follow.service";
import { useAuthStore } from "../store/authStore";
import { getUserPosts } from "../services/post.service";
import PostCard from "../components/PostCard";
import { createPortal } from "react-dom";

const Profile = () => {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [followLoading, setFollowLoading] = useState<boolean>(false);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({ name: "", username: "", bio: "" });
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");
  const [isAvatarEnlarged, setIsAvatarEnlarged] = useState<boolean>(false);

  // Sub-tabs State
  const [activeSubTab, setActiveSubTab] = useState<"posts" | "media" | "activity">("posts");

  const currentUser = useAuthStore((state) => state.user);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const currentUserId = currentUser?._id || currentUser?.id || null;
  const isOwnProfile =
    user && (user._id === currentUserId || user.id === currentUserId || id === currentUserId);

  useEffect(() => {
    const fetchUser = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const response = await api.get(`/users/${id}`);
        setUser(response.data.data);
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || "Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  // Query for User Posts
  const {
    data: postsData,
    isLoading: postsLoading,
    error: postsError,
    fetchNextPage: loadMoreUserPosts,
    hasNextPage: postsHasMore,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["posts", "user", id],
    queryFn: ({ pageParam }) => getUserPosts(id!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.pagination.nextCursor ?? undefined,
    enabled: !!id,
  });

  const posts = postsData?.pages.flatMap((page) => page.data) ?? [];

  const handleStartEdit = () => {
    setEditForm({
      name: user?.name || "",
      username: user?.username || "",
      bio: user?.bio || "",
    });
    setProfilePic(null);
    setProfilePicPreview(user?.profilePicUrl || "");
    setEditError("");
    setIsEditing(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePic(file);
      setProfilePicPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setEditError("");
    try {
      const formData = new FormData();
      formData.append("name", editForm.name);
      formData.append("username", editForm.username);
      formData.append("bio", editForm.bio);
      if (profilePic) {
        formData.append("profilePic", profilePic);
      }

      const response = await api.patch("/users/me", formData);

      const updatedData = response.data.data;

      setUser((prev: any) => ({
        ...prev,
        ...updatedData,
      }));
      
      // Update global authStore state in real-time
      setAuthUser(updatedData);

      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setEditError(err.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!user || followLoading) return;
    const targetId = user._id || user.id || id;
    if (!targetId) return;

    setFollowLoading(true);
    try {
      const result = await toggleFollowUser(targetId);
      setUser((prev: any) => ({
        ...prev,
        isFollowing: result.following,
        followersCount: result.followersCount,
      }));
    } catch (err: any) {
      console.error("Failed to toggle follow status", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const getInitial = (name?: string, username?: string) => {
    if (name && name.trim().length > 0) return name.trim().charAt(0).toUpperCase();
    if (username && username.trim().length > 0) return username.trim().charAt(0).toUpperCase();
    return "U";
  };

  const formatFollowers = (count: number) => {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + "M";
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + "K";
    }
    return count.toString();
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-body">
          {loading && (
            <div className="profile-loading-box">
              <div className="profile-spinner" />
              <p style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)", fontSize: "12px", marginTop: "12px" }}>
                fetching user profile...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="profile-error-box">
              {error}
            </div>
          )}

          {/* Profile Display / Edit Form */}
          {user && !loading && !error && (
            <div className="profile-info">
              {isEditing ? (
                <form onSubmit={handleSave} className="profile-edit-form">
                  <h3 className="profile-edit-title">edit profile</h3>

                  {editError && (
                    <div className="profile-error-box" style={{ marginTop: 0 }}>
                      {editError}
                    </div>
                  )}

                  {/* Profile Picture Upload & Live Preview Row */}
                  <div className="profile-form-group" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" }}>
                    <div className="profile-avatar-large" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                      {profilePicPreview ? (
                        <img
                          src={profilePicPreview}
                          alt="Avatar preview"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        getInitial(editForm.name, editForm.username)
                      )}
                    </div>
                    <label className="profile-action-btn" style={{ cursor: "pointer", display: "inline-flex", gap: "6px" }}>
                      <svg style={{ width: "14px", height: "14px", stroke: "currentColor" }} fill="none" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      upload photo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Your full name"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">username</label>
                    <input
                      type="text"
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      placeholder="Username"
                      className="profile-form-input"
                    />
                  </div>

                  <div className="profile-form-group">
                    <label className="profile-form-label">bio</label>
                    <textarea
                      rows={3}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      className="profile-form-textarea"
                    />
                  </div>

                  <div className="profile-edit-actions">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                      className="profile-action-btn"
                    >
                      cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="profile-action-btn primary"
                    >
                      {saving ? "saving..." : "save changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  {/* Header Row: Avatar, Name, Handle on the left; Action on the right */}
                  <div className="profile-header-row">
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div
                        className="profile-avatar-large"
                        style={{
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: user.profilePicUrl ? "pointer" : "default"
                        }}
                        onClick={() => user.profilePicUrl && setIsAvatarEnlarged(true)}
                      >
                        {user.profilePicUrl ? (
                          <img
                            src={user.profilePicUrl}
                            alt={user.username}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          getInitial(user.name, user.username)
                        )}
                      </div>
                      <div>
                        <h1 className="profile-name">
                          {user.name || user.username}
                        </h1>
                        <p className="profile-handle">
                          @{user.username}
                        </p>
                      </div>
                    </div>

                    {/* Action Button: Edit Profile (for self) or Follow/Unfollow (for others) */}
                    <div>
                      {isOwnProfile ? (
                        <button onClick={handleStartEdit} className="profile-action-btn">
                          <svg
                            style={{ width: "14px", height: "14px", stroke: "currentColor" }}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                            />
                          </svg>
                          edit profile
                        </button>
                      ) : (
                        <button
                          onClick={handleToggleFollow}
                          disabled={followLoading}
                          className={`profile-action-btn ${user.isFollowing ? "" : "primary"}`}
                        >
                          {user.isFollowing ? (
                            <>
                              <svg
                                style={{ width: "14px", height: "14px", stroke: "currentColor" }}
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                              following
                            </>
                          ) : (
                            <>
                              <svg
                                style={{ width: "14px", height: "14px", stroke: "currentColor" }}
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="2"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M12 4v16m8-8H4"
                                />
                              </svg>
                              follow
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {user.bio ? (
                    <p className="profile-bio-box" style={{ marginTop: "20px" }}>
                      {user.bio}
                    </p>
                  ) : (
                    <p className="profile-bio-placeholder" style={{ marginTop: "16px" }}>
                      no bio provided yet.
                    </p>
                  )}

                  {/* Posts, Followers, and Following Counters Bar */}
                  <div className="profile-stats-bar">
                    <div className="profile-stat-item">
                      <span className="profile-stat-number">
                        {user.postsCount ?? 0}
                      </span>
                      posts
                    </div>
                    <div className="profile-stat-item">
                      <span className="profile-stat-number">
                        {formatFollowers(user.followersCount ?? 0)}
                      </span>
                      followers
                    </div>
                    <div className="profile-stat-item">
                      <span className="profile-stat-number">
                        {formatFollowers(user.followingCount ?? 0)}
                      </span>
                      following
                    </div>
                  </div>

                  {/* Sub-tabs Selection: POSTS, MEDIA, ACTIVITY */}
                  <div className="explore-tabs-header" style={{ marginBottom: "24px" }}>
                    <div className="explore-tab-nav" style={{ gap: "32px" }}>
                      <button
                        onClick={() => setActiveSubTab("posts")}
                        className={`explore-tab-btn ${activeSubTab === "posts" ? "active" : ""}`}
                      >
                        posts
                      </button>
                      <button
                        onClick={() => setActiveSubTab("media")}
                        className={`explore-tab-btn ${activeSubTab === "media" ? "active" : ""}`}
                      >
                        media
                      </button>
                      <button
                        onClick={() => setActiveSubTab("activity")}
                        className={`explore-tab-btn ${activeSubTab === "activity" ? "active" : ""}`}
                      >
                        activity
                      </button>
                    </div>
                  </div>

                  {/* Tab Contents */}
                  {activeSubTab === "posts" && (
                    <div>
                      {postsError && <p className="error-text">failed to load posts.</p>}

                      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                        {posts.map((post) => (
                          <PostCard key={post._id} post={post} />
                        ))}
                      </div>

                      {posts.length === 0 && !postsLoading && !postsError && (
                        <p className="explore-empty-msg" style={{ marginTop: "16px" }}>
                          no posts to display yet.
                        </p>
                      )}

                      {postsLoading && !isFetchingNextPage && (
                        <p className="explore-loading">loading posts...</p>
                      )}

                      {posts.length > 0 && postsHasMore && (
                        <button
                          onClick={() => loadMoreUserPosts()}
                          disabled={postsLoading || isFetchingNextPage}
                          className="explore-loadmore-btn"
                        >
                          {postsLoading || isFetchingNextPage ? "loading..." : "load more posts"}
                        </button>
                      )}
                    </div>
                  )}

                  {activeSubTab === "media" && (
                    <p className="explore-empty-msg" style={{ marginTop: "16px" }}>
                      no media available yet.
                    </p>
                  )}

                  {activeSubTab === "activity" && (
                    <p className="explore-empty-msg" style={{ marginTop: "16px" }}>
                      no recent activity to display.
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {isAvatarEnlarged && user.profilePicUrl && createPortal(
        <div className="avatar-enlarged-modal" onClick={() => setIsAvatarEnlarged(false)}>
          <div className="avatar-enlarged-content" onClick={(e) => e.stopPropagation()}>
            <button className="avatar-enlarged-close" onClick={() => setIsAvatarEnlarged(false)}>
              &times;
            </button>
            <img src={user.profilePicUrl} alt={user.username} className="avatar-enlarged-img" />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Profile;
