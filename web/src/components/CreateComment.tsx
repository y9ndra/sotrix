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
    <form onSubmit={handleSubmit} className="comment-create-form">
      {error && <p className="comments-error">{error}</p>}
      <div className="comment-input-row">
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="write a comment..."
          disabled={loading}
          className="comment-input"
        />
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="comment-submit-btn"
        >
          {loading ? "posting..." : "comment"}
        </button>
      </div>
    </form>
  );
};

export default CreateComment;
