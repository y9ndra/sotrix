import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { InfiniteData } from "@tanstack/react-query";
import type { Post, PostsResponse } from "../types/post";
import CommentList from "./CommentList";
import { useAuthStore } from "../store/authStore";
import { toggleLike } from "../services/like.service";
import { toggleFollowUser } from "../services/follow.service";
import { queryKeys } from "../lib/queryKeys";
import {
  updatePostInAllInfiniteCaches,
  updateAuthorInAllInfiniteCaches,
} from "../lib/queryCache";

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

      // Save all matching caches for rollback
      const previousQueries = queryClient.getQueriesData<InfiniteData<PostsResponse>>({
        queryKey: queryKeys.posts.all,
      });

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
    <article className="post-card">
      <div className="post-header">
        <div className="post-author-info">
          <Link to={`/profile/${post.author?._id}`} className="post-author-link">
            <h3 className="post-author-name">
              {post.author?.name || post.author?.username || "Unknown"}
            </h3>
            <p className="post-author-username">
              @{post.author?.username || "unknown"}
            </p>
          </Link>

          {!isOwner && post.author?._id && currentUserId !== post.author._id && !isFollowing && (
            <button
              onClick={handleToggleFollow}
              disabled={followMutation.isPending}
              className="post-follow-btn follow-action-unfollowed"
            >
              {followMutation.isPending ? "..." : "follow"}
            </button>
          )}
        </div>

        {isOwner && (
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
                  onClick={() => setIsEditing(!isEditing)}
                  className="post-btn-text post-btn-text-edit"
                >
                  {isEditing ? "cancel" : "edit"}
                </button>
                <button
                  onClick={() => setIsDeletingConfirm(true)}
                  disabled={loading}
                  className="post-btn-text post-btn-text-delete"
                >
                  delete
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
            <span>like ({likeCount})</span>
          </button>

          <button
            onClick={() => setShowComments(!showComments)}
            className={`post-action-btn ${showComments ? "comments-active" : ""}`}
          >
            💬 comments ({commentCount})
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
