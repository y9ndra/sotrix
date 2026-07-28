import { useState } from "react";
import type { Comment } from "../types/comment";

interface CommentItemProps {
  comment: Comment;
  currentUserId: string | null;
  onUpdateComment: (commentId: string, newContent: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
}

const CommentItem = ({ comment, currentUserId, onUpdateComment, onDeleteComment }: CommentItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
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

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      setLoading(true);
      setError(null);
      await onDeleteComment(comment._id);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete comment");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: "8px",
        backgroundColor: "#f9fafb",
        border: "1px solid #f3f4f6",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 600, fontSize: "13px", color: "#111827" }}>
          {comment.author?.name || comment.author?.username || "Anonymous"}
          <span style={{ fontWeight: 400, color: "#6b7280", marginLeft: "4px" }}>
            @{comment.author?.username}
          </span>
        </span>
        {isOwner && (
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                fontSize: "11px",
                padding: "2px 6px",
                border: "none",
                background: "none",
                color: "#4f46e5",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              {isEditing ? "Cancel" : "Edit"}
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              style={{
                fontSize: "11px",
                padding: "2px 6px",
                border: "none",
                background: "none",
                color: "#dc2626",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <div style={{ marginTop: "6px" }}>
          <input
            type="text"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            style={{
              width: "100%",
              padding: "6px",
              borderRadius: "4px",
              border: "1px solid #d1d5db",
              fontSize: "13px",
              boxSizing: "border-box",
            }}
          />
          {error && <p style={{ color: "#dc2626", fontSize: "11px", margin: "2px 0" }}>{error}</p>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginTop: "4px" }}>
            <button
              onClick={handleSave}
              disabled={loading || !editContent.trim()}
              style={{
                padding: "3px 8px",
                fontSize: "12px",
                backgroundColor: "#4f46e5",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      ) : (
        <p style={{ margin: "4px 0", fontSize: "13px", color: "#374151" }}>
          {comment.content}
        </p>
      )}

      <small style={{ color: "#9ca3af", fontSize: "11px" }}>
        {new Date(comment.createdAt).toLocaleString()}
      </small>
    </div>
  );
};

export default CommentItem;
