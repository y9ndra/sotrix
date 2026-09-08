import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { Post, PostsResponse } from "../types/post";
import CommentList from "./CommentList";
import { useAuthStore } from "../store/authStore";
import { toggleFollowUser } from "../services/follow.service";
import { queryKeys } from "../lib/queryKeys";
import {
  updateAuthorInAllInfiniteCaches,
  updatePostInAllInfiniteCaches,
  removePostFromAllInfiniteCaches,
} from "../lib/queryCache";
import { updatePost, deletePost } from "../services/post.service";
import { useLikePost } from "../hooks/useLikePost";

interface PostCardProps {
  post: Post;
  isOwner?: boolean;
  onEdit?: (postId: string, newContent: string) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
  onFollowToggle?: (authorId: string, isFollowing: boolean) => void;
}

const PostCard = ({ post, isOwner, onEdit, onDelete, onFollowToggle }: PostCardProps) => {
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

  const authorId = typeof post.author === "string"
    ? post.author
    : post.author?._id || (post.author as any)?.id;

  const isPostOwner = typeof isOwner === "boolean"
    ? isOwner
    : Boolean(currentUserId && authorId && currentUserId.toString() === authorId.toString());

  const queryClient = useQueryClient();
  const likeMutation = useLikePost();

  const handleToggleLike = () => {
    if (likeMutation.isPending) return;
    likeMutation.mutate({
      postId: post._id,
      isLiked: liked,
    });
  };

  const followMutation = useMutation({
    mutationFn: toggleFollowUser,
    onMutate: async (authorId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.feed });

      // Save all matching caches for rollback
      const previousPostQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
        queryKey: queryKeys.posts.all,
      });
      const previousFeedQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
        queryKey: queryKeys.feed,
      });
      const previousQueries = [...previousPostQueries, ...previousFeedQueries];

      // Optimistically update follow status for all posts of this author across all infinite caches
      updateAuthorInAllInfiniteCaches(queryClient, authorId, (author) => ({
        ...author,
        isFollowing: !author.isFollowing,
      }));

      // Optimistically update local follow state
      setIsFollowing((prev) => !prev);

      return { previousQueries };
    },
    onError: (err: any, _authorId, context) => {
      // Rollback all caches to their snapshots
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, oldData]) => {
          queryClient.setQueryData(queryKey, oldData);
        });
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
        queryKey: queryKeys.feed,
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
    const trimmed = editContent.trim();
    if (!trimmed) return;
    try {
      setLoading(true);
      setError(null);
      if (onEdit) {
        await onEdit(post._id, trimmed);
      } else {
        await updatePost(post._id, trimmed);
        updatePostInAllInfiniteCaches(queryClient, post._id, (old) => ({
          ...old,
          content: trimmed,
        }));
      }
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update post");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      if (onDelete) {
        await onDelete(post._id);
      } else {
        await deletePost(post._id);
        removePostFromAllInfiniteCaches(queryClient, post._id);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete post");
      setLoading(false);
      setIsDeletingConfirm(false);
    }
  };

  const authorInitial = (post.author?.name || post.author?.username || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <article className="post-card">
      <div className="post-header">
        <div className="post-author-info">
          <Link
            to={`/profile/${post.author?._id}`}
            className="post-author-link"
            style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px", textDecoration: "none" }}
          >
            <div className="post-author-avatar">
              {post.author?.profilePicUrl ? (
                <img
                  src={post.author.profilePicUrl}
                  alt={post.author.name || post.author.username || "avatar"}
                />
              ) : (
                authorInitial
              )}
            </div>
            <h3 className="post-author-name" style={{ margin: 0, lineHeight: 1 }}>
              {post.author?.name || post.author?.username || "Unknown"}
            </h3>
          </Link>

          {!isPostOwner && post.author?._id && currentUserId !== post.author._id && !isFollowing && (
            <button
              onClick={handleToggleFollow}
              disabled={followMutation.isPending}
              className="post-follow-btn follow-action-unfollowed"
            >
              {followMutation.isPending ? "..." : "follow"}
            </button>
          )}
        </div>

        {isPostOwner && (
          <div className="post-action-link-group">
            {isDeletingConfirm ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 500, fontFamily: "var(--font-mono)" }}>delete?</span>
                <button
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="post-btn-text post-btn-text-confirm"
                >
                  {loading ? "..." : "yes"}
                </button>
                <button
                  onClick={() => setIsDeletingConfirm(false)}
                  disabled={loading}
                  className="post-btn-text post-btn-text-cancel"
                >
                  no
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    if (isEditing) {
                      setEditContent(post.content);
                      setIsEditing(false);
                    } else {
                      setIsEditing(true);
                    }
                  }}
                  className="post-btn-text post-btn-text-edit"
                  title={isEditing ? "Cancel edit" : "Edit post"}
                  aria-label={isEditing ? "Cancel edit" : "Edit post"}
                >
                  {isEditing ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  ) : (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 1 1 3.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => setIsDeletingConfirm(true)}
                  disabled={loading}
                  className="post-btn-text post-btn-text-delete"
                  title="Delete post"
                  aria-label="Delete post"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
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
            className="post-edit-textarea"
          />
          {error && <p style={{ color: "#ef4444", fontSize: "12px", fontFamily: "var(--font-mono)" }}>{error}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
            <button
              onClick={handleSaveEdit}
              disabled={loading || !editContent.trim()}
              className="btn"
              style={{ width: "auto", minWidth: "80px", padding: "6px 14px", borderRadius: "10px", fontSize: "12px" }}
            >
              {loading ? "saving..." : "save"}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="post-content">
            {post.content}
          </p>
          {post.imageUrl && (
            <div className="post-image-container">
              <img
                src={post.imageUrl}
                alt="Post attachment"
                className="post-image"
              />
            </div>
          )}
        </>
      )}

      {error && !isEditing && (
        <p style={{ color: "#ef4444", fontSize: "12px", margin: "4px 0", fontFamily: "var(--font-mono)" }}>{error}</p>
      )}

      <div className="post-footer">
        <small className="post-date">
          {new Date(post.createdAt).toLocaleString()}
        </small>

        <div className="post-actions">
          <button
            onClick={handleToggleLike}
            disabled={likeMutation.isPending}
            className={`post-action-btn ${liked ? "liked" : ""}`}
          >
            <span>{liked ? "❤️" : "♡"}</span>
            <span className="post-action-text" style={{ marginLeft: "4px", marginRight: "2px" }}>like</span>
            <span>({likeCount})</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className={`post-action-btn ${showComments ? "comments-active" : ""}`}
          >
            <span>💬</span>
            <span className="post-action-text" style={{ marginLeft: "4px", marginRight: "2px" }}>comments</span>
            <span>({commentCount})</span>
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
