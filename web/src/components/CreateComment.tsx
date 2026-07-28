import React, { useState } from "react";

interface CreateCommentProps {
  onAddComment: (content: string) => Promise<void>;
}

const CreateComment = ({ onAddComment }: CreateCommentProps) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading) return;

    try {
      setLoading(true);
      setError(null);
      await onAddComment(content.trim());
      setContent("");
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to post comment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
      {error && <p style={{ color: "#dc2626", fontSize: "12px", margin: 0 }}>{error}</p>}
      <div style={{ display: "flex", gap: "8px" }}>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          disabled={loading}
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            fontSize: "13px",
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          style={{
            padding: "8px 14px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#4f46e5",
            color: "#ffffff",
            fontWeight: 600,
            fontSize: "13px",
            cursor: loading || !content.trim() ? "not-allowed" : "pointer",
            opacity: loading || !content.trim() ? 0.6 : 1,
          }}
        >
          {loading ? "Posting..." : "Comment"}
        </button>
      </div>
    </form>
  );
};

export default CreateComment;
