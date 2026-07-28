import { useState } from "react";
import type { Post } from "../types/post";

interface PostCardProps {
  post: Post;
  isOwner?: boolean;
  onEdit?: (postId: string, newContent: string) => Promise<void>;
  onDelete?: (postId: string) => Promise<void>;
}

const PostCard = ({ post, isOwner = false, onEdit, onDelete }: PostCardProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      setLoading(true);
      setError(null);
      await onDelete(post._id);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to delete post");
      setLoading(false);
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
        <div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#111827" }}>
            {post.author?.name || post.author?.username || "Unknown"}
          </h3>
          <p style={{ margin: "2px 0 0 0", fontSize: "13px", color: "#6b7280" }}>
            @{post.author?.username || "unknown"}
          </p>
        </div>

        {isOwner && (
          <div style={{ display: "flex", gap: "8px" }}>
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
              onClick={handleDelete}
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
        <p style={{ margin: "8px 0", fontSize: "14px", color: "#374151" }}>
          {post.content}
        </p>
      )}

      {error && !isEditing && (
        <p style={{ color: "#dc2626", fontSize: "12px", margin: "4px 0" }}>{error}</p>
      )}

      <small style={{ color: "#9ca3af", fontSize: "12px" }}>
        {new Date(post.createdAt).toLocaleString()}
      </small>
    </article>
  );
};

export default PostCard;
