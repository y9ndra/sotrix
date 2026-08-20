import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { Post, PostsResponse } from "../types/post";
import CommentList from "./CommentList";
import { useAuthStore } from "../store/authStore";
import { toggleLike } from "../services/like.service";
import { toggleFollowUser } from "../services/follow.service";
import { queryKeys } from "../lib/queryKeys";
import { updatePostInAllInfiniteCaches } from "../lib/queryCache";

interface PostCardProps {
  post: Post;
  isOwner?: boolean;
  onEdit?: (postId: string, newContent: string) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
  onFollowToggle?: (authorId: string, isFollowing: boolean) => void;
}

const PostCard = ({ post, isOwner = false, onEdit, onDelete, onFollowToggle }: PostCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isDeletingConfirm, setIsDeletingConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);

  // Like state initialized from backend post data
  const [liked, setLiked] = useState<boolean>(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState<number>(post.likeCount ?? 0);

  // Comment count state initialized from backend post data
  const [commentCount, setCommentCount] = useState<number>(post.commentCount ?? 0);

  // Follow author state
  const [isFollowing, setIsFollowing] = useState<boolean>(post.author?.isFollowing ?? false);

  useEffect(() => {
    setLiked(post.isLiked ?? false);
    setLikeCount(post.likeCount ?? 0);
    setIsFollowing(post.author?.isFollowing ?? false);
    setCommentCount(post.commentCount ?? 0);
  }, [post.isLiked, post.likeCount, post.author?.isFollowing, post.commentCount]);

  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?._id || currentUser?.id || null;

  const queryClient = useQueryClient();

  const likeMutation = useMutation({
    mutationFn: toggleLike,
    onMutate: async (postId) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });

      // Save all matching caches for rollback
      const previousQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
        queryKey: queryKeys.posts.all,
      });

      // Optimistically update all matching infinite caches (Explore, Feed, Profile feeds, etc.)
      updatePostInAllInfiniteCaches(queryClient, postId, (oldPost) => ({
        ...oldPost,
        isLiked: !oldPost.isLiked,
        likeCount: oldPost.isLiked
          ? Math.max(0, (oldPost.likeCount ?? 0) - 1)
          : (oldPost.likeCount ?? 0) + 1,
      }));

      // Optimistically update local states for fallback
      setLiked((prev) => !prev);
      setLikeCount((prev) => Math.max(0, prev + (liked ? -1 : 1)));

      return { previousQueries };
    },
    onError: (err: any, _postId, context) => {
      // Rollback all caches to their snapshot
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, oldData]) => {
          queryClient.setQueryData(queryKey, oldData);
        });
      }

      // Rollback local states
      setLiked(post.isLiked ?? false);
      setLikeCount(post.likeCount ?? 0);

      console.error("Failed to toggle like, rolled back:", err);
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.all,
      });
    },
  });

  const handleToggleLike = () => {
    if (likeMutation.isPending) return;
    likeMutation.mutate(post._id);
  };

  const followMutation = useMutation({
    mutationFn: toggleFollowUser,
    onMutate: async (authorId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });

      // Snapshot the previous cache value
      const previousExploreData = queryClient.getQueryData<InfiniteData<PostsResponse>>(queryKeys.posts.explore);

      // Optimistically update follow status for all posts of this author in the explore feed
      queryClient.setQueryData<InfiniteData<PostsResponse>>(queryKeys.posts.explore, (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) => ({
            ...page,
            data: page.data.map((p) => {
              if (p.author?._id === authorId) {
                return {
                  ...p,
                  author: {
                    ...p.author,
                    isFollowing: !isFollowing,
                  },
                };
              }
              return p;
            }),
          })),
        };
      });

      // Optimistically update local follow state
      setIsFollowing((prev) => !prev);

      return { previousExploreData };
    },
    onError: (err: any, _authorId, context) => {
      // Rollback cache
      if (context?.previousExploreData) {
        queryClient.setQueryData(queryKeys.posts.explore, context.previousExploreData);
      }

      // Rollback local follow state
      setIsFollowing(post.author?.isFollowing ?? false);

      console.error("Failed to toggle follow author, rolled back:", err);
    },
    onSuccess: (res, authorId) => {
      if (onFollowToggle) {
        onFollowToggle(authorId, res.following);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.users.suggested,
      });
    },
  });

  const handleToggleFollow = () => {
    if (!post.author?._id || followMutation.isPending) return;
    followMutation.mutate(post.author._id);
  };

  const handleSaveEdit = async () => {
    if (!onEdit || !editContent.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await onEdit(post._id, editContent.trim());
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update post");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;
    try {
      setLoading(true);
      setError(null);
      await onDelete(post._id);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete post");
      setLoading(false);
      setIsDeletingConfirm(false);
    }
  };

  return (
    <article
      className="post-card"
      style={{
        padding: "16px",
        borderRadius: "10px",
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <div
        className="post-header"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "10px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#111827" }}>
              {post.author?.name || post.author?.username || "Unknown"}
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#6b7280" }}>
              @{post.author?.username || "unknown"}
            </p>
          </div>

          {!isOwner && post.author?._id && currentUserId !== post.author._id && (
            <button
              onClick={handleToggleFollow}
              disabled={followMutation.isPending}
              style={{
                padding: "3px 10px",
                fontSize: "12px",
                borderRadius: "14px",
                border: isFollowing ? "1px solid #d1d5db" : "none",
                backgroundColor: isFollowing ? "#f3f4f6" : "#4f46e5",
                color: isFollowing ? "#374151" : "#ffffff",
                cursor: followMutation.isPending ? "not-allowed" : "pointer",
                fontWeight: 600,
                transition: "all 0.2s ease",
                opacity: followMutation.isPending ? 0.6 : 1,
              }}
            >
              {followMutation.isPending ? "..." : isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {isOwner && (
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {isDeletingConfirm ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: "#dc2626", fontWeight: 500 }}>Delete post?</span>
                <button
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#dc2626",
                    color: "#ffffff",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontWeight: 600,
                  }}
                >
                  {loading ? "..." : "Yes"}
                </button>
                <button
                  onClick={() => setIsDeletingConfirm(false)}
                  disabled={loading}
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "#ffffff",
                    color: "#374151",
                    cursor: "pointer",
                  }}
                >
                  No
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    backgroundColor: "#f3f4f6",
                    cursor: "pointer",
                  }}
                >
                  {isEditing ? "Cancel" : "Edit"}
                </button>
                <button
                  onClick={() => setIsDeletingConfirm(true)}
                  disabled={loading}
                  style={{
                    padding: "4px 10px",
                    fontSize: "12px",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        <div style={{ marginTop: "10px" }}>
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "8px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
          {error && <p style={{ color: "#dc2626", fontSize: "12px" }}>{error}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
            <button
              onClick={handleSaveEdit}
              disabled={loading || !editContent.trim()}
              style={{
                padding: "6px 14px",
                fontSize: "13px",
                backgroundColor: "#4f46e5",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p style={{ margin: "8px 0", fontSize: "14px", color: "#374151" }}>
            {post.content}
          </p>
          {post.imageUrl && (
            <div style={{ marginTop: "12px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e7eb" }}>
              <img
                src={post.imageUrl}
                alt="Post attachment"
                style={{ width: "100%", maxHeight: "400px", objectFit: "cover", display: "block" }}
              />
            </div>
          )}
        </>
      )}

      {error && !isEditing && (
        <p style={{ color: "#dc2626", fontSize: "12px", margin: "4px 0" }}>{error}</p>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
        <small style={{ color: "#9ca3af", fontSize: "12px" }}>
          {new Date(post.createdAt).toLocaleString()}
        </small>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button
            onClick={handleToggleLike}
            disabled={likeMutation.isPending}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              color: liked ? "#ef4444" : "#6b7280",
              fontSize: "13px",
              fontWeight: 600,
              cursor: likeMutation.isPending ? "not-allowed" : "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
              backgroundColor: liked ? "#fee2e2" : "transparent",
              transition: "all 0.2s ease",
            }}
          >
            <span>{liked ? "❤️" : "♡"}</span>
            <span>{likeCount}</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "none",
              color: showComments ? "#4f46e5" : "#6b7280",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "6px",
              backgroundColor: showComments ? "#e0e7ff" : "transparent",
              transition: "all 0.2s ease",
            }}
          >
            💬 {commentCount} {showComments ? "Hide Comments" : "Comments"}
          </button>
        </div>
      </div>

      {showComments && (
        <CommentList
          postId={post._id}
          onCommentCountChange={(change) => setCommentCount((prev) => Math.max(0, prev + change))}
        />
      )}
    </article>
  );
};

export default PostCard;
