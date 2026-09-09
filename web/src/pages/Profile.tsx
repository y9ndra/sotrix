import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import Cropper from "react-easy-crop";
import api from "../services/api";
import { toggleFollowUser } from "../services/follow.service";
import { getOrCreateConversation } from "../services/chat.service";
import { queryKeys } from "../lib/queryKeys";
import { useAuthStore } from "../store/authStore";
import { getUserPosts, deletePost } from "../services/post.service";
import { removePostFromAllInfiniteCaches } from "../lib/queryCache";
import PostCard from "../components/PostCard";
import { createPortal } from "react-dom";

// Canvas Helper Utilities for Image Cropping
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.setAttribute("crossOrigin", "anonymous"); // Avoid canvas taint error on cross-origin images
    image.src = url;
  });

const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No 2d context");
  }

  // Set canvas size to the cropped dimensions
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Draw the selected cropped region
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        resolve(file);
      } else {
        reject(new Error("Canvas is empty"));
      }
    }, "image/jpeg", 0.95);
  });
};

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  const [chatLoading, setChatLoading] = useState<boolean>(false);

  // Edit Profile State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({ name: "", username: "", bio: "" });
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [profilePicPreview, setProfilePicPreview] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");

  // Cropper Modal State
  const [isCropperOpen, setIsCropperOpen] = useState<boolean>(false);
  const [imageToCrop, setImageToCrop] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Lightbox Enlarged Avatar State
  const [isAvatarEnlarged, setIsAvatarEnlarged] = useState<boolean>(false);

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
    queryKey: queryKeys.posts.userPosts(id!),
    queryFn: ({ pageParam }) => getUserPosts(id!, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage.pagination?.hasMore) return undefined;
      return lastPage.pagination?.nextCursor ?? undefined;
    },
    enabled: !!id,
  });

  const posts = postsData?.pages.flatMap((page) => page.data) ?? [];

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !postsHasMore || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreUserPosts();
        }
      },
      { rootMargin: "500px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [postsHasMore, isFetchingNextPage, loadMoreUserPosts]);

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
      const url = URL.createObjectURL(file);
      setImageToCrop(url);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setIsCropperOpen(true);
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropSave = async () => {
    if (imageToCrop && croppedAreaPixels) {
      try {
        const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
        const croppedFile = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
        
        setProfilePic(croppedFile);
        setProfilePicPreview(URL.createObjectURL(croppedBlob));
        setIsCropperOpen(false);
        setImageToCrop("");
      } catch (err) {
        console.error("Error cropping image:", err);
      }
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
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });
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

  const handleStartChat = async () => {
    const targetId = user?._id || user?.id || id;
    if (!targetId || chatLoading) return;

    setChatLoading(true);
    try {
      const conv = await getOrCreateConversation(targetId);

      // Pre-seed conversation in TanStack Query caches so Messages page has it immediately
      queryClient.setQueryData<any>(
        queryKeys.conversations.all,
        (old: any = []) => {
          const filtered = Array.isArray(old)
            ? old.filter((c: any) => c._id !== conv._id)
            : [];
          return [conv, ...filtered];
        }
      );
      queryClient.setQueryData(queryKeys.conversations.detail(conv._id), conv);

      navigate(`/messages?conversationId=${conv._id}`);
    } catch (err: any) {
      console.error("Failed to start conversation:", err);
      alert(err.response?.data?.message || err.message || "Failed to start conversation");
    } finally {
      setChatLoading(false);
    }
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
                    <div className="profile-avatar-large" style={{ overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", borderRadius: "50%" }}>
                      {profilePicPreview ? (
                        <img
                          src={profilePicPreview}
                          alt="Avatar preview"
                          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
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
                    <div className="profile-header-left">
                      <div
                        className="profile-avatar-large"
                        style={{
                          position: "relative",
                          overflow: "visible",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "50%",
                          cursor: user.profilePicUrl ? "pointer" : "default"
                        }}
                        onClick={() => user.profilePicUrl && setIsAvatarEnlarged(true)}
                      >
                        <div style={{ width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {user.profilePicUrl ? (
                            <img
                              src={user.profilePicUrl}
                              alt={user.username}
                              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }}
                            />
                          ) : (
                            getInitial(user.name, user.username)
                          )}
                        </div>
                      </div>
                      <div className="profile-header-user-meta">
                        <h1 className="profile-name">
                          {user.name || user.username}
                        </h1>
                        <p className="profile-handle" style={{ marginTop: "2px" }}>
                          @{user.username}
                        </p>
                      </div>
                    </div>

                    {/* Action Button: Edit Profile (for self) or Follow/Unfollow (for others) */}
                    <div className="profile-header-actions">
                      {isOwnProfile ? (
                        <button
                          onClick={handleStartEdit}
                          className="profile-action-btn profile-edit-btn"
                          title="Edit profile"
                          aria-label="Edit profile"
                        >
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
                          <span className="profile-btn-text">edit profile</span>
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

                      {!isOwnProfile && user.isFollowing && (
                        <button
                          onClick={handleStartChat}
                          disabled={chatLoading}
                          className="profile-action-btn primary"
                          style={{ marginLeft: "8px" }}
                          title={`Send message to @${user.username}`}
                        >
                          <svg
                            style={{ width: "14px", height: "14px", stroke: "currentColor" }}
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          {chatLoading ? "starting..." : "message"}
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

                  {/* Left-Aligned Profile Posts Header */}
                  <div className="profile-posts-header">
                    <h3 className="profile-posts-heading">
                      posts
                    </h3>
                  </div>

                  {/* User Posts Timeline */}
                  <div style={{ marginTop: "20px" }}>
                    {postsError && <p className="error-text">failed to load posts.</p>}

                    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                      {posts.map((post) => (
                        <PostCard
                          key={post._id}
                          post={post}
                          isOwner={isOwnProfile}
                          onDelete={async (postId) => {
                            await deletePost(postId);
                            removePostFromAllInfiniteCaches(queryClient, postId);
                            setUser((prev: any) =>
                              prev
                                ? {
                                    ...prev,
                                    postsCount: Math.max(0, (prev.postsCount ?? 1) - 1),
                                  }
                                : prev
                            );
                          }}
                        />
                      ))}
                    </div>

                    {posts.length === 0 && !postsLoading && !postsError && (
                      <p className="explore-empty-msg" style={{ marginTop: "24px" }}>
                        no posts to display yet.
                      </p>
                    )}

                    {postsLoading && !isFetchingNextPage && (
                      <p className="explore-loading">loading posts...</p>
                    )}

                    {/* Infinite scroll sentinel */}
                    <div ref={loadMoreRef} style={{ height: "20px", margin: "10px 0" }} />

                    {isFetchingNextPage && (
                      <p style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: "12px", textAlign: "center", margin: "16px 0" }}>
                        loading more posts...
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Lightbox Enlarged Avatar Modal (React Portal) */}
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

      {/* Avatar Cropper Modal Overlay (React Portal) */}
      {isCropperOpen && imageToCrop && createPortal(
        <div className="avatar-enlarged-modal">
          <div 
            className="avatar-enlarged-content" 
            onClick={(e) => e.stopPropagation()}
            style={{ 
              flexDirection: "column", 
              width: "360px", 
              height: "440px", 
              backgroundColor: "#000000", 
              border: "1px solid var(--border-default)", 
              borderRadius: "10px", 
              padding: "20px", 
              display: "flex", 
              gap: "16px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.9)"
            }}
          >
            <h3 style={{ margin: 0, fontSize: "15px", fontFamily: "var(--font-mono)", color: "var(--text-primary)", fontWeight: 600 }}>adjust profile photo</h3>
            
            <div style={{ position: "relative", width: "100%", height: "280px", backgroundColor: "#121212", borderRadius: "10px", overflow: "hidden" }}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", marginTop: "auto" }}>
              <button
                type="button"
                onClick={() => {
                  setIsCropperOpen(false);
                  setImageToCrop("");
                }}
                className="profile-action-btn"
              >
                cancel
              </button>
              <button
                type="button"
                onClick={handleCropSave}
                className="profile-action-btn primary"
              >
                crop & apply
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Profile;
