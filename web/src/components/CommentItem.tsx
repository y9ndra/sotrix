import { useState } from "react";
import { Link } from "react-router-dom";
import type { Comment } from "../types/comment";
import { useAuthStore } from "../store/authStore";
import { convertEmojiShortcodes } from "../utils/emoji";

interface CommentItemProps {
  comment: Comment;
  onUpdateComment: (commentId: string, newContent: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

const CommentItem = ({ comment, onUpdateComment, onDeleteComment }: CommentItemProps) => {
  const currentUser = useAuthStore((state) => state.user);
  const currentUserId = currentUser?._id || currentUser?.id || null;

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isDeletingConfirm, setIsDeletingConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = Boolean(currentUserId && comment.author?._id === currentUserId);

  const handleSave = async () => {
    if (!editContent.trim()) return;
    try {
      setLoading(true);
      setError(null);
      await onUpdateComment(comment._id, editContent.trim());
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to update comment");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      setError(null);
      await onDeleteComment(comment._id);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete comment");
      setLoading(false);
      setIsDeletingConfirm(false);
    }
  };

  const authorInitial = (comment.author?.name || comment.author?.username || "U")
    .charAt(0)
    .toUpperCase();

  return (
    <div className="comment-item">
      <div className="comment-item-header">
        <div className="comment-author-wrap">
          <Link to={`/profile/${comment.author?._id}`} className="comment-author-avatar">
            {comment.author?.profilePicUrl ? (
              <img src={comment.author.profilePicUrl} alt={comment.author.username} />
            ) : (
              authorInitial
            )}
          </Link>
          <Link to={`/profile/${comment.author?._id}`} className="comment-author-name">
            {comment.author?.name || comment.author?.username || "anonymous"}
          </Link>
        </div>

        {isOwner && (
          <div className="comment-actions">
            {isDeletingConfirm ? (
              <div className="comment-confirm-box">
                <span className="comment-confirm-text">delete?</span>
                <button
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="comment-btn-confirm"
                >
                  {loading ? "..." : "yes"}
                </button>
                <button
                  onClick={() => setIsDeletingConfirm(false)}
                  disabled={loading}
                  className="comment-btn-cancel"
                >
                  no
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    if (isEditing) {
                      setEditContent(comment.content);
                      setIsEditing(false);
                    } else {
                      setIsEditing(true);
                    }
                  }}
                  className="comment-action-btn comment-action-edit"
                  title={isEditing ? "Cancel edit" : "Edit comment"}
                  aria-label={isEditing ? "Cancel edit" : "Edit comment"}
                >
                  {isEditing ? (
                    <svg
                      width="13"
                      height="13"
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
                      width="13"
                      height="13"
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
                  className="comment-action-btn comment-action-delete"
                  title="Delete comment"
                  aria-label="Delete comment"
                >
                  <svg
                    width="13"
                    height="13"
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
        <div className="comment-edit-box">
          <input
            type="text"
            value={editContent}
            onChange={(e) => setEditContent(convertEmojiShortcodes(e.target.value))}
            disabled={loading}
            className="comment-edit-input"
          />
          {error && <p className="comments-error">{error}</p>}
          <div className="comment-edit-actions">
            <button
              onClick={() => setIsEditing(false)}
              disabled={loading}
              className="comment-action-btn comment-action-edit"
            >
              cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading || !editContent.trim()}
              className="comment-save-btn"
            >
              {loading ? "saving..." : "save"}
            </button>
          </div>
        </div>
      ) : (
        <p className="comment-content">
          {comment.content}
        </p>
      )}

      {error && !isEditing && (
        <p className="comments-error">{error}</p>
      )}

      <div className="comment-item-footer">
        <small className="comment-time">
          {new Date(comment.createdAt).toLocaleString()}
        </small>
      </div>
    </div>
  );
};

export default CommentItem;
